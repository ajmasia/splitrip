#!/usr/bin/env bash
# Installs a Splitrip instance on this Debian 13 host: Supabase's services, natively and each at its
# pinned version, the repository's migrations, the first account and the application, all started
# again when the host boots.
#
# Run as root, on a host with no instance installed:
#
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/ajmasia/splitrip/<release>/deploy/install.sh)"
#
# It asks for the application's domain, the API's domain and the first account. Each answer can be
# given ahead in the environment instead — SPLITRIP_APP_DOMAIN, SPLITRIP_API_DOMAIN,
# SPLITRIP_ADMIN_EMAIL, SPLITRIP_ADMIN_PASSWORD — and is checked the same way. SPLITRIP_VERSION picks
# a release; the latest is installed otherwise.
#
# If a step fails it is named, and running the installer again picks up from where it stopped.

set -Eeuo pipefail

# Whatever locale the session arrived with may not exist on a fresh host, and every tool would
# complain about it; this one always does.
export LANG=C.UTF-8 LC_ALL=C.UTF-8
unset LANGUAGE

SPLITRIP_ROOT=${SPLITRIP_ROOT:-/opt/splitrip}
SPLITRIP_REPO=${SPLITRIP_REPO:-https://github.com/ajmasia/splitrip.git}

# Until the release is fetched, this file is all there is.
early_fail() {
  printf '✗ %s\n' "$*" >&2
  exit 1
}

preflight() {
  [ "$(id -u)" = 0 ] || early_fail 'Run the installer as root.'
  # shellcheck source=/dev/null
  . /etc/os-release
  [ "${ID:-}" = debian ] && [ "${VERSION_ID:-}" = 13 ] ||
    early_fail "The installer supports Debian 13; this is ${PRETTY_NAME:-an unknown system}."
  [ "$(dpkg --print-architecture)" = amd64 ] ||
    early_fail 'The installer supports amd64 hosts only.'
  # Proxmox VE is Debian too; the instance belongs in a container on it, never on the host itself.
  if [ -d /etc/pve ] || command -v pveversion >/dev/null; then
    # The command in the message is meant literally.
    # shellcheck disable=SC2016
    early_fail 'This is a Proxmox VE host. Install Splitrip in a container instead: run
  deploy/proxmox/splitrip-lxc.sh here, or this installer inside an existing container with
  pct exec <id> -- bash -c "$(curl -fsSL <this installer'"'"'s address>)"'
  fi
  if grep -qs '^INSTALLED=yes$' "$SPLITRIP_ROOT/state"; then
    early_fail "Splitrip is already installed here. To bring it up to date, run: update"
  fi
}

fetch_installer_release() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git >/dev/null

  local version=${SPLITRIP_VERSION:-}
  if [ -z "$version" ]; then
    version=$(git ls-remote --tags --refs "$SPLITRIP_REPO" | sed 's#.*refs/tags/##' |
      grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n 1)
  fi
  [ -n "$version" ] || early_fail "No release found at $SPLITRIP_REPO."

  RELEASE=$SPLITRIP_ROOT/releases/$version
  if [ ! -f "$RELEASE/.fetched" ]; then
    rm -rf "$RELEASE"
    mkdir -p "$SPLITRIP_ROOT/releases"
    git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$version" \
      "$SPLITRIP_REPO" "$RELEASE" || early_fail "Could not fetch release $version."
    [ -f "$RELEASE/deploy/lib.sh" ] ||
      early_fail "Release $version predates the self-hosted installer and cannot be installed with it."
    touch "$RELEASE/.fetched"
  fi
  VERSION=$version
}

preflight
say_early() { printf '%s\n' "$*"; }
say_early "Splitrip installer"
say_early "→ Fetching the release"
fetch_installer_release

# shellcheck source=lib.sh
. "$RELEASE/deploy/lib.sh"
# shellcheck source=versions.env
. "$RELEASE/deploy/versions.env"
DEPLOY=$RELEASE/deploy
enable_error_trap

# Questions ----------------------------------------------------------------------------------------

ask() {
  local prompt=$1 default=${2:-} answer
  if [ -n "$default" ]; then prompt="$prompt [$default]"; fi
  read -r -p "$prompt: " answer
  printf '%s' "${answer:-$default}"
}

valid_domain() {
  [ ${#1} -le 253 ] &&
    [[ $1 =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$ ]]
}

valid_email() { [[ $1 =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; }

# Takes the answer from the environment when given there, and refuses it there rather than asking,
# since whoever set it is not at the keyboard.
#   $1 variable, $2 question, $3 check, $4 complaint, $5 default
ask_until_valid() {
  local var=$1 question=$2 check=$3 complaint=$4 default=${5:-} value
  value=${!var:-}
  if [ -n "$value" ]; then
    value=${value,,}
    "$check" "$value" || fail "$var: $complaint"
  else
    while true; do
      value=$(ask "$question" "$default")
      value=${value,,}
      "$check" "$value" && break
      say "  $complaint"
    done
  fi
  printf -v "$var" '%s' "$value"
}

ask_password() {
  local first second
  if [ -n "${SPLITRIP_ADMIN_PASSWORD:-}" ]; then
    [ ${#SPLITRIP_ADMIN_PASSWORD} -ge "$PASSWORD_MIN_LENGTH" ] ||
      fail "SPLITRIP_ADMIN_PASSWORD: it must be at least $PASSWORD_MIN_LENGTH characters."
    return
  fi
  while true; do
    read -r -s -p "Password for that account (at least $PASSWORD_MIN_LENGTH characters): " first
    printf '\n'
    if [ ${#first} -lt "$PASSWORD_MIN_LENGTH" ]; then
      say "  Too short: the minimum is $PASSWORD_MIN_LENGTH characters."
      continue
    fi
    read -r -s -p 'The same password again: ' second
    printf '\n'
    [ "$first" = "$second" ] && break
    say '  The two did not match.'
  done
  SPLITRIP_ADMIN_PASSWORD=$first
}

not_the_app_domain() { valid_domain "$1" && [ "$1" != "$SPLITRIP_APP_DOMAIN" ]; }

ask_questions() {
  say ''
  ask_until_valid SPLITRIP_APP_DOMAIN 'Domain the application will be served at' valid_domain \
    'That is not a domain name, such as splitrip.example.com.'
  ask_until_valid SPLITRIP_API_DOMAIN 'Domain its API will be served at' not_the_app_domain \
    "That is not a domain name different from the application's." "api.$SPLITRIP_APP_DOMAIN"
  say ''
  say 'The first account can open trips. This release has no sign-up screen, so it is created here.'
  ask_until_valid SPLITRIP_ADMIN_EMAIL 'Its email address' valid_email \
    'That is not an email address.'
  ask_password
  say ''
}

# Steps --------------------------------------------------------------------------------------------

write_configuration() {
  write_config "$SPLITRIP_APP_DOMAIN" "$SPLITRIP_API_DOMAIN"
  load_config
  render_service_envs
  install_units "$DEPLOY"
}

start_api_services() {
  systemctl enable --quiet splitrip-auth splitrip-rest
  systemctl restart splitrip-auth splitrip-rest
  wait_for_auth
  wait_for_rest
}

start_other_services() {
  systemctl enable --quiet splitrip-realtime splitrip-meta splitrip-studio
  systemctl restart splitrip-realtime splitrip-meta splitrip-studio
  wait_for_realtime
  wait_for_meta
  wait_for_studio
}

start_gateway() {
  render_gateway "$DEPLOY"
  systemctl enable --quiet nginx
  systemctl restart nginx
  wait_for 'The gateway' 30 http_ok -H "apikey: $ANON_KEY" "http://127.0.0.1:$API_PORT/auth/v1/health"
}

start_application() {
  switch_release "$VERSION"
  systemctl enable --quiet splitrip-app
  systemctl restart splitrip-app
  wait_for_app
}

finish() {
  install_update_command
  state_set APP_VERSION "$VERSION"
  state_set INSTALLED yes
}

print_instructions() {
  local address
  address=$(hostname -I | awk '{print $1}')
  cat <<EOF

✓ Splitrip $VERSION is installed.

Now publish it through your reverse proxy (Nginx Proxy Manager, for instance). Create two hosts:

  1. $SPLITRIP_APP_DOMAIN
       Forward to:  http://$address:$APP_PORT
       Certificate: request one, and force HTTPS.

  2. $SPLITRIP_API_DOMAIN
       Forward to:  http://$address:$API_PORT
       Websockets:  ON. Real time cannot connect without them.
       Certificate: request one, and force HTTPS.

  If a domain resolves only inside your local network, its certificate cannot be obtained by the
  HTTP challenge: use a DNS challenge for it.

  Publish nothing else. In particular, not port $STUDIO_PORT.

Supabase Studio, on the local network only:
  http://$address:$STUDIO_PORT
  User:     $STUDIO_USERNAME
  Password: $STUDIO_PASSWORD

First account: $SPLITRIP_ADMIN_EMAIL, who signs in at https://$SPLITRIP_APP_DOMAIN/sign-in

To bring this instance up to date later, run: update
Every secret and setting is in $SPLITRIP_CONFIG, readable by root only.
EOF
}

ask_questions
step 'Installing system packages' install_system_packages
step 'Creating the service users' create_service_users
step 'Installing the pinned components' install_components
step 'Selecting the pinned components' switch_components
step 'Writing the configuration' write_configuration
step 'Keeping the internal services local' start_firewall
step 'Configuring PostgreSQL' configure_postgres
step 'Preparing the database' bootstrap_database "$DEPLOY"
step 'Starting Auth and PostgREST' start_api_services
step 'Applying the migrations' apply_migrations "$RELEASE"
step 'Starting Realtime, postgres-meta and Studio' start_other_services
step 'Starting the gateway' start_gateway
step 'Creating the first account' create_first_account "$SPLITRIP_ADMIN_EMAIL" "$SPLITRIP_ADMIN_PASSWORD"
step "Building Splitrip $VERSION" build_release "$RELEASE"
step 'Starting the application' start_application
step 'Installing the update command' finish
print_instructions
