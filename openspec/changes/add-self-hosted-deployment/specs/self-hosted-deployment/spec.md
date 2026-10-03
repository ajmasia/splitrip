## Purpose

Lets whoever runs Splitrip install a complete production instance on a Proxmox host or any Debian machine with one command, reach it at their own domain behind their own reverse proxy, and keep it up to date with another.

## ADDED Requirements

### Requirement: Creating the container on a Proxmox host
The deployment SHALL provide a script that, run on a Proxmox host, creates an unprivileged Debian LXC, with at least the memory, disk and processors the stack needs, and then runs the installer inside it. It SHALL ask for the container identifier, its network configuration and its storage, offering a default for each, and SHALL refuse to proceed when the identifier is already in use.

#### Scenario: A new container with the defaults
- **WHEN** the host script is run on a Proxmox host and every default is accepted
- **THEN** a new unprivileged Debian LXC exists and the installer has been started within it

#### Scenario: An identifier already taken
- **WHEN** the identifier given for the new container belongs to an existing container or virtual machine
- **THEN** the script stops before creating anything and says which identifier is in use

#### Scenario: Not a Proxmox host
- **WHEN** the host script is run on a machine that is not a Proxmox host
- **THEN** it stops before changing anything and says that it must run on a Proxmox host

### Requirement: Installing on a Debian host
The deployment SHALL provide an installer that, run as the superuser on a supported Debian release with no instance installed, leaves a working instance behind: the Supabase services the application uses, each at a pinned version, the repository's migrations applied, and the application built and served, all of them running as the host's own services, without a container runtime, and started again automatically when the machine boots. When any step fails, the installer SHALL stop, say which step failed, and be safe to run again.

#### Scenario: A clean install
- **WHEN** the installer is run on a supported Debian host with no instance installed and its questions are answered
- **THEN** the application answers on its port, the Supabase API answers on its port, and every migration in the repository has been applied

#### Scenario: No container runtime
- **WHEN** an installation has finished
- **THEN** no container runtime is installed or running on the host, and every service of the instance is one of the host's own services

#### Scenario: After a reboot
- **WHEN** the machine running an installed instance is restarted
- **THEN** the application and every Supabase service are running again without anybody intervening

#### Scenario: A step fails
- **WHEN** a step of the installation fails
- **THEN** the installer stops, names the step that failed, and running it again resumes or redoes the installation without leaving a second copy of anything

#### Scenario: An instance already installed
- **WHEN** the installer is run on a host where an instance is already installed
- **THEN** it does not reinstall over it and points to the `update` command instead

### Requirement: Secrets are generated and kept on the host
The installer SHALL generate every secret the instance needs — database password, signing secret, API keys and the admin console's credentials — from a cryptographically secure source, SHALL store them in a configuration file readable only by the superuser, and SHALL NOT reuse any value from the repository's local development configuration.

#### Scenario: Two installations
- **WHEN** two instances are installed on two hosts
- **THEN** no secret is the same between them

#### Scenario: The configuration file
- **WHEN** a user other than the superuser on the host tries to read the instance's configuration file
- **THEN** the operating system refuses it

#### Scenario: No development value survives
- **WHEN** an instance has been installed
- **THEN** none of its keys or passwords matches a value from the repository's local development configuration

### Requirement: Configuring the product's domain
The installer SHALL ask for the domain the application is served at and the domain its API is served at, proposing `api.` followed by the application's domain for the latter. It SHALL configure the application to reach Supabase at the API domain over HTTPS, and Supabase Auth to treat the application's domain as its site address and only allowed redirect target.

#### Scenario: Domains entered
- **WHEN** the application domain `splitrip.example.com` is entered and the proposed API domain accepted
- **THEN** the installed application calls Supabase at `https://api.splitrip.example.com` and Auth's site address is `https://splitrip.example.com`

#### Scenario: Not a domain
- **WHEN** something that is not a valid domain name is entered
- **THEN** the installer says so and asks again

### Requirement: The first organiser account
The installer SHALL ask for the email address and password of a first account, create that account already confirmed, and allow it to open trips. It SHALL refuse a password shorter than the minimum Supabase Auth enforces.

#### Scenario: Signing in after the install
- **WHEN** the installation has finished and the first account signs in at the application's domain
- **THEN** the sign-in succeeds and that account can create a trip

#### Scenario: A password too short
- **WHEN** a password shorter than the minimum is entered for the first account
- **THEN** the installer says what the minimum is and asks again

### Requirement: No sample data in production
An installed instance SHALL contain none of the repository's sample data: no sample trip, no sample participants and no sample accounts.

#### Scenario: A fresh instance
- **WHEN** an instance has just been installed
- **THEN** the only account is the first organiser's and there are no trips

### Requirement: Reverse proxy instructions
When it finishes, the installer SHALL print, for each of the two domains, the address and port the reverse proxy must forward it to, that the API domain needs websocket support for the real-time connection, and that each domain needs a TLS certificate. It SHALL NOT change the configuration of any reverse proxy itself.

#### Scenario: The end of an install
- **WHEN** the installation finishes
- **THEN** the installer prints both domains, each with the address and port to forward to, states that the API domain needs websockets, and states that both need a certificate

#### Scenario: Behind the configured proxy
- **WHEN** the reverse proxy is configured as printed and a phone opens the application's domain
- **THEN** the application loads over HTTPS, a participant can join a trip, and changes made on another device appear without reloading

### Requirement: The admin console stays private
The self-hosted Supabase admin console SHALL be reachable only on the host's local network address, protected by the credentials generated at install time, and SHALL NOT be part of what the installer tells the reverse proxy to publish.

#### Scenario: From the local network
- **WHEN** somebody on the local network opens the admin console's address printed at the end of the install
- **THEN** it asks for credentials and accepts the generated ones

#### Scenario: Not in the proxy instructions
- **WHEN** the installer prints the reverse proxy instructions
- **THEN** the admin console is not among the hosts to publish

### Requirement: The update command
An installed instance SHALL provide an `update` command available at the host's console. Run as the superuser, it SHALL move the application to its latest release, or to a release asked for, update each Supabase service whose pinned version that release changes, apply any migrations not yet applied, and restart the service, keeping every row of data and every secret. It SHALL say which version it moved from and to, SHALL change nothing when the instance is already at the requested release, and SHALL leave the instance running its previous release when any step before the restart fails.

#### Scenario: A new release
- **WHEN** `update` is run on an instance one release behind
- **THEN** the instance runs the latest release, its new migrations are applied, every existing trip and account is intact, and the command reports both versions

#### Scenario: Already up to date
- **WHEN** `update` is run on an instance already at the latest release
- **THEN** it says so and changes nothing

#### Scenario: A specific release
- **WHEN** `update` is run asking for a particular release newer than the installed one
- **THEN** the instance runs that release

#### Scenario: A failure before the restart
- **WHEN** building the new release fails during `update`
- **THEN** the instance keeps serving its previous release and the command names the step that failed

#### Scenario: Secrets survive
- **WHEN** an instance has been updated
- **THEN** existing sessions remain valid and every secret in its configuration file is unchanged

### Requirement: Rate limits apply per visitor
On an installed instance, the per-address limits Supabase Auth applies to anonymous sign-ins SHALL count the address of the visitor, as received by the reverse proxy, not the address of the reverse proxy or of the application server.

#### Scenario: Two visitors
- **WHEN** one visitor exhausts the hourly limit of anonymous sign-ins from their address
- **THEN** a visitor from a different address can still join a trip

#### Scenario: One visitor
- **WHEN** a single address requests anonymous sign-ins beyond the hourly limit
- **THEN** the requests beyond the limit are refused
