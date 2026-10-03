#!/usr/bin/env bash
# Creates a Debian 13 LXC for Splitrip on this Proxmox VE host and runs the installer inside it.
#
# Run on the Proxmox host, as root:
#
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/ajmasia/splitrip/main/deploy/proxmox/splitrip-lxc.sh)"
#
# It asks for the container's identifier, bridge, address, storage, cores and memory, offering a
# default for each; SPLITRIP_CORES and SPLITRIP_MEMORY (MB) change the defaults offered. The rest
# can be changed ahead in the environment: SPLITRIP_HOSTNAME, SPLITRIP_SWAP (MB), SPLITRIP_DISK (GB),
# SPLITRIP_TEMPLATE_STORAGE and SPLITRIP_VERSION, the release to install (the latest otherwise).

set -Eeuo pipefail

REPO=https://github.com/ajmasia/splitrip
RAW=https://raw.githubusercontent.com/ajmasia/splitrip

HOSTNAME_=${SPLITRIP_HOSTNAME:-splitrip}
CORES=${SPLITRIP_CORES:-2}
MEMORY=${SPLITRIP_MEMORY:-4096}
SWAP=${SPLITRIP_SWAP:-1024}
DISK=${SPLITRIP_DISK:-20}
TEMPLATE_STORAGE=${SPLITRIP_TEMPLATE_STORAGE:-local}

CURRENT_STEP=''

say() { printf '%s\n' "$*"; }
fail() {
  printf '\n✗ %s%s\n' "${CURRENT_STEP:+Step failed: $CURRENT_STEP. }" "$*" >&2
  exit 1
}
step() {
  CURRENT_STEP=$1
  shift
  say "→ $CURRENT_STEP"
  "$@"
}
trap 'fail "See the message above."' ERR

ask() {
  local prompt=$1 default=$2 answer
  read -r -p "$prompt [$default]: " answer
  printf '%s' "${answer:-$default}"
}

# Checks --------------------------------------------------------------------------------------------

[ "$(id -u)" = 0 ] || fail 'Run this script as root.'
if ! command -v pveversion >/dev/null || ! command -v pct >/dev/null; then
  fail 'This script must run on a Proxmox VE host.'
fi

# The installer, and every component it pins, are built for amd64.
ARCH=$(dpkg --print-architecture)
[ "$ARCH" = amd64 ] || fail "Splitrip installs on amd64 hosts; this one is $ARCH."

id_in_use() {
  pvesh get /cluster/resources --type vm --output-format json |
    grep -Eq "\"vmid\":$1[,}]"
}

storage_holds() {
  pvesm status --content "$2" 2>/dev/null | awk 'NR > 1 { print $1 }' | grep -qx "$1"
}

valid_cidr() {
  [[ $1 =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/([0-9]|[12][0-9]|3[0-2])$ ]]
}

valid_ip() {
  [[ $1 =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

# Questions -----------------------------------------------------------------------------------------

say 'Splitrip: a new container on this Proxmox host'
say ''

while true; do
  CTID=$(ask 'Container identifier' "$(pvesh get /cluster/nextid)")
  if ! [[ $CTID =~ ^[0-9]+$ ]] || [ "$CTID" -lt 100 ]; then
    say '  An identifier is a number from 100 up.'
  elif id_in_use "$CTID"; then
    fail "Identifier $CTID is already in use by a container or virtual machine; nothing was created."
  else
    break
  fi
done

while true; do
  BRIDGE=$(ask 'Network bridge' vmbr0)
  [ -d "/sys/class/net/$BRIDGE/bridge" ] && break
  say "  There is no bridge called $BRIDGE on this host."
done

while true; do
  ADDRESS=$(ask 'Address: dhcp, or a fixed one such as 192.168.1.50/24' dhcp)
  if [ "$ADDRESS" = dhcp ]; then
    NET="name=eth0,bridge=$BRIDGE,ip=dhcp"
    break
  elif valid_cidr "$ADDRESS"; then
    while true; do
      GATEWAY=$(ask 'Gateway' "${ADDRESS%.*/*}.1")
      valid_ip "$GATEWAY" && break
      say '  That is not an address.'
    done
    NET="name=eth0,bridge=$BRIDGE,ip=$ADDRESS,gw=$GATEWAY"
    break
  fi
  say '  Answer dhcp, or an address with its prefix length.'
done

# local-lvm on a default install, local-zfs on one over ZFS: whichever this host has.
DEFAULT_STORAGE=local-lvm
if ! storage_holds "$DEFAULT_STORAGE" rootdir; then
  DEFAULT_STORAGE=$(pvesm status --content rootdir | awk 'NR == 2 { print $1 }')
fi

while true; do
  STORAGE=$(ask 'Storage for the container' "$DEFAULT_STORAGE")
  storage_holds "$STORAGE" rootdir && break
  say "  $STORAGE cannot hold containers here. These can: $(pvesm status --content rootdir |
    awk 'NR > 1 { printf "%s ", $1 }')"
done

HOST_CORES=$(nproc)
HOST_MEMORY=$(free -m | awk '/^Mem:/ { print $2 }')

while true; do
  CORES=$(ask "Cores (2 recommended; this host has $HOST_CORES)" "$CORES")
  [[ $CORES =~ ^[0-9]+$ ]] && [ "$CORES" -ge 1 ] && [ "$CORES" -le "$HOST_CORES" ] && break
  say "  A number from 1 to $HOST_CORES."
done

# Building the application is what needs the memory; the running instance uses much less.
while true; do
  MEMORY=$(ask "Memory in MB (4096 recommended, 2048 at least; this host has $HOST_MEMORY)" "$MEMORY")
  [[ $MEMORY =~ ^[0-9]+$ ]] && [ "$MEMORY" -ge 2048 ] && [ "$MEMORY" -le "$HOST_MEMORY" ] && break
  say "  A number of MB from 2048, which building the application needs, to $HOST_MEMORY."
done

# The identifier is checked again: another container may have taken it while the questions were
# being answered.
id_in_use "$CTID" && fail "Identifier $CTID is already in use; nothing was created."

VERSION=${SPLITRIP_VERSION:-$(git ls-remote --tags --refs "$REPO.git" | sed 's#.*refs/tags/##' |
  grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n 1)}
[ -n "$VERSION" ] || fail "No release found at $REPO."

say ''
say "Container $CTID ($HOSTNAME_): $CORES cores, ${MEMORY} MB of memory, ${SWAP} MB of swap,"
say "${DISK} GB on $STORAGE, network $ADDRESS on $BRIDGE. Splitrip $VERSION will be installed in it."
say ''

# Steps ---------------------------------------------------------------------------------------------

TEMPLATE=''

fetch_template() {
  pveam update >/dev/null
  # Templates are listed for several architectures; only this host's can start here.
  TEMPLATE=$(pveam available --section system | awk '{ print $2 }' |
    grep -E "^debian-13-standard_.*_${ARCH}\.tar\." | sort -V | tail -n 1)
  [ -n "$TEMPLATE" ] || fail "No Debian 13 template for $ARCH is available from Proxmox."
  if ! pveam list "$TEMPLATE_STORAGE" | grep -q "$TEMPLATE"; then
    pveam download "$TEMPLATE_STORAGE" "$TEMPLATE" >/dev/null
  fi
}

# Unprivileged, with nesting, which systemd inside a recent Debian needs. Started on boot.
create_container() {
  pct create "$CTID" "$TEMPLATE_STORAGE:vztmpl/$TEMPLATE" \
    --hostname "$HOSTNAME_" \
    --ostype debian \
    --arch "$ARCH" \
    --unprivileged 1 \
    --features nesting=1 \
    --cores "$CORES" \
    --memory "$MEMORY" \
    --swap "$SWAP" \
    --rootfs "$STORAGE:$DISK" \
    --net0 "$NET" \
    --onboot 1 \
    --description "Splitrip. Bring it up to date with \`update\` at its console." >/dev/null
  pct start "$CTID"
}

wait_for_network() {
  local tries=0
  until pct exec "$CTID" -- getent hosts deb.debian.org >/dev/null 2>&1; do
    tries=$((tries + 1))
    [ "$tries" -lt 60 ] || fail 'The container did not reach the network within two minutes.'
    sleep 2
  done
}

run_installer() {
  local installer
  installer=$(curl -fsSL "$RAW/$VERSION/deploy/install.sh")
  # A clean environment: the host's own, its locale included, means nothing inside the container.
  pct exec "$CTID" -- env -i \
    PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    HOME=/root TERM="${TERM:-xterm}" LANG=C.UTF-8 \
    SPLITRIP_VERSION="$VERSION" bash -c "$installer"
}

step 'Fetching the Debian 13 template' fetch_template
step "Creating container $CTID" create_container
step 'Waiting for its network' wait_for_network
CURRENT_STEP="Installing Splitrip $VERSION in container $CTID"
say "→ $CURRENT_STEP"
run_installer || fail "The container exists; finish the install inside it by running, here on the host:
  pct exec $CTID -- bash -c \"\$(curl -fsSL $RAW/$VERSION/deploy/install.sh)\""

say ''
say "Container $CTID is ready. Its console: pct enter $CTID"
