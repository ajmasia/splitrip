## Context

See proposal.md for why; the behaviour is in `specs/self-hosted-deployment`.

What the repository already settles, and what it gets wrong for this target:

- **The MVP design expected this.** Its decision not to containerise the application ends with "revisit this if self-hosting becomes a goal". It has: the application now needs a production image, built and run for a target that exists.
- **`NEXT_PUBLIC_*` values are inlined at build time.** `src/lib/supabase/env.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the browser bundle carries them as literals. The image therefore has to be built on the host, after the domain and the keys are known; a prebuilt image cannot serve two instances.
- **Anonymous identities are minted by the application server.** `src/app/actions/join.ts` calls `signInAnonymously()` server-side, so Supabase Auth sees the application's address on every anonymous sign-in, and behind a reverse proxy it would see the proxy's on the browser's own calls. Per-address limits counted that way are one limit for the whole instance.
- **Local Auth settings live in `supabase/config.toml`**, which the self-hosted stack does not read; production Auth is configured through the environment of the self-hosted services.
- **The seed is development data**, including an account with a published password. It must never reach production.

## Goals / Non-Goals

**Goals:**
- One command on a Proxmox host to a working instance; one command in the container to bring it up to date.
- Stay on Supabase's own self-hosting path, pinned, so upgrading it means moving a pin, not maintaining a fork.
- Expose to the reverse proxy only what the browser needs.

**Non-Goals:**
- Supporting distributions other than Debian, or container runtimes other than Docker.
- Zero-downtime updates. A restart of a few seconds is acceptable for this instance.

## Decisions

### Files and layout

The repository gains `deploy/`: `proxmox/splitrip-lxc.sh` (host layer), `install.sh` (installer), `update.sh` (installed as `/usr/local/bin/update`), `compose.app.yml`, `gateway.conf`, `supabase.version` (the pinned Supabase self-hosting release) and the environment template; and a root `Dockerfile`.

On the host everything lives under `/opt/splitrip`: `releases/<version>/` holds a checkout of each installed release, `current` points at the running one, `supabase/` holds the self-hosting stack, and `splitrip.env` (mode `600`, owned by root) holds every secret and setting. A `state` file records the installed application release and Supabase pin.

### How the scripts are fetched

As with the Proxmox VE helper scripts, the host script is run straight from the repository: `bash -c "$(curl -fsSL https://raw.githubusercontent.com/<owner>/splitrip/main/deploy/proxmox/splitrip-lxc.sh)"`. It downloads `install.sh` from the release it is installing and runs it inside the container with `pct exec`. Releases are the repository's version tags; the installer checks out a tag, never a branch.

*Alternative considered:* a published installer image. Rejected: the build has to happen on the host anyway, so an image would only wrap a checkout.

### The container

An unprivileged Debian LXC with `nesting=1,keyctl=1`, which is what Docker inside an unprivileged container needs; defaults of 2 cores, 4 GB of memory, 1 GB of swap and 20 GB of disk, with DHCP on `vmbr0`. The script asks for identifier, bridge, address and storage, offering these defaults, and refuses an identifier `pct`/`qm` already know.

### Supabase: upstream's self-hosting stack, pinned

The installer fetches the `docker/` directory of Supabase's repository at the commit named in `supabase.version`, writes its `.env` from the generated secrets and starts it with `docker compose`. Services Splitrip does not use (storage, image proxy, edge functions) are left out through a compose override rather than by editing upstream's file, so moving the pin stays a matter of fetching a different commit.

*Alternative considered:* a hand-written compose with only the services Splitrip uses. Rejected: it would be a fork of a dozen services to keep in step with upstream's upgrades, exactly what the MVP design declined to own.

### Exposing the API: a gateway in front of Kong

In the self-hosted stack, Kong serves both the API and the Studio admin console on the same port. Publishing that port through the reverse proxy would publish Studio. A small nginx container, the gateway, listens on its own port and forwards only `/auth/v1/`, `/rest/v1/` and `/realtime/v1/` (with websocket upgrade) to Kong, answering anything else with a not-found. The reverse proxy is told to forward the API domain to the gateway; Kong's own port, with Studio behind its basic-auth credentials, is reachable only on the local network.

*Alternative considered:* custom locations in the reverse proxy. Rejected: it would make keeping Studio private depend on the operator configuring the proxy exactly right by hand.

### The application: a standalone image built on the host

`next.config.ts` gains `output: 'standalone'`. The `Dockerfile` builds with the two public values as build arguments and runs the standalone server as a non-root user. `compose.app.yml` runs it on the Supabase stack's network with `restart: unless-stopped`, tagged with its release, on port 3000. Docker starts on boot, and with it every container.

Server-side, the application reaches Supabase on the internal network (`http://kong:8000`), not through the public domain, which avoids sending every server request out through the reverse proxy and back. Because `@supabase/ssr` derives the session cookie's name from the URL, both the browser and the server client are given the same explicit cookie name, so a session written by one is read by the other. A server-only `SUPABASE_INTERNAL_URL` selects the internal address; when it is absent, as in development, the public URL is used as today.

### Rate limits that see the visitor

The reverse proxy sets `X-Forwarded-For`; the gateway passes it on. The server-side Supabase client forwards the visitor's address from the incoming request in that same header on every Auth call, and Supabase Auth is configured to take the client address from it. Anonymous sign-ins are capped per address at the same 30 an hour used locally.

The header's exact form after each hop — the visitor's address alone, or a list — decides what Auth keys the limit on; a task verifies it against the running stack with two addresses before this is considered done.

### Auth configuration

Through the self-hosted stack's environment: the site address is `https://<app domain>`, the only redirect allowed is the application's domain, the external API address is `https://<api domain>`, anonymous sign-ins are enabled, email confirmation is off and no mail server is set. Public email sign-up should be off, since accounts are created by the operator; whether Auth accepts anonymous sign-ins with email sign-up disabled is verified in a task, and if it does not, email sign-up stays on — an account alone still cannot open a trip without being on `trip_creators`.

### Migrations

The Supabase CLI, pinned and downloaded as a single binary, runs `supabase db push --db-url` against the stack's database on the local network. It records applied migrations in Supabase's own history table, so a second run applies only what is new. `supabase/seed.sql` is never run.

### The first account

The installer creates it through Auth's admin endpoint with the service key, already confirmed, then inserts its address into `trip_creators` — and into `instance_operators` when that table exists, so an instance installed after `add-user-feedback` has its operator from the start.

### `update`

`update [version]` resolves the target (the latest version tag unless one is given) and exits early when it is already installed. Otherwise it checks the release out into `releases/<version>/` and builds its image while the current one keeps serving. When the release's `supabase.version` differs from the installed pin, it fetches the new stack, keeping `splitrip.env`, and pulls its images. It then applies the new migrations, and only then switches the application to the new image and restarts. A failure at any step before the switch leaves the previous release running and names the step. The previous release's checkout and image are kept, so going back is `update <previous version>`.

Migrations are applied before the switch on the understanding, already held by the MVP, that migrations are additive within a release: the running release tolerates the new schema for the seconds until the switch.

## Risks / Trade-offs

- **An unprivileged LXC running Docker** depends on `nesting` and `keyctl` and occasionally on the host's kernel. → The host script sets both; the installer checks that Docker can start a container before going further and stops with a clear message if not.
- **Self-hosted Supabase is heavy** for a small instance. → 4 GB by default, with unused services left out; the defaults are prompts, not constants.
- **A migration that is not additive** would break the running release during `update`. → The rule is the MVP's; a release that needs otherwise says so in its notes and is updated with the service stopped.
- **A domain that resolves only inside the local network** cannot obtain a certificate by HTTP challenge. → The printed instructions say a DNS challenge is needed in that case; obtaining the certificate stays with the reverse proxy.
- **The repository must be public** for the host script and the installer to fetch it without credentials. → It is published under the AGPL; a private fork would need a token, not covered here.
- **Secrets in one file.** → Root-only, never printed except the Studio credentials at the end of the install, and covered by Proxmox's backups of the container, which are themselves the operator's to protect.

## Migration Plan

This adds a deployment target and touches the application in two contained places: the standalone build and the Supabase clients' cookie name and forwarded address. Changing the cookie name signs out existing sessions once, on the development machine only; nothing is deployed yet. Rollback is not deploying; the application keeps running locally exactly as before.

`add-splitrip-mvp` is revised separately so that its tasks 11.3–11.4 install the local LXC and the external server with this installer instead of Vercel and managed Supabase.

## Open Questions

- The exact Supabase self-hosting commit to pin first; any recent stable one that runs Postgres 17, the version the local stack uses, will do, and moving it later is a one-line change.
