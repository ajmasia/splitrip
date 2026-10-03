# Deploying Splitrip

A Splitrip instance runs on one Debian 13 machine: a container on a Proxmox host, or any Debian 13
server. Everything runs natively, as the machine's own services, with no Docker: PostgreSQL,
Supabase's Auth, PostgREST, Realtime, Studio and postgres-meta, an nginx gateway in front of them,
and the application. One command installs it all; another, `update`, keeps it up to date.

TLS stays with the reverse proxy you already have. The installer configures no proxy and obtains no
certificate; when it finishes it prints exactly what to create there.

Why it is built this way is in the
[design](../openspec/changes/add-self-hosted-deployment/design.md).

## Requirements

- **A Proxmox VE host**, to create the container with the host script; or a **Debian 13 machine**,
  amd64, with nothing else on it, to run the installer directly.
- For the container's defaults: 2 cores, 4 GB of memory, 1 GB of swap and 20 GB of disk. Most of
  the memory is for building the application; the running instance uses much less.
- **Two domains**: one for the application (`splitrip.example.com`) and one for its API, by
  default the same with `api.` in front (`api.splitrip.example.com`). Both must point at the
  reverse proxy.
- **A reverse proxy** that terminates TLS, such as Nginx Proxy Manager, able to reach the machine.
- Internet access from the machine during the install and every update: it fetches the release
  from GitHub, Debian's packages, the pinned components and the application's dependencies.

## Installing

### From the Proxmox host

On the Proxmox host's shell, as root:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/ajmasia/splitrip/main/deploy/proxmox/splitrip-lxc.sh)"
```

It asks six things, each with a default you can accept with Enter:

| Question                  | Default                                         |
| ------------------------- | ----------------------------------------------- |
| Container identifier      | the next free one                               |
| Network bridge            | `vmbr0`                                         |
| Address                   | `dhcp`                                          |
| Storage for the container | `local-lvm`, or the first that holds containers |
| Cores                     | `2`                                             |
| Memory                    | `4096` MB, and no less than `2048`              |

A fixed address is given with its prefix length, `192.168.1.50/24`, and then the gateway is asked
for. An identifier already used by a container or a virtual machine is refused before anything is
created.

The script creates an unprivileged Debian 13 container, started on boot, and runs the installer
inside it, which asks its own questions (below). Building the application is what needs the
memory; the running instance uses much less. `SPLITRIP_CORES` and `SPLITRIP_MEMORY` (in MB) change
the defaults offered, and the rest can be changed ahead in the environment: `SPLITRIP_SWAP` (in
MB), `SPLITRIP_DISK` (in GB), `SPLITRIP_HOSTNAME` and `SPLITRIP_TEMPLATE_STORAGE`.

Give the container a fixed address, either here or as a reservation in your router: the reverse
proxy forwards to it.

### On a Debian 13 machine

As root:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/ajmasia/splitrip/main/deploy/install.sh)"
```

### The installer's questions

1. **The application's domain**, such as `splitrip.example.com`.
2. **The API's domain**, proposed as `api.` followed by the first.
3. **The first account's email and password.** This release has no sign-up screen, so the first
   organiser is created here, already confirmed and allowed to open trips. The password must have
   at least 6 characters.

Anything that is not a valid domain, an email address or a long enough password is asked again.

The latest release is installed. To install another, set `SPLITRIP_VERSION=0.13.0` before the
command; the host script passes it on to the installer.

### If a step fails

The installer names the step that failed and stops. Fix the cause, often a network problem, and run
the same command again: it picks up where it stopped, keeps the secrets it already generated, and
never installs anything twice. Run on a machine where an instance is already installed, it refuses
and points to `update`.

If the host script fails while installing, the container already exists. Finish the install from
the Proxmox host, which runs the installer inside the container:

```bash
pct exec <id> -- bash -c "$(curl -fsSL https://raw.githubusercontent.com/ajmasia/splitrip/main/deploy/install.sh)"
```

The installer refuses to run on the Proxmox host itself.

## Publishing it through the reverse proxy

At the end the installer prints what to create. In Nginx Proxy Manager, add two proxy hosts:

| Domain                     | Forward to                      | Websockets | SSL                      |
| -------------------------- | ------------------------------- | ---------- | ------------------------ |
| `splitrip.example.com`     | `http://<machine address>:3000` | off        | certificate, force HTTPS |
| `api.splitrip.example.com` | `http://<machine address>:8000` | **on**     | certificate, force HTTPS |

Websockets must be on for the API: real time, which shows each change on everybody's phones without
reloading, cannot connect otherwise.

A domain that resolves only inside your local network cannot get its certificate through the HTTP
challenge, since Let's Encrypt cannot reach it. Use a DNS challenge for it in the proxy.

Publish nothing else. Port 8001 is Supabase Studio, the database's admin console, and stays on the
local network.

When both hosts are in place, open the application's domain on a phone: it loads over HTTPS, can be
installed as an app, and the first account signs in at `/sign-in`.

The reverse proxy must add the visitor's address to `X-Forwarded-For`, which Nginx Proxy Manager
does. The per-address limits on joining a trip count each visitor by it, and they trust it only
from local and private addresses, so the proxy has to reach the machine from one.

## What runs on the machine

Everything lives in `/opt/splitrip`:

| Path                           | What it is                                          |
| ------------------------------ | --------------------------------------------------- |
| `splitrip.env`                 | every secret and setting; root only                 |
| `env/`                         | each service's share of it; root only               |
| `releases/<version>/`          | each installed release, built                       |
| `current`                      | the release running                                 |
| `components/<name>/<version>/` | each Supabase component, at every version installed |
| `state`                        | the release installed                               |

The services, all started on boot:

| Service             | What it is                     | Listens on         |
| ------------------- | ------------------------------ | ------------------ |
| `splitrip-app`      | the application                | `3000`             |
| `nginx`             | the gateway: API and Studio    | `8000`, `8001`     |
| `splitrip-auth`     | Supabase Auth                  | `127.0.0.1:9999`   |
| `splitrip-rest`     | PostgREST                      | `127.0.0.1:3001`   |
| `splitrip-realtime` | Supabase Realtime              | `4000`, local only |
| `splitrip-meta`     | postgres-meta, for Studio      | `127.0.0.1:8080`   |
| `splitrip-studio`   | Supabase Studio                | `127.0.0.1:3002`   |
| `postgresql`        | the database                   | `127.0.0.1:5432`   |
| `splitrip-firewall` | keeps the internal ports local |                    |

`systemctl status splitrip-app` shows how one is doing, and `journalctl -u splitrip-app` its logs.

## Studio

Supabase Studio is at `http://<machine address>:8001`, from the local network only. It asks for the
user and password the installer printed, which are also in `/opt/splitrip/splitrip.env`
(`STUDIO_USERNAME`, `STUDIO_PASSWORD`).

## Trip creators and operators

Only an address on the `trip_creators` list can open trips; the installer puts the first account
there. To let somebody else open them, create their account and add their address. In Studio's SQL
editor:

```sql
insert into public.trip_creators (email, note)
values ('somebody@example.com', 'Organises the summer trip');
```

Their account is created in Studio's Authentication section, with **Auto Confirm User** ticked.
The address can be added before the account exists.

Operators, the people who read the instance's feedback, are added the same way to
`public.instance_operators`, once a release that has them is installed. The first account is made
an operator when the table exists at install time.

## Updating

At the machine's console, as root:

```bash
update
```

In a Proxmox container, run it from the host. `pct exec` runs commands with a short `PATH` that
leaves out `/usr/local/bin`, so give the full path:

```bash
pct exec <id> -- /usr/local/bin/update
```

It moves the instance to the latest release published since the one it runs, and says which version
it moved from and to. When there is none, it says so and changes nothing. An instance on a release
candidate, such as `0.13.0-rc.6`, also moves to newer candidates; one on a release never does.

To move to a particular release, newer or older:

```bash
update 0.14.0
```

While it works, the instance keeps serving: the new release is fetched and built, the components
whose pinned version changed are installed beside those in use, and the new migrations applied.
Only then does it switch and restart the services, which takes a few seconds. Every trip, account
and session survives, and the configuration file is never touched.

If a step fails before the switch, the instance keeps running the release it had, and `update`
names the step. Fix the cause and run it again.

Every release installed stays on the machine, so going back is `update <previous version>`. Going
back leaves the newer release's migrations applied, which is safe because migrations only ever add.

## Backing up

Proxmox's own backups of the container cover everything: the database, the configuration and its
secrets, and every release. In the Proxmox web interface, under **Datacenter → Backup**, add a job
for the container; **Snapshot** mode backs it up without stopping it.

The backups hold every secret of the instance, so keep them where only you can reach them.

Restoring one gives back the instance exactly as it was at that moment.
