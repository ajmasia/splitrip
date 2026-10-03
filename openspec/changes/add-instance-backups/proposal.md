## Why

Real groups now keep their trips on the self-hosted instance, and the only copy of their data is the container's disk. Proxmox's own backups cover it, but only when the operator has set them up, only whole-container, and they cannot bring the data into a container installed again from scratch — which is exactly what an install test, a move to another host, or a broken container calls for. An instance needs copies of its own, taken without anybody remembering to, that a new install can start from with nothing lost: every trip, every account and every device still recognised.

## What Changes

- **A `backup` command.** Run as the superuser at the console, like `update`, it writes one file holding the whole database and the configuration with its secrets, and says where it is. The instance keeps serving while it runs.
- **Backups taken without asking.** Every day, and by `update` before it applies a release's migrations, the instance takes a backup of its own. Scheduled ones are kept for a week and those taken by `update` for the last three updates; backups taken by hand are never removed.
- **Installing from a backup.** The installer, given a backup file, asks no questions: it installs the release the backup was taken on, with the backup's domains and secrets, and restores its database instead of starting an empty one. Every trip, account, device and session works as before; `update` then brings it to the latest release.
- **From the Proxmox host too.** The host script accepts a backup file on the host and installs the new container from it.
- **The deployment guide** says how to take a backup, how to get it off the machine, and how to install from one.

### Out of scope

- **Restoring over a running instance.** Restoring means installing a new instance from the backup; the instance it was taken from is left alone, or destroyed by the operator.
- **Sending backups elsewhere automatically** — to another host, a NAS or a cloud. Getting the file off the machine is the operator's step; the guide shows how.
- **Backing up a single trip from the application.** That is `add-trip-backups`, for organisers.
- **Encrypting the backup file.** It holds every secret of the instance and is readable by the superuser only; keeping copies safe elsewhere is the operator's responsibility, as with Proxmox's backups.

## Capabilities

### New Capabilities

- `instance-backups`: taking a whole-instance backup by hand and automatically, keeping and pruning them, and installing a new instance from one with nothing lost.

### Modified Capabilities

None. The installer, `update` and the host script are specified in `self-hosted-deployment`, which so far exists only in the unarchived `add-self-hosted-deployment` change and cannot be targeted by a delta. This change adds to them without contradicting any of their requirements: an install without a backup file behaves exactly as now.

## Impact

- **Deployment scripts**: a new `deploy/backup.sh` installed as `backup`; a restore path in `deploy/install.sh`; `deploy/update.sh` taking a backup before migrating; `deploy/proxmox/splitrip-lxc.sh` pushing a backup into the container; a systemd timer for the daily backup.
- **Instance layout**: a root-only `/opt/splitrip/backups/` directory, covered by Proxmox's backups like the rest of the container.
- **Disk**: each backup is the database compressed plus a few kilobytes; at today's size, well under a megabyte.
- **Documentation**: a rewritten backup section in `docs/deployment.md`.
- **No application or database schema change.**
- **Depends on** `add-self-hosted-deployment`, whose scripts it extends.
