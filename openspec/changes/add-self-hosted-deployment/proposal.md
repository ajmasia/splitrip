## Why

Splitrip was planned to run on Vercel against a managed Supabase project. The instance that will actually serve its groups is the developer's own: first an LXC on a Proxmox host in the local network, where the first real users try it, and later an external server that also runs Proxmox. Neither exists yet, and setting one up by hand — Supabase's dozen services, its secrets, the migrations, the application build, the domain — is long, easy to get subtly wrong, and would have to be repeated for the second server. An installer that leaves a working instance behind, and can update it later, turns that into one command and makes the local instance a faithful rehearsal of the external one.

## What Changes

- **A Proxmox host script.** Run on a Proxmox host, it creates an unprivileged Debian LXC with the resources the stack needs, and runs the installer inside it. It asks only what it cannot decide: the container's identifier, its network and its storage, offering sensible defaults.
- **An installer for any Debian host.** Run inside that LXC — or on any Debian machine — it installs, natively and without any container runtime, the Supabase services the application uses — each pinned to a known version — generates every secret, applies the repository's migrations, builds the application for the chosen domain and runs it, all restarting on boot. It does not load the local sample data.
- **The product's domain.** The installer asks for the domain the application will be served at and the one its API will be served at, and configures the application and Supabase Auth for them: the site address, the allowed redirects, anonymous sign-ins and their rate limits.
- **The first account.** The installer asks for the email and password of the first organiser, creates that account and allows it to open trips, since this release has no sign-up screen and the instance would otherwise have nobody able to start one.
- **TLS stays with the existing reverse proxy.** The installer does not configure Nginx Proxy Manager or any other proxy. When it finishes it prints exactly what to create there: one host per domain, the address and port each forwards to, that websockets must be on for the API's real-time connection, and that each needs a certificate.
- **An `update` command inside the container**, in the manner of the Proxmox VE helper scripts: typed at the container's console, it updates the whole service — the application to its latest release or to a version asked for, each Supabase service whose pinned version that release changes, and any new migrations — then restarts it, keeping the data and every secret generated at install time. It says which version it moved from and to, and changes nothing when there is nothing to update.
- **Rate limits that see the real visitor.** The per-address limits on anonymous sign-ins must count each visitor, not the reverse proxy or the application server in front of them; the application forwards the visitor's address and Supabase Auth is told to read it.
- **Supabase's admin console stays private.** Studio is reachable on the local network with generated credentials, never published through the reverse proxy.
- **Documentation** of installing, updating, adding trip creators and operators, and backing up the container with Proxmox's own backups.

### Out of scope

- **Configuring the reverse proxy**, through its API or otherwise. Its configuration is printed, not applied.
- **Obtaining certificates.** The reverse proxy obtains them; for a domain that resolves only inside the local network that means a DNS challenge configured there.
- **Backups beyond the container.** Proxmox's own backups of the LXC cover data and configuration; a separate database dump schedule is not part of this change.
- **Outgoing email.** The application sends none in this release, so no mail server is configured.
- **High availability, several application instances or a separate database host.**
- **Vercel and managed Supabase.** No longer the deployment target; the plan of `add-splitrip-mvp` is to be revised accordingly in that change.

## Capabilities

### New Capabilities

- `self-hosted-deployment`: installing a production instance of Splitrip on Proxmox or any Debian host — creating the container, the installer's prompts, what a finished install leaves running, the reverse proxy configuration it prints, the `update` command that brings an existing instance up to date, and the operational guarantees around secrets, sample data and rate limits.

### Modified Capabilities

None. No existing capability spec describes how the application is deployed.

## Impact

- **New files**: a `deploy/` directory with the Proxmox host script, the installer, the `update` command, the pinned versions of every component, the database bootstrap, the gateway's configuration, a systemd unit per service and the templates for their environment.
- **Application code**: the Next.js build produces a standalone server; the server-side Supabase client forwards the visitor's address so Auth rate limits apply per visitor.
- **Documentation**: a deployment guide alongside the README.
- **Plan of `add-splitrip-mvp`**: its proposal, design and tasks 11.3–11.4 still describe Vercel and managed Supabase; they need revising in that change to point at this installer.
- **Dependencies**: none in the application. On the host, natively and with no container runtime: Debian's PostgreSQL 17 and nginx, a pinned Node, and pinned releases of Supabase's Auth, PostgREST, Realtime, postgres-meta, Studio and CLI.
