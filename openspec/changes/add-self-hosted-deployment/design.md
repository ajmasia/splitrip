## Context

See proposal.md for why; the behaviour is in `specs/self-hosted-deployment`.

What the repository already settles, and what it gets wrong for this target:

- **The MVP design expected this.** Its decision not to containerise the application ends with "revisit this if self-hosting becomes a goal". It has, and the answer is still not a container: the instance runs inside an LXC, which is already a container, and everything in it runs as the host's own services.
- **`NEXT_PUBLIC_*` values are inlined at build time.** `src/lib/supabase/env.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the browser bundle carries them as literals. The application therefore has to be built on the host, after the domain and the keys are known; one build cannot serve two instances.
- **Anonymous identities are minted by the application server.** `src/app/actions/join.ts` calls `signInAnonymously()` server-side, so Supabase Auth sees the application's address on every anonymous sign-in, and behind a reverse proxy it would see the proxy's on the browser's own calls. Per-address limits counted that way are one limit for the whole instance.
- **Local Auth settings live in `supabase/config.toml`**, which a production install does not read; production Auth is configured through its own environment.
- **The seed is development data**, including an account with a published password. It must never reach production.
- **The migrations ask little of the database.** Beyond plain SQL they use `auth.uid()` and `auth.jwt()`, which Auth's own migrations create, `extensions.gen_random_bytes` from `pgcrypto`, and the `supabase_realtime` publication. Stock PostgreSQL 17 with a short bootstrap is enough; Supabase's own Postgres build, with its dozens of extensions, is not needed.

## Goals / Non-Goals

**Goals:**
- One command on a Proxmox host to a working instance; one command in the container to bring it up to date.
- Run everything natively in the container — no container runtime inside it — so that the LXC's resources go to the services and not to a second layer of isolation.
- Stay on Supabase's own components, each pinned, so upgrading means moving pins, not maintaining a fork of their code.
- Expose to the reverse proxy only what the browser needs.

**Non-Goals:**
- Supporting distributions other than Debian 13, or virtual machines instead of an LXC.
- Zero-downtime updates. A restart of a few seconds is acceptable for this instance.
- Supabase services Splitrip does not use: storage, the image proxy, edge functions, analytics, the connection pooler.

## Decisions

### Native in the LXC, no container runtime

Every component runs as a systemd service of the container: PostgreSQL, Auth, PostgREST, Realtime, postgres-meta, Studio, the nginx gateway and the application. Each runs under its own system user and, except the gateway and the application, listens only on `127.0.0.1`. Realtime's web server cannot be bound to one address, so an nftables table of the instance's own, loaded by a oneshot unit, drops connections to every internal port that do not come from the host itself, whatever each service's settings say.

*Alternative considered:* Supabase's self-hosting `docker compose` stack inside the LXC. Rejected: Docker in an unprivileged LXC needs `nesting` and `keyctl`, depends on the host's kernel and storage driver, and adds a layer of overhead and failure modes to a small machine whose resources should go to the services. It would also bring Kong and the services Splitrip does not use.

### Files and layout

The repository gains `deploy/`: `proxmox/splitrip-lxc.sh` (host layer), `install.sh` (installer), `update.sh` (installed as `/usr/local/bin/update`), `versions.env` (the pins), `db/bootstrap.sql`, `nginx/` (the gateway's configuration), `systemd/` (one unit per service) and the environment templates.

On the host everything lives under `/opt/splitrip`: `releases/<version>/` holds a checkout and build of each installed release and `current` points at the running one; `components/<name>/<version>/` holds each Supabase component, with `components/<name>/current` pointing at the version in use; `splitrip.env` (mode `600`, owned by root) holds every secret and setting, and `env/<service>.env` (mode `600`, root) the subset each service needs, read by systemd through `EnvironmentFile` before it drops privileges. A `state` file records the installed application release and the pins in use.

### How the scripts are fetched

As with the Proxmox VE helper scripts, the host script is run straight from the repository: `bash -c "$(curl -fsSL https://raw.githubusercontent.com/<owner>/splitrip/main/deploy/proxmox/splitrip-lxc.sh)"`. It downloads `install.sh` from the release it is installing and runs it inside the container with `pct exec`. Releases are the repository's version tags; the installer checks out a tag, never a branch.

### The container

An unprivileged Debian 13 LXC with `nesting=1`, which systemd inside a recent Debian needs; no `keyctl`, since nothing in it uses kernel keyrings. Defaults of 2 cores, 4 GB of memory, 1 GB of swap and 20 GB of disk, with DHCP on `vmbr0`; the memory is sized mostly for building the application, and a task measures what the running instance actually uses. The script asks for identifier, bridge, address, storage, cores and memory, offering these defaults and refusing less than 2 GB of memory, which the build needs; it refuses an identifier `pct`/`qm` already know, and creates the container for the host's own architecture.

### Pins: one file, versions from one upstream release

`deploy/versions.env` names a version for each component: Auth (GoTrue), PostgREST, Realtime, postgres-meta, Studio, Node, the Supabase CLI and `crane`. The Supabase versions are taken together from one release of Supabase's self-hosting stack, so the combination is one upstream has tested; moving to a newer stack means copying its versions into this file. Release binaries are verified against checksums recorded beside their versions, and images are referenced by digest, never by tag.

### PostgreSQL: Debian's own, bootstrapped

Debian 13 ships PostgreSQL 17, the version the local stack uses. `db/bootstrap.sql`, run once as the superuser, creates what Supabase's components and the migrations assume: the roles `supabase_admin`, `authenticator` (with login, granted `anon`, `authenticated` and `service_role`), `supabase_auth_admin` owning the `auth` schema, `supabase_realtime_admin`, and `postgres` as the migrations' owner; the `extensions` schema with `pgcrypto` in it; the `realtime` schema, owned by `supabase_admin`, which Realtime creates its tables in but assumes exists; and the `supabase_realtime` publication. It is written to be safe to run again. The server listens on `127.0.0.1` only. Realtime reads the published changes through a logical replication slot decoded by `wal2json`, which Supabase's image bundles and Debian packages separately as `postgresql-17-wal2json`; without it subscriptions succeed and nothing is ever delivered. Recent PostgreSQL releases also let replication use only the output plugins named in `output_plugin_libraries`, so `wal2json` is added to the server's default list; the settings are applied by the installer and again by `update`, which restarts the database only when they change.

PostgREST exposes `public` alone: `graphql_public` needs `pg_graphql`, which is not packaged for Debian and which the application does not use.

*Alternative considered:* extracting Supabase's Postgres build. Rejected: it is a full PostgreSQL with its own data layout and extensions, far more than the migrations need, and would replace a distribution package that gets security updates.

### Auth and PostgREST: release binaries

Both publish static Linux binaries for each release. The installer downloads the pinned ones, verifies them and runs them under systemd. Auth runs its own migrations on start, creating the `auth` schema's tables and functions.

### Realtime, Studio and postgres-meta: releases taken from the pinned images

None of the three publishes a build outside its container image. `crane export` — a single static binary, pinned — downloads the image by digest and unpacks its filesystem without a container runtime; the installer keeps only the application directory: Realtime's Elixir release, which carries its own Erlang runtime, and the Node builds of Studio and postgres-meta, run with the pinned Node. They are then ordinary programs under systemd.

Realtime is started with its self-hosting settings, which seed the single tenant the stack uses; the tenant is chosen by the request's host, so the gateway sends Realtime that tenant's name as `Host`, as Kong does upstream.

*Alternative considered:* compiling Realtime from source. Rejected: it needs Erlang, Elixir and Rust in the container and a long build on every install and update, for the same program the image already carries.

### The gateway: nginx instead of Kong

Kong's work in the self-hosted stack is routing and checking the API key; Auth and PostgREST verify the JWTs themselves. nginx, installed from Debian, takes the routing and has two listeners:

- **The API port**, the one the reverse proxy publishes, forwards only `/auth/v1/`, `/rest/v1/` and `/realtime/v1/` (with websocket upgrade) to their services, and answers anything else with a not-found.
- **The Studio port**, reachable on the local network only, serves Studio behind basic authentication with the generated credentials, and forwards Studio's own calls to postgres-meta and the API.

*Alternative considered:* custom locations in the reverse proxy. Rejected: it would make keeping Studio private depend on the operator configuring the proxy exactly right by hand.

### The application: the standalone server under systemd

`next.config.ts` gains `output: 'standalone'`. The installer builds the release with the pinned Node, the two public values in its environment, places the static assets beside the standalone server and runs it under systemd as its own user, on port 3000.

Server-side, the application reaches Supabase at the gateway's local address, not through the public domain, which avoids sending every server request out through the reverse proxy and back. Because `@supabase/ssr` derives the session cookie's name from the URL, both the browser and the server client are given the same explicit cookie name, so a session written by one is read by the other. A server-only `SUPABASE_INTERNAL_URL` selects the internal address; when it is absent, as in development, the public URL is used as today.

### Rate limits that see the visitor

The reverse proxy appends the visitor's address to `X-Forwarded-For`. The server-side Supabase client forwards the last entry of the incoming request's header — the one the reverse proxy appended — on every call. The gateway, trusting forwarding headers only from local and private addresses, takes the visitor's address from that same last entry and passes it on as the whole header, so Auth sees one address per visitor whichever path a call took, and nothing the visitor wrote. Auth is configured to read its client address from that header. Anonymous sign-ins are capped per address at the same 30 an hour used locally; a task verifies it against the running instance with two addresses before this is considered done.

### Auth configuration

Through its service environment: the site address is `https://<app domain>`, the only redirect allowed is the application's domain, the external API address is `https://<api domain>`, anonymous sign-ins are enabled, email confirmation is off and no mail server is set. Public email sign-up should be off, since accounts are created by the operator; whether Auth accepts anonymous sign-ins with email sign-up disabled is verified in a task, and if it does not, email sign-up stays on — an account alone still cannot open a trip without being on `trip_creators`.

### Migrations

The Supabase CLI, pinned and downloaded as a single binary, runs `supabase db push --db-url` against the local database. It records applied migrations in Supabase's own history table, so a second run applies only what is new. `supabase/seed.sql` is never run.

### The first account

The installer creates it through Auth's admin endpoint with the service key, already confirmed, then inserts its address into `trip_creators` — and into `instance_operators` when that table exists, so an instance installed after `add-user-feedback` has its operator from the start.

### `update`

`update [version]` resolves the target (the latest version tag unless one is given) and exits early when it is already installed. Otherwise it checks the release out into `releases/<version>/` and builds it while the current one keeps serving. For each component whose pin in the release's `versions.env` differs from the one in use, it installs the new version beside the old one in `components/<name>/<version>/`. It then applies the new migrations, and only then switches `current` for the application and each moved component and restarts their services. A failure at any step before the switch leaves the previous release running and names the step. Previous releases and component versions are kept, so going back is `update <previous version>`.

Migrations are applied before the switch on the understanding, already held by the MVP, that migrations are additive within a release: the running release tolerates the new schema for the seconds until the switch. Auth and Realtime run their own migrations when they start on a new version; the same rule is relied on from upstream.

## Risks / Trade-offs

- **We now own the composition of Supabase's components**, which upstream's compose file did for us. → Versions are always taken together from one upstream self-hosting release, and the configuration of each service follows upstream's compose file for that release.
- **Programs taken from images depend on the container's libraries**: Realtime's release and the Node modules of Studio and postgres-meta are built against their image's glibc and OpenSSL. → The container runs the Debian release those images are based on; a task verifies each starts on it, and moving pins re-runs that check.
- **Self-hosted Supabase is still several services** for a small instance. → Only those Splitrip uses are installed, with no container layer; the defaults are prompts, not constants, and a task measures real memory use.
- **A migration that is not additive** would break the running release during `update`. → The rule is the MVP's; a release that needs otherwise says so in its notes and is updated with the service stopped.
- **A domain that resolves only inside the local network** cannot obtain a certificate by HTTP challenge. → The printed instructions say a DNS challenge is needed in that case; obtaining the certificate stays with the reverse proxy.
- **The repository must be public** for the host script and the installer to fetch it without credentials. → It is published under the AGPL; a private fork would need a token, not covered here.
- **Secrets in one file.** → Root-only, split into root-only files per service, never printed except the Studio credentials at the end of the install, and covered by Proxmox's backups of the container, which are themselves the operator's to protect.

## Migration Plan

This adds a deployment target and touches the application in two contained places: the standalone build and the Supabase clients' cookie name and forwarded address. Changing the cookie name signs out existing sessions once, on the development machine only; nothing is deployed yet. Rollback is not deploying; the application keeps running locally exactly as before.

`add-splitrip-mvp` is revised separately so that its tasks 11.3–11.4 install the local LXC and the external server with this installer instead of Vercel and managed Supabase.

## Open Questions

- The exact upstream self-hosting release to take the first pins from; any recent stable one will do, and moving it later is a change to `versions.env`.
