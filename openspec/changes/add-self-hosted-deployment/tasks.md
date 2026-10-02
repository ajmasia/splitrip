## 1. The application, ready to be deployed

- [ ] 1.1 Build the application as a standalone server and add the production `Dockerfile` taking the two public values as build arguments and running as a non-root user; verify that `npm run build` still passes, that the image builds with sample values, and that a container from it serves the public entry page
- [ ] 1.2 Give the browser and server Supabase clients one explicit session cookie name and let the server use a server-only internal Supabase address when one is set; verify with a unit test that both clients agree on the cookie name, and in the development environment that signing in, joining a trip and real time still work with the internal address unset
- [ ] 1.3 Forward the visitor's address from the incoming request on the server-side Supabase client's Auth calls; verify with a unit test that the address is taken from the request's forwarding header and that a request without one forwards nothing

## 2. Supabase on a Debian host

- [ ] 2.1 Pin Supabase's self-hosting release in `deploy/supabase.version`, fetch its stack at that pin, leave out storage, the image proxy and edge functions through a compose override, and generate every secret into a root-only configuration file; verify on a fresh Debian LXC that every remaining service reports healthy, that the file is mode `600`, and that two generations share no secret and none matches the local development values
- [ ] 2.2 Add the gateway in front of Kong forwarding only the Auth, REST and real-time paths, with websocket upgrade; verify that Auth's health endpoint and a REST call answer through it, that a real-time subscription connects through it, and that Studio and any other path answer not-found through it while Studio stays reachable on Kong's port with the generated credentials
- [ ] 2.3 Configure Auth from the stack's environment — site address, the single allowed redirect, external API address, anonymous sign-ins on, confirmations off, no mail server — and settle public email sign-up; verify that an anonymous sign-in and a password sign-in both succeed, record in `design.md` whether email sign-up could be turned off, and verify that the sample organiser's address is refused if it tries to sign up

## 3. The installer

- [ ] 3.1 Write `deploy/install.sh` with its prompts — application domain, API domain proposed from it, first account's email and password — validating each, refusing to run over an existing instance and stopping with the failed step named; verify that invalid domains and short passwords are asked again, that a second run on an installed host points to `update`, that a run interrupted midway can be run again to completion, and that `shellcheck` reports nothing
- [ ] 3.2 Apply the repository's migrations with the pinned Supabase CLI and never the seed; verify that the database's migration history lists every migration in the repository and that a fresh instance has no trips and no accounts besides the first
- [ ] 3.3 Create the first account through Auth's admin endpoint, confirmed, and add its address to the trip creators and, when the table exists, the operators; verify that the account signs in at the application's domain and creates a trip
- [ ] 3.4 Build and run the application image on the stack's network with restart on boot; verify that after rebooting the host the application, the gateway and every Supabase service answer again without intervention
- [ ] 3.5 Print at the end the reverse proxy instructions for both domains — target address and port, websockets on the API domain, a certificate for each, a DNS challenge when the domain resolves only locally — and the Studio address and credentials; configure Nginx Proxy Manager from them and verify from a phone that the application loads over HTTPS, installs as a PWA, a participant joins a trip and a change on another device appears without reloading
- [ ] 3.6 Verify the per-visitor rate limit on the running instance: with the hourly anonymous limit lowered for the test, exhaust it from one address and check that a second address can still join a trip and that the first is refused; restore the limit afterwards
- [ ] 3.7 Write the deployment guide — requirements, installing from the Proxmox host or on a plain Debian host, the reverse proxy step, adding trip creators and operators, backing up with Proxmox's own backups — and link it from the README; verify by installing a second instance following only the guide

## 4. The Proxmox host script

- [ ] 4.1 Write `deploy/proxmox/splitrip-lxc.sh`: check it runs on a Proxmox host, ask for identifier, bridge, address and storage with their defaults, refuse an identifier already in use, create the unprivileged Debian LXC with nesting and keyctl, and run the installer inside it; verify on the Proxmox host that a run with every default ends in a working instance, that an identifier in use is refused before anything is created, that running it elsewhere is refused, and that `shellcheck` reports nothing

## 5. The `update` command

- [ ] 5.1 Write `deploy/update.sh`, installed as `update`, that resolves the target release, exits early when already there, builds the new release while the current one serves, applies new migrations, switches and restarts, reporting both versions; verify by installing an older release with data and sessions, running `update`, and checking that the latest release runs, every trip and account is intact, an existing session is still valid and the configuration file is unchanged; and that a second run says it is up to date
- [ ] 5.2 Make `update <version>` move to a given release and leave the previous release's checkout and image in place; verify moving forward to a named release and back to the previous one
- [ ] 5.3 Make `update` move the Supabase stack when the target release pins a newer one, keeping the configuration file; verify with a release whose pin differs that the stack is replaced, every service is healthy and the data is intact
- [ ] 5.4 Stop `update` before the switch when any earlier step fails; verify with a release whose build is made to fail that the previous release keeps serving and the failed step is named
- [ ] 5.5 Document `update` in the deployment guide; verify by updating an instance following only the guide
