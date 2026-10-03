# Shared by the installer and `update`. Sourced from the checkout of the release being installed,
# so each release brings the logic that knows how to install it.
#
# Everything here runs as root on a Debian 13 host, under `set -Eeuo pipefail`.

# shellcheck shell=bash
# The constants are read by the scripts that source this file, and the configuration and versions
# arrive by sourcing splitrip.env and versions.env.
# shellcheck disable=SC2034,SC2153

SPLITRIP_ROOT=${SPLITRIP_ROOT:-/opt/splitrip}
SPLITRIP_REPO=${SPLITRIP_REPO:-https://github.com/ajmasia/splitrip.git}
SPLITRIP_CONFIG=$SPLITRIP_ROOT/splitrip.env
SPLITRIP_STATE=$SPLITRIP_ROOT/state

# The minimum Auth enforces, configured below; the installer refuses anything shorter.
PASSWORD_MIN_LENGTH=6

# The ports, all on this host. Only the application, the API and Studio are reachable from outside;
# see nftables/splitrip.nft.
APP_PORT=3000
API_PORT=8000
STUDIO_PORT=8001
AUTH_PORT=9999
REST_PORT=3001
REST_ADMIN_PORT=3011
REALTIME_PORT=4000
META_PORT=8080
STUDIO_INTERNAL_PORT=3002
PG_PORT=5432

SERVICES=(splitrip-auth splitrip-rest splitrip-realtime splitrip-meta splitrip-studio splitrip-app)

# Output and steps ---------------------------------------------------------------------------------

CURRENT_STEP=''

say() { printf '%s\n' "$*"; }
warn() { printf '%s\n' "$*" >&2; }
fail() {
  warn ""
  warn "✗ Step failed: ${CURRENT_STEP:-before the first step}."
  warn "  $*"
  exit 1
}

# Runs one named step. When anything in it fails, the ERR trap names the step and stops.
step() {
  CURRENT_STEP=$1
  shift
  say "→ $CURRENT_STEP"
  "$@"
}

on_error() {
  local status=$?
  warn ''
  warn "✗ Step failed: ${CURRENT_STEP:-before the first step} (exit $status)."
  warn '  Nothing after it has been done. Fix the cause and run the same command again.'
  exit "$status"
}

enable_error_trap() {
  set -Eeuo pipefail
  trap on_error ERR
}

# Releases -----------------------------------------------------------------------------------------

# Releases are the repository's version tags: plain semver, no leading "v", and release candidates
# such as 0.13.0-rc.2 that come before the release of the same number.
release_tags() {
  git ls-remote --tags --refs "$SPLITRIP_REPO" |
    sed 's#.*refs/tags/##' |
    grep -E '^[0-9]+\.[0-9]+\.[0-9]+(-rc\.[0-9]+)?$'
}

# Oldest first. A candidate sorts before its release: "~" sorts before anything in a version.
sort_releases() {
  sed 's/-rc\./~rc./' | sort -V | sed 's/~rc\./-rc./'
}

# The newest release. Candidates count only for an instance already on one, so an instance on a
# release never moves to a candidate by itself.
#   $1 the release installed, if any
latest_release() {
  local installed=${1:-}
  if [[ $installed == *-rc.* ]]; then
    release_tags
  else
    release_tags | grep -v -- '-rc\.'
  fi | sort_releases | tail -n 1
}

release_exists() {
  git ls-remote --exit-code --tags --refs "$SPLITRIP_REPO" "refs/tags/$1" >/dev/null
}

# True when $1 is an older release than $2.
release_older() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort_releases | head -n 1)" = "$1" ]
}

state_get() {
  [ -f "$SPLITRIP_STATE" ] || return 0
  sed -n "s/^$1=//p" "$SPLITRIP_STATE" | tail -n 1
}

state_set() {
  touch "$SPLITRIP_STATE"
  chmod 600 "$SPLITRIP_STATE"
  if grep -q "^$1=" "$SPLITRIP_STATE"; then
    sed -i "s/^$1=.*/$1=$2/" "$SPLITRIP_STATE"
  else
    printf '%s=%s\n' "$1" "$2" >>"$SPLITRIP_STATE"
  fi
}

# System packages ----------------------------------------------------------------------------------

# What a release needs from Debian. The installer installs it and `update` installs it again before
# preparing a release, so a release that comes to need a new package brings it to every instance it
# is installed on; apt leaves alone whatever is already there.
#   wal2json: Realtime reads the published changes through it; Supabase's image bundles it.
SYSTEM_PACKAGES=(
  ca-certificates curl git xz-utils openssl locales libncurses6 libstdc++6
  postgresql-17 postgresql-17-wal2json nginx nftables
)

install_system_packages() {
  DEBIAN_FRONTEND=noninteractive apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${SYSTEM_PACKAGES[@]}" >/dev/null
  # Realtime's runtime expects this locale.
  sed -i '/^# *en_US.UTF-8 UTF-8/s/^# *//' /etc/locale.gen
  locale-gen >/dev/null
}

# Users --------------------------------------------------------------------------------------------

create_service_users() {
  local user
  for user in "${SERVICES[@]}"; do
    id -u "$user" >/dev/null 2>&1 && continue
    useradd --system --home-dir "/var/lib/$user" --create-home --shell /usr/sbin/nologin "$user"
  done
}

# Components ---------------------------------------------------------------------------------------

component_dir() { printf '%s/components/%s/%s' "$SPLITRIP_ROOT" "$1" "$2"; }
component_current() {
  local link=$SPLITRIP_ROOT/components/$1/current
  [ -L "$link" ] && basename "$(readlink "$link")"
  return 0
}

download_verified() {
  local url=$1 sha=$2 dest=$3
  curl -fsSL --retry 3 -o "$dest" "$url"
  printf '%s  %s\n' "$sha" "$dest" | sha256sum --check --quiet - ||
    fail "Checksum mismatch for $url; refusing to install it."
}

# Installs one component version into its own directory, unless it is already there. Work happens
# in a scratch directory moved into place at the end, so an interrupted run leaves nothing half-done
# behind under the version's name.
#   $1 name, $2 version, $3 function that fills the directory given as its argument
install_component() {
  local name=$1 version=$2 fill=$3 dir scratch
  dir=$(component_dir "$name" "$version")
  [ -d "$dir" ] && return 0
  mkdir -p "$(dirname "$dir")"
  rm -rf "$(dirname "$dir")"/.partial.*
  scratch=$(mktemp -d "$(dirname "$dir")/.partial.XXXXXX")
  "$fill" "$scratch"
  chmod 755 "$scratch"
  mv -T "$scratch" "$dir"
}

switch_component() {
  local name=$1 version=$2 link
  link=$SPLITRIP_ROOT/components/$name/current
  ln -sfn "$version" "$link.next"
  mv -T "$link.next" "$link"
}

fill_node() {
  download_verified "$NODE_URL" "$NODE_SHA256" "$1/node.tar.xz"
  tar -xJf "$1/node.tar.xz" -C "$1" --strip-components=1
  rm "$1/node.tar.xz"
}

fill_crane() {
  download_verified "$CRANE_URL" "$CRANE_SHA256" "$1/crane.tar.gz"
  tar -xzf "$1/crane.tar.gz" -C "$1" crane
  rm "$1/crane.tar.gz"
}

fill_supabase_cli() {
  download_verified "$SUPABASE_CLI_URL" "$SUPABASE_CLI_SHA256" "$1/cli.tar.gz"
  tar -xzf "$1/cli.tar.gz" -C "$1" supabase
  rm "$1/cli.tar.gz"
}

fill_auth() {
  download_verified "$AUTH_URL" "$AUTH_SHA256" "$1/auth.tar.gz"
  tar -xzf "$1/auth.tar.gz" -C "$1"
  rm "$1/auth.tar.gz"
}

fill_postgrest() {
  download_verified "$POSTGREST_URL" "$POSTGREST_SHA256" "$1/postgrest.tar.xz"
  tar -xJf "$1/postgrest.tar.xz" -C "$1"
  rm "$1/postgrest.tar.xz"
}

# Unpacks the given paths of an image's filesystem, read by digest, without a container runtime.
#   $1 image@digest, $2 destination, $3... paths inside the image
export_image_paths() {
  local image=$1 dest=$2
  shift 2
  "$(component_dir crane "$CRANE_VERSION")/crane" export --platform linux/amd64 "$image" - |
    tar -x -C "$dest" "$@"
}

fill_realtime() {
  local unpacked
  unpacked=$(mktemp -d)
  export_image_paths "$REALTIME_IMAGE" "$unpacked" \
    app usr/local/share/pgdelta usr/local/bin/pgdelta build
  # The Elixir release, with its own Erlang runtime, is relocatable: it finds itself from its scripts.
  cp -a "$unpacked/app/." "$1/"
  # pgdelta, a helper the image installs beside the release, expects to unpack itself under /app;
  # its wrapper is rewritten to use this component and the service's state directory instead.
  mkdir -p "$1/pgdelta/bin"
  cp -a "$unpacked/usr/local/share/pgdelta/pgdelta.xz" "$1/pgdelta/"
  cat >"$1/pgdelta/bin/pgdelta" <<'WRAPPER'
#!/bin/sh
set -e
BIN=/var/lib/splitrip-realtime/pgdelta-cache/pgdelta
if [ ! -x "$BIN" ]; then
  mkdir -p "$(dirname "$BIN")"
  xz -dcT0 /opt/splitrip/components/realtime/current/pgdelta/pgdelta.xz > "$BIN"
  chmod +x "$BIN"
fi
exec "$BIN" "$@"
WRAPPER
  chmod 755 "$1/pgdelta/bin/pgdelta"
  # pgdelta looks for its parser at the absolute path it was built in; /build is linked to the
  # current version's copy when the component is switched to.
  cp -a "$unpacked/build" "$1/build"
  rm -rf "$unpacked"
}

fill_meta() {
  local unpacked
  unpacked=$(mktemp -d)
  export_image_paths "$META_IMAGE" "$unpacked" usr/src/app
  cp -a "$unpacked/usr/src/app/." "$1/"
  rm -rf "$unpacked"
}

fill_studio() {
  local unpacked
  unpacked=$(mktemp -d)
  export_image_paths "$STUDIO_IMAGE" "$unpacked" app
  cp -a "$unpacked/app/." "$1/"
  rm -rf "$unpacked"
}

# Every component named in versions.env, installed beside whatever is already there.
install_components() {
  install_component node "$NODE_VERSION" fill_node
  install_component crane "$CRANE_VERSION" fill_crane
  install_component supabase-cli "$SUPABASE_CLI_VERSION" fill_supabase_cli
  install_component auth "$AUTH_VERSION" fill_auth
  install_component postgrest "$POSTGREST_VERSION" fill_postgrest
  install_component realtime "$REALTIME_VERSION" fill_realtime
  install_component meta "$META_VERSION" fill_meta
  install_component studio "$STUDIO_VERSION" fill_studio
}

# Points every component at the version in versions.env. Versions already current are left alone;
# the services are restarted by whoever switched them.
switch_components() {
  switch_component node "$NODE_VERSION"
  switch_component crane "$CRANE_VERSION"
  switch_component supabase-cli "$SUPABASE_CLI_VERSION"
  switch_component auth "$AUTH_VERSION"
  switch_component postgrest "$POSTGREST_VERSION"
  switch_component realtime "$REALTIME_VERSION"
  switch_component meta "$META_VERSION"
  switch_component studio "$STUDIO_VERSION"
  ln -sfn "$SPLITRIP_ROOT/components/realtime/current/build" /build
  # Studio writes its own cache beside its build.
  chown -R splitrip-studio: "$(component_dir studio "$STUDIO_VERSION")"
}

# Secrets and configuration ------------------------------------------------------------------------

random_hex() { openssl rand -hex "$1"; }

base64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

# An API key: a JWT for the given role, signed with the instance's secret, valid for ten years.
api_key() {
  local role=$1 secret=$2 now header payload signature
  now=$(date +%s)
  header=$(printf '{"alg":"HS256","typ":"JWT"}' | base64url)
  payload=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' \
    "$role" "$now" "$((now + 10 * 365 * 24 * 3600))" | base64url)
  signature=$(printf '%s.%s' "$header" "$payload" |
    openssl dgst -sha256 -hmac "$secret" -binary | base64url)
  printf '%s.%s.%s' "$header" "$payload" "$signature"
}

# Writes the configuration file. Secrets are generated the first time and kept on every later run,
# including an install run again after an interruption; the settings are rewritten from the answers.
#   $1 application domain, $2 API domain
write_config() {
  local app_domain=$1 api_domain=$2 jwt_secret
  mkdir -p "$SPLITRIP_ROOT"
  if [ ! -f "$SPLITRIP_CONFIG" ]; then
    jwt_secret=$(random_hex 32)
    (
      umask 077
      cat >"$SPLITRIP_CONFIG" <<EOF
# Every secret and setting of this instance. Generated at install time and never changed by
# \`update\`. Readable by root only; covered by the container's backups.

# Secrets
JWT_SECRET=$jwt_secret
ANON_KEY=$(api_key anon "$jwt_secret")
SERVICE_ROLE_KEY=$(api_key service_role "$jwt_secret")
PG_POSTGRES_PASSWORD=$(random_hex 24)
PG_ADMIN_PASSWORD=$(random_hex 24)
PG_AUTHENTICATOR_PASSWORD=$(random_hex 24)
PG_AUTH_ADMIN_PASSWORD=$(random_hex 24)
REALTIME_SECRET_KEY_BASE=$(random_hex 48)
REALTIME_DB_ENC_KEY=$(random_hex 8)
PG_META_CRYPTO_KEY=$(random_hex 16)
STUDIO_USERNAME=supabase
STUDIO_PASSWORD=$(random_hex 12)

# Settings
APP_DOMAIN=
API_DOMAIN=
EOF
    )
  fi
  chmod 600 "$SPLITRIP_CONFIG"
  sed -i "s/^APP_DOMAIN=.*/APP_DOMAIN=$app_domain/; s/^API_DOMAIN=.*/API_DOMAIN=$api_domain/" \
    "$SPLITRIP_CONFIG"
}

load_config() {
  [ -f "$SPLITRIP_CONFIG" ] || fail "No configuration at $SPLITRIP_CONFIG."
  set -a
  # shellcheck source=/dev/null
  . "$SPLITRIP_CONFIG"
  set +a
}

# One root-only environment file per service, with only what that service needs, rendered from the
# configuration file. systemd reads them as root before dropping to the service's user.
render_service_envs() {
  local env_dir=$SPLITRIP_ROOT/env
  local db=127.0.0.1:$PG_PORT/postgres
  mkdir -p "$env_dir"
  chmod 700 "$env_dir"
  (
    umask 077

    cat >"$env_dir/auth.env" <<EOF
GOTRUE_API_HOST=127.0.0.1
GOTRUE_API_PORT=$AUTH_PORT
API_EXTERNAL_URL=https://$API_DOMAIN
GOTRUE_DB_DRIVER=postgres
GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:$PG_AUTH_ADMIN_PASSWORD@$db
GOTRUE_DB_MIGRATIONS_PATH=$SPLITRIP_ROOT/components/auth/current/migrations
GOTRUE_SITE_URL=https://$APP_DOMAIN
GOTRUE_URI_ALLOW_LIST=https://$APP_DOMAIN/**
GOTRUE_DISABLE_SIGNUP=false
GOTRUE_JWT_ADMIN_ROLES=service_role
GOTRUE_JWT_AUD=authenticated
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
GOTRUE_JWT_EXP=3600
GOTRUE_JWT_SECRET=$JWT_SECRET
GOTRUE_JWT_ISSUER=https://$API_DOMAIN/auth/v1
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_EXTERNAL_PHONE_ENABLED=false
GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=true
GOTRUE_PASSWORD_MIN_LENGTH=$PASSWORD_MIN_LENGTH
GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For
GOTRUE_RATE_LIMIT_ANONYMOUS_USERS=30
EOF

    cat >"$env_dir/rest.env" <<EOF
PGRST_DB_URI=postgres://authenticator:$PG_AUTHENTICATOR_PASSWORD@$db
PGRST_DB_SCHEMAS=public
PGRST_DB_EXTRA_SEARCH_PATH=public,extensions
PGRST_DB_ANON_ROLE=anon
PGRST_DB_MAX_ROWS=1000
PGRST_DB_USE_LEGACY_GUCS=false
PGRST_JWT_SECRET=$JWT_SECRET
PGRST_APP_SETTINGS_JWT_EXP=3600
PGRST_SERVER_HOST=127.0.0.1
PGRST_SERVER_PORT=$REST_PORT
PGRST_ADMIN_SERVER_HOST=127.0.0.1
PGRST_ADMIN_SERVER_PORT=$REST_ADMIN_PORT
EOF

    cat >"$env_dir/realtime.env" <<EOF
PORT=$REALTIME_PORT
DB_HOST=127.0.0.1
DB_PORT=$PG_PORT
DB_USER=supabase_admin
DB_PASSWORD=$PG_ADMIN_PASSWORD
DB_NAME=postgres
DB_IP_VERSION=ipv4
DB_AFTER_CONNECT_QUERY=SET search_path TO _realtime
DB_ENC_KEY=$REALTIME_DB_ENC_KEY
API_JWT_SECRET=$JWT_SECRET
METRICS_JWT_SECRET=$JWT_SECRET
SECRET_KEY_BASE=$REALTIME_SECRET_KEY_BASE
APP_NAME=realtime
SEED_SELF_HOST=true
RUN_JANITOR=true
DISABLE_HEALTHCHECK_LOGGING=true
DNS_NODES="''"
REALTIME_IP_VERSION=ipv4
GEN_RPC_SOCKET_IP=127.0.0.1
ERL_EPMD_ADDRESS=127.0.0.1
ERL_AFLAGS=-proto_dist inet_tcp
ECTO_IPV6=false
MIX_ENV=prod
SLOT_NAME_SUFFIX=
LANG=en_US.UTF-8
LANGUAGE=en_US:en
LC_ALL=en_US.UTF-8
HOME=/var/lib/splitrip-realtime
RELEASE_TMP=/var/lib/splitrip-realtime
ERL_CRASH_DUMP=/var/lib/splitrip-realtime/erl_crash.dump
PATH=$SPLITRIP_ROOT/components/realtime/current/pgdelta/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
EOF

    cat >"$env_dir/meta.env" <<EOF
PG_META_HOST=127.0.0.1
PG_META_PORT=$META_PORT
PG_META_DB_HOST=127.0.0.1
PG_META_DB_PORT=$PG_PORT
PG_META_DB_NAME=postgres
PG_META_DB_USER=postgres
PG_META_DB_PASSWORD=$PG_POSTGRES_PASSWORD
CRYPTO_KEY=$PG_META_CRYPTO_KEY
NODE_ENV=production
EOF

    cat >"$env_dir/studio.env" <<EOF
HOSTNAME=127.0.0.1
PORT=$STUDIO_INTERNAL_PORT
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
STUDIO_PG_META_URL=http://127.0.0.1:$META_PORT
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=$PG_PORT
POSTGRES_DB=postgres
POSTGRES_PASSWORD=$PG_POSTGRES_PASSWORD
POSTGRES_USER_READ_WRITE=postgres
PG_META_CRYPTO_KEY=$PG_META_CRYPTO_KEY
PGRST_DB_SCHEMAS=public
PGRST_DB_MAX_ROWS=1000
PGRST_DB_EXTRA_SEARCH_PATH=public,extensions
DEFAULT_ORGANIZATION_NAME=Splitrip
DEFAULT_PROJECT_NAME=$APP_DOMAIN
SUPABASE_URL=http://127.0.0.1:$API_PORT
SUPABASE_PUBLIC_URL=https://$API_DOMAIN
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_KEY=$SERVICE_ROLE_KEY
AUTH_JWT_SECRET=$JWT_SECRET
ENABLED_FEATURES_LOGS_ALL=false
SNIPPETS_MANAGEMENT_FOLDER=/var/lib/splitrip-studio/snippets
EOF

    cat >"$env_dir/app.env" <<EOF
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
HOSTNAME=0.0.0.0
PORT=$APP_PORT
NEXT_PUBLIC_SUPABASE_URL=https://$API_DOMAIN
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
SUPABASE_INTERNAL_URL=http://127.0.0.1:$API_PORT
EOF
  )
}

# The gateway and Studio's credentials. The configuration carries the keys, so it is root's alone;
# the credentials are read by nginx's workers on every request, so they are shared with their group.
#   $1 the release's deploy directory
render_gateway() {
  local deploy=$1
  sed -e "s|@ANON_KEY@|$ANON_KEY|g" -e "s|@SERVICE_ROLE_KEY@|$SERVICE_ROLE_KEY|g" \
    "$deploy/nginx/splitrip.conf.template" >/etc/nginx/conf.d/splitrip.conf.next
  chmod 600 /etc/nginx/conf.d/splitrip.conf.next
  mv -T /etc/nginx/conf.d/splitrip.conf.next /etc/nginx/conf.d/splitrip.conf
  printf '%s:%s\n' "$STUDIO_USERNAME" "$(printf '%s' "$STUDIO_PASSWORD" | openssl passwd -apr1 -stdin)" \
    >/etc/nginx/splitrip-studio.htpasswd
  chown root:www-data /etc/nginx/splitrip-studio.htpasswd
  chmod 640 /etc/nginx/splitrip-studio.htpasswd
  nginx -t -q
}

#   $1 the release's deploy directory
install_units() {
  local deploy=$1
  install -m 644 "$deploy"/systemd/*.service /etc/systemd/system/
  install -d -m 755 "$SPLITRIP_ROOT/nftables"
  install -m 644 "$deploy/nftables/splitrip.nft" "$SPLITRIP_ROOT/nftables/splitrip.nft"
  systemctl daemon-reload
}

# Database -----------------------------------------------------------------------------------------

configure_postgres() {
  local conf=/etc/postgresql/17/main/conf.d/splitrip.conf
  cat >"$conf" <<EOF
# Splitrip: local connections only, and the logical decoding Realtime reads changes through.
listen_addresses = '127.0.0.1'
port = $PG_PORT
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
max_slot_wal_keep_size = 1024
EOF
  systemctl enable postgresql >/dev/null
  systemctl restart postgresql
  wait_for 'PostgreSQL' 60 runuser -u postgres -- pg_isready -q -h 127.0.0.1 -p "$PG_PORT"
}

#   $1 the release's deploy directory
bootstrap_database() {
  local deploy=$1
  runuser -u postgres -- env \
    PG_POSTGRES_PASSWORD="$PG_POSTGRES_PASSWORD" \
    PG_ADMIN_PASSWORD="$PG_ADMIN_PASSWORD" \
    PG_AUTHENTICATOR_PASSWORD="$PG_AUTHENTICATOR_PASSWORD" \
    PG_AUTH_ADMIN_PASSWORD="$PG_AUTH_ADMIN_PASSWORD" \
    psql -q -X -v ON_ERROR_STOP=1 -d postgres -f - <"$deploy/db/bootstrap.sql"
}

# Runs SQL as the database's owner of the application's tables, reading it from standard input.
psql_postgres() {
  runuser -u postgres -- psql -q -X -v ON_ERROR_STOP=1 -d postgres "$@"
}

# Applies the release's migrations that are not applied yet, and never the seed.
#   $1 the release's checkout
apply_migrations() {
  local release=$1
  "$(component_dir supabase-cli "$SUPABASE_CLI_VERSION")/supabase" db push \
    --workdir "$release" \
    --db-url "postgres://postgres:$PG_POSTGRES_PASSWORD@127.0.0.1:$PG_PORT/postgres" \
    --skip-vault \
    --yes
  # PostgREST learns about new tables and functions without dropping its connections.
  if systemctl is-active --quiet splitrip-rest; then systemctl reload splitrip-rest; fi
}

# Services -----------------------------------------------------------------------------------------

# Retries a command until it succeeds or the time runs out.
#   $1 what is being waited for, $2 seconds, $3... the command
wait_for() {
  local what=$1 seconds=$2
  shift 2
  local deadline=$((SECONDS + seconds))
  until "$@" >/dev/null 2>&1; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      warn "$what did not answer within ${seconds}s."
      return 1
    fi
    sleep 2
  done
}

http_ok() { curl -fsS -o /dev/null --max-time 5 "$@"; }

wait_for_auth() { wait_for 'Auth' 120 http_ok "http://127.0.0.1:$AUTH_PORT/health"; }
wait_for_rest() { wait_for 'PostgREST' 120 http_ok "http://127.0.0.1:$REST_ADMIN_PORT/ready"; }
wait_for_realtime() {
  wait_for 'Realtime' 180 http_ok -H "Authorization: Bearer $ANON_KEY" \
    "http://127.0.0.1:$REALTIME_PORT/api/tenants/realtime-dev/health"
}
wait_for_meta() { wait_for 'postgres-meta' 120 http_ok "http://127.0.0.1:$META_PORT/health"; }
wait_for_studio() {
  wait_for 'Studio' 180 http_ok "http://127.0.0.1:$STUDIO_INTERNAL_PORT/api/platform/profile"
}
wait_for_app() { wait_for 'The application' 120 http_ok "http://127.0.0.1:$APP_PORT/sign-in"; }

start_firewall() {
  cat >/etc/systemd/system/splitrip-firewall.service <<EOF
[Unit]
Description=Splitrip: keep the internal services local
After=nftables.service network-pre.target
Before=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/sbin/nft -f $SPLITRIP_ROOT/nftables/splitrip.nft
ExecStop=/usr/sbin/nft delete table inet splitrip

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable splitrip-firewall >/dev/null
  systemctl restart splitrip-firewall
}

# The first account -------------------------------------------------------------------------------

json_string() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  printf '"%s"' "$s"
}

# Creates the account already confirmed, unless it exists from an earlier, interrupted run, and lets
# it open trips; and, once the instance has operators, makes it the first.
#   $1 email, $2 password
create_first_account() {
  local email=$1 password=$2 response status
  response=$(mktemp)
  status=$(
    printf '{"email":%s,"password":%s,"email_confirm":true}' \
      "$(json_string "$email")" "$(json_string "$password")" |
      curl -sS -o "$response" -w '%{http_code}' -X POST \
        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
        -H "apikey: $SERVICE_ROLE_KEY" \
        -H 'Content-Type: application/json' \
        --data-binary @- "http://127.0.0.1:$AUTH_PORT/admin/users"
  )
  if [ "$status" != 200 ] && ! grep -q 'email_exists' "$response"; then
    warn "Auth answered $status: $(cat "$response")"
    rm -f "$response"
    return 1
  fi
  rm -f "$response"

  psql_postgres -v email="$email" <<'SQL'
insert into public.trip_creators (email, note)
values (lower(btrim(:'email')), 'The first account, created by the installer')
on conflict (email) do nothing;

select format(
  'insert into public.instance_operators (email, note) values (%L, %L) on conflict (email) do nothing',
  lower(btrim(:'email')), 'The first account, created by the installer')
where to_regclass('public.instance_operators') is not null
\gexec
SQL
}

# The application ----------------------------------------------------------------------------------

# Fetches a release into its own directory, unless it is already there complete.
#   $1 version
fetch_release() {
  local version=$1 dir=$SPLITRIP_ROOT/releases/$1
  [ -f "$dir/.fetched" ] && return 0
  rm -rf "$dir"
  mkdir -p "$SPLITRIP_ROOT/releases"
  git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$version" \
    "$SPLITRIP_REPO" "$dir"
  [ -f "$dir/deploy/lib.sh" ] ||
    fail "Release $version predates the self-hosted installer and cannot be installed with it."
  touch "$dir/.fetched"
}

# Builds a release's standalone server as the application's user, for this instance's domain. The
# API domain is inlined into the bundle, so a build for another domain is done again.
#   $1 the release's checkout
build_release() {
  local release=$1 node
  [ "$(cat "$release/.built" 2>/dev/null)" = "$API_DOMAIN" ] && return 0
  node=$(component_dir node "$NODE_VERSION")/bin
  chown -R splitrip-app: "$release"
  # Install scripts are skipped: the only ones are the git hooks and the Supabase CLI's binary, and
  # neither belongs on a server.
  runuser -u splitrip-app -- env -i \
    HOME=/var/lib/splitrip-app \
    PATH="$node:/usr/bin:/bin" \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SUPABASE_URL="https://$API_DOMAIN" \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY" \
    bash -c "cd '$release' && npm ci --ignore-scripts --no-audit --no-fund && npm run build"
  # The standalone server does not carry the static assets; it serves them once they sit beside it.
  cp -a "$release/public" "$release/.next/standalone/"
  cp -a "$release/.next/static" "$release/.next/standalone/.next/"
  chown -R splitrip-app: "$release/.next/standalone"
  printf '%s\n' "$API_DOMAIN" >"$release/.built"
}

#   $1 version
switch_release() {
  ln -sfn "releases/$1" "$SPLITRIP_ROOT/current.next"
  mv -T "$SPLITRIP_ROOT/current.next" "$SPLITRIP_ROOT/current"
}

# The command typed at the console. It follows the running release, so each release's own `update`
# is the one that runs.
install_update_command() {
  ln -sfn "$SPLITRIP_ROOT/current/deploy/update.sh" /usr/local/bin/update
}
