## Purpose

Keeps a self-hosted instance's data safe beyond its own disk: whole-instance backups taken by hand and on their own, and a new install that starts from one with every trip, account and device as it was.

## ADDED Requirements

### Requirement: The operator takes a backup at the console

An installed instance SHALL provide a `backup` command at the host's console. Run as the superuser, it SHALL write a single file holding the whole database and the instance's configuration, secrets included, together with the release the instance runs and the moment it was taken, and SHALL print the file's path. The instance SHALL keep serving while it runs. The file SHALL be readable by the superuser only. Run by anybody else, it SHALL refuse and change nothing.

#### Scenario: Taking a backup by hand

- **WHEN** the operator runs `backup` as the superuser on an instance with trips
- **THEN** a new backup file exists, readable by the superuser only, its path is printed, and the application answered requests throughout

#### Scenario: Not the superuser

- **WHEN** `backup` is run by a user other than the superuser
- **THEN** it refuses, says why, and writes nothing

### Requirement: The instance backs itself up

The instance SHALL take a backup every day without being asked, and `update` SHALL take one before it applies a release's migrations; when that backup fails, `update` SHALL stop before applying anything and name the step. Daily backups SHALL be kept for seven days and backups taken by `update` for the last three updates; backups taken by hand SHALL never be removed by the instance.

#### Scenario: A day passes

- **WHEN** a day passes on a running instance
- **THEN** a new daily backup exists, and no daily backup older than seven days remains

#### Scenario: Updating takes a backup first

- **WHEN** the operator runs `update` and a newer release exists
- **THEN** a backup is taken before any migration is applied, and only the backups of the last three updates are kept

#### Scenario: The backup before an update fails

- **WHEN** the backup `update` takes cannot be written
- **THEN** `update` stops, the previous release keeps serving, no migration has been applied, and the failed step is named

#### Scenario: Backups taken by hand are kept

- **WHEN** a backup taken with `backup` is older than every retention period
- **THEN** it is still there

### Requirement: A new instance is installed from a backup

The installer SHALL accept a backup file. Given one, it SHALL ask no questions, SHALL install the release the backup was taken on with the backup's domains and secrets, and SHALL restore the backup's database in place of an empty one, creating no first account. The resulting instance SHALL serve every trip, account, device identity and session the backup held. A file that is not a backup, or is damaged, SHALL be refused before anything is installed.

#### Scenario: Reinstalling from a backup

- **WHEN** an instance is backed up, a new container is installed from that backup, and the reverse proxy is pointed at it
- **THEN** every trip and its expenses, payments and balances are as they were, the organiser signs in with the same password, and a participant's phone that joined by invitation opens the trip without joining again

#### Scenario: Updating after a restore

- **WHEN** an instance installed from a backup taken on an older release runs `update`
- **THEN** it moves to the latest release and applies its migrations to the restored data

#### Scenario: Not a backup

- **WHEN** the installer is given a file that is not a backup, or a backup whose contents are damaged
- **THEN** it refuses before installing anything and says why

### Requirement: The Proxmox host script installs from a backup

The Proxmox host script SHALL accept a backup file on the host and SHALL create the container and install it from that backup, with the same container questions as a new install.

#### Scenario: Restoring onto a new container from the host

- **WHEN** the operator runs the host script with a backup file that is on the Proxmox host
- **THEN** a new container is created, installed from that backup, and serves the backed-up instance's data

### Requirement: The operator knows how to keep backups safe

The deployment guide SHALL explain how to take a backup, where the instance keeps them and for how long, how to copy one off the machine and off a Proxmox container, that a backup holds every secret of the instance, and how to install a new instance from one.

#### Scenario: Following the guide

- **WHEN** an operator follows only the guide to take a backup, copy it to another machine, and install a new container from it
- **THEN** each step works as written and the new container serves the original data
