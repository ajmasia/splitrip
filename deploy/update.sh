#!/usr/bin/env bash
# Brings an installed Splitrip instance up to date. Installed as the `update` command.
#
#   update             moves to the latest release
#   update <version>   moves to that release, newer or older
#
# Everything is prepared while the running release keeps serving: the release is fetched and built,
# any component whose pinned version changed is installed beside the one in use, and the new
# migrations are applied. Only then are the release and the components switched and the services
# restarted. A failure before the switch leaves the previous release running and names the step.
#
# The configuration file is never written: every secret, and so every session, survives.
#
# The command runs the copy of this script from the running release, which fetches the target and
# hands over to the target's own copy (--apply), so each release brings the logic that installs it.

set -Eeuo pipefail

HERE=$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")
# shellcheck source=lib.sh
. "$HERE/lib.sh"
enable_error_trap

[ "$(id -u)" = 0 ] || fail 'Run update as root.'
[ "$(state_get INSTALLED)" = yes ] || fail "No installed instance at $SPLITRIP_ROOT."

restart_services() {
  systemctl daemon-reload
  systemctl restart splitrip-firewall
  systemctl reload-or-restart nginx
  systemctl restart "${SERVICES[@]}"
}

wait_for_services() {
  wait_for_auth
  wait_for_rest
  wait_for_realtime
  wait_for_meta
  wait_for_studio
  wait_for_app
}

switch_to() {
  local target=$1 deploy=$2
  render_service_envs
  render_gateway "$deploy"
  install_units "$deploy"
  switch_components
  switch_release "$target"
  install_update_command
  restart_services
}

#   $1 target release, $2 release it moves from
apply() {
  local target=$1 previous=$2 release deploy
  release=$SPLITRIP_ROOT/releases/$target
  deploy=$release/deploy
  # shellcheck source=versions.env
  . "$deploy/versions.env"
  load_config

  step "Installing the system packages $target needs" install_system_packages
  step "Installing the components $target pins" install_components
  step "Building Splitrip $target" build_release "$release"
  if release_older "$target" "$previous"; then
    say "  Moving back: the migrations $previous added stay, as migrations only ever add."
  else
    step 'Applying the new migrations' apply_migrations "$release"
  fi
  step "Switching to $target" switch_to "$target" "$deploy"
  step 'Waiting for the services' wait_for_services
  state_set APP_VERSION "$target"

  say ''
  say "✓ Updated Splitrip from $previous to $target."
}

if [ "${1:-}" = --apply ]; then
  apply "$2" "$3"
  exit 0
fi

# Only one update at a time; the lock is held through the hand-over to the target's script.
exec 9>/run/lock/splitrip-update.lock
flock -n 9 || fail 'Another update is running.'

current=$(state_get APP_VERSION)
CURRENT_STEP='Finding the release to move to'
target=${1:-$(latest_release)}
[ -n "$target" ] || fail "No release found at $SPLITRIP_REPO."

if [ "$target" = "$current" ]; then
  say "Splitrip is already at $current. Nothing to update."
  exit 0
fi
release_exists "$target" || fail "There is no release $target."

say "Updating Splitrip from $current to $target."
step "Fetching Splitrip $target" fetch_release "$target"
exec "$SPLITRIP_ROOT/releases/$target/deploy/update.sh" --apply "$target" "$current"
