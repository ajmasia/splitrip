## Context

The instance runs Debian's PostgreSQL 17 on `127.0.0.1`, with the roles, schemas and publication created by `deploy/db/bootstrap.sql` from passwords in `/opt/splitrip/splitrip.env`, the root-only file holding every secret: the JWT secret, the API keys derived from it, the database passwords, Realtime's and Studio's keys. The installer generates that file only when it does not exist, and `update` never touches it. Device identities are anonymous Auth users whose sessions are JWTs signed with the instance's secret and refresh tokens stored in the `auth` schema; a session survives only if both the secret and the `auth` schema do.

## Goals / Non-Goals

**Goals:**

- One file that is enough, with the scripts of the release it names, to bring the instance back on a new container.
- No action needed from the operator for there to be a recent backup.

**Non-Goals:**

- Point-in-time recovery or WAL archiving. A daily backup and one before every update match how the instance changes.

## Decisions

### What a backup holds

A compressed tar named `splitrip-<UTC timestamp>-<kind>.tar.gz`, `<kind>` being `manual`, `daily` or `update`, holding:

- `database.dump`: `pg_dump --format=custom` of the `postgres` database, every schema — `public`, `auth`, `_realtime`, `realtime`, `extensions`, `supabase_migrations`.
- `splitrip.env`: the configuration file as it is.
- `manifest`: the backup format's version, the release running, the moment taken, the kind, and the application and API domains, so a backup can be identified without opening the dump.

The roles are not dumped: `bootstrap.sql` creates them from the configuration's passwords, and the configuration is in the file. Releases and components are not included: they are fetched again for the release the manifest names.

- *A file-level copy of PostgreSQL's data directory*: needs the database stopped or a snapshot, ties the backup to the exact server version, and is larger. A logical dump is consistent while the instance serves.
- *Only the `public` schema*: would lose every account and device identity, which is the point.

### Where backups live and how they are pruned

`/opt/splitrip/backups/`, mode `700`, files `600`. Pruning goes by the kind in the name: `daily` older than seven days and `update` beyond the newest three are removed by the command that writes a new one of that kind; `manual` is never touched. The daily backup is a `splitrip-backup.timer` with `Persistent=true`, so a day the container was off is caught up on the next boot.

### Restoring is installing

`SPLITRIP_RESTORE=<file>` given to the installer, like the other `SPLITRIP_*` answers it already reads from the environment:

1. Check the tar and its manifest before anything else; refuse a missing manifest, an unknown format version, or a dump `pg_restore --list` cannot read.
2. Install the release the manifest names instead of the latest.
3. Put the backup's `splitrip.env` in place before the configuration step, which then keeps it — it already keeps an existing file — and renders everything from it.
4. Run `bootstrap.sql`, then `pg_restore --clean --if-exists --exit-on-error` into the bootstrapped database, in place of applying migrations; the dump carries its own migration history, so `update` later applies only what is new.
5. Skip creating the first account.

The rest of the install — components, services, gateway, build — runs as for a new instance. The domains come from the backup, so the reverse proxy needs pointing at the new container only when its address changed.

- *A `restore` command on a running instance*: restoring over live data needs services stopped, a decision about the running configuration against the backup's, and a way back if it fails. Installing a new container keeps the old one intact until the operator is satisfied.

### The host script

`SPLITRIP_RESTORE=<path on host>` to `splitrip-lxc.sh`: after creating the container it `pct push`es the file into it and runs the installer with the variable pointing at the pushed copy.

### `update` backs up first

A `Taking a backup` step before `Applying the new migrations`, failing like any other step before the switch. Moving back to an older release takes no backup, since it applies no migrations.

## Risks / Trade-offs

- [A backup holds every secret] → Root-only on the machine; the guide says so plainly and that off-machine copies need the same care. Encryption is out of scope.
- [A restore onto a release whose installer predates this change] → The manifest names the release; the installer refuses a release older than the first one that can restore, saying which.
- [`pg_restore --clean` over a bootstrapped database meets objects owned by roles created differently] → The roles come from the same `bootstrap.sql` on both sides; verified by a task restoring onto a fresh container.
- [Disk filling with backups] → Retention bounds automatic ones; manual ones are the operator's.

## Migration Plan

An instance gets the command, the timer and the step in `update` when it updates to the release that brings them; the first daily backup is taken that day. Nothing to migrate.

## Open Questions

- Whether the realtime replication slot needs dropping before restoring — it is not in the dump, and Realtime creates its own; to confirm while verifying the restore.
