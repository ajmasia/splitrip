# Changelog

All notable changes to Splitrip are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each release lists every change that reaches whoever uses or deploys the application: features
under **Added**, corrections under **Fixed**, and changes to how it is built or run under
**Changed**. Documentation, tests and planning live in the commit history.

## [Unreleased]

### Added

- A self-hosted installer: one command on a Proxmox host creates a Debian 13 container and installs
  in it, natively and without Docker, Supabase's services at pinned versions, the migrations, a
  first account allowed to open trips and the application, all started on boot. It also installs on
  any Debian 13 machine, and prints what to configure in the reverse proxy. See
  [the deployment guide](docs/deployment.md).
- An `update` command on the instance, which moves it to the latest release or to one asked for,
  preparing everything while the running release keeps serving and keeping every secret and
  session.

### Changed

- The deployment target is now a self-hosted instance on Proxmox, first in an LXC on the local
  network and then on an external server, instead of Vercel with a managed Supabase project.
  The in-app feedback is planned, not yet built.
- The application builds as a standalone server, and the browser and the server share one session
  cookie name, so a server that reaches Supabase at an internal address reads the browser's session.
  Existing sessions on a development machine are signed out once.
- The limits on anonymous sign-ins count each visitor's address, forwarded by the server, rather
  than the server's own.

## [0.12.0] - 2026-10-02

The organiser's dashboard, and closing a trip. The organiser gets a dashboard of the trip, what it
spent day by day and every expense filtered and sorted; a trip can be closed into a summary every
participant can read, and reopened if need be. Exporting the summary waits for how the first
groups use it.

### Added

- An organiser's dashboard of the trip: total spent, how much of it is split and how much was a
  treat, the number of expenses, the cost per person, and everybody's accounts with every term of
  the sum on show.
- What the trip spent each day, as a chart that folds long stretches with nothing spent into one
  row, with a table view.
- Every expense of the trip for the organiser, filtered by who paid or by type, sorted by date or
  amount, with the total of what is listed.
- A participant who reaches an organiser's screen is told it is the organiser's and pointed at the
  balances.
- Closing a trip from its screen, with a confirmation, and reopening it.
- A closing summary every participant can read: the total, the cost per person, where each of
  them ended, the treats and who made them, what is still to be handed over and every payment
  with its state.

### Fixed

- The frozen cost per person rounds to the nearest cent, as the rest of the application does,
  instead of truncating.

## [0.11.1] - 2026-10-02

### Fixed

- Invitation links made while running the trip at `localhost` open on a phone on the same wifi:
  the development server hands them out at the machine's network address.

### Changed

- `fast-uri` bumped to 3.1.8 in the lockfile.

## [0.11.0] - 2026-08-30

Invitations that can be taken back.

### Added

- An invitation can be taken back where it was handed out, and the invitations screen says what
  revoking does and does not do.

### Fixed

- A link can no longer lock an organiser out of their own trip.
- A place that cannot be taken offers the way in that works.
- The button to hand somebody the application is not offered beside a place held by an account.

## [0.10.0] - 2026-08-30

Participants without the application, and their own invitations.

### Added

- A statement for every participant, so a balance can be taken apart line by line.
- An organiser can add somebody who will never open the application, by name alone.
- Joining tells an empty place apart from somebody else's seat.
- A link that opens one particular place, handed over on the spot as a link and a QR code.

### Fixed

- Inviting somebody again leads somewhere.
- The development build is served to a phone on the same wifi.
- The browser reaches Supabase at an address it can actually reach.
- A real-time channel no longer complains on its way out.
- The real-time socket is opened as the reader, not as a stranger.
- A refused removal says which of its two reasons stopped it.

## [0.9.0] - 2026-08-30

Real time and activity.

### Added

- A trip opens on the three figures that describe it: spent, per person and not split.
- Light and dark appearance, chosen by the reader or left to their device.
- A trip corrects itself on every screen at once.
- The screen says when it has stopped listening, and catches up when it starts again.
- The activity feed, showing who did what.
- A count of what happened while the reader was looking elsewhere.

### Changed

- The sample trip no longer uses addresses from the author's address book.
- The production build is served on its own port.

## [0.8.0] - 2026-08-30

Balances and settlement.

### Added

- Where the accounts stand, and what the reader owes or is owed.
- The transfers that close the trip.
- Recording a payment from the line it settles.
- The payment history, with a wrong payment taken back without losing its trace.

## [0.7.0] - 2026-08-30

The interface foundation and the expenses, released together; there is no 0.6.0.

### Added

- An installable application: the manifest and the icons a home screen wants.
- A cached shell, and a notice when the network is gone.
- The trip's expenses, newest first.
- Recording an expense with only a description and an amount.
- Choosing the payer as an organiser, and the people in the split as anybody.
- Recording what one person treats the group to.
- Entering a pile of receipts in a row without leaving the form.
- Opening an expense to correct it or take it back out.
- The desk affordances offered by role on the server and by width in CSS.

### Fixed

- The record action sits where the pointer already is on a desk.

## [0.5.0] - 2026-08-30

### Added

- The interface in Spanish and English.
- Creating a trip together with its first organiser, and the list of trips you take part in.
- Only an allowed account can open a trip.
- Signing in to open trips, with no identity minted for a mere visit.
- A failed screen is caught instead of taking the page down.
- The invitation link, with a token nobody can guess, and its QR code.
- Joining a trip by typing a name and nothing else.
- Taking an invitation back, and taking somebody off the trip.
- Moving somebody between roles, always keeping an organiser.
- The interface's own palette and type.

### Fixed

- A dead link says so on opening it, not after a name is typed.
- The viewport check refuses to measure a page that did not load.

### Changed

- A check of a page for overflow and small touch targets, which fails when the console complains.

## [0.4.0] - 2026-08-30

### Added

- Recording an expense and its shares in one operation.
- Correcting and removing an expense.
- Recording and voiding settlement payments.
- Joining a trip through an invitation.
- Closing a trip into a frozen summary, and reopening it.

### Fixed

- Every write against a closed trip is refused.

## [0.3.0] - 2026-08-30

### Added

- Splitting an amount into exact shares in cents.
- The transfers that settle a trip.
- Reading and showing amounts in the interface.

### Changed

- A sample trip for local development.
- Unit tests, and lint, types and tests run before every commit.

## [0.2.0] - 2026-08-30

### Added

- The trips, participants and invitations tables.
- The expenses, shares and payments tables.
- The trip's activity, recorded by database triggers.
- Trips isolated from each other by row level security on reads.
- Writes restricted by role and trip state.
- Participant balances derived from a view.

## [0.1.0] - 2026-08-30

### Added

- The Next.js application in strict TypeScript.

### Changed

- ESLint, Prettier and a type-check script.
- Conventional commits enforced, and the application version exposed.
- The local Supabase stack, and a single command that starts it with the application.
- Installs refused on unsupported Node versions.

[Unreleased]: https://github.com/ajmasia/splitrip/compare/0.12.0...HEAD
[0.12.0]: https://github.com/ajmasia/splitrip/compare/0.11.1...0.12.0
[0.11.1]: https://github.com/ajmasia/splitrip/compare/0.11.0...0.11.1
[0.11.0]: https://github.com/ajmasia/splitrip/compare/0.10.0...0.11.0
[0.10.0]: https://github.com/ajmasia/splitrip/compare/0.9.0...0.10.0
[0.9.0]: https://github.com/ajmasia/splitrip/compare/0.8.0...0.9.0
[0.8.0]: https://github.com/ajmasia/splitrip/compare/0.7.0...0.8.0
[0.7.0]: https://github.com/ajmasia/splitrip/compare/0.5.0...0.7.0
[0.5.0]: https://github.com/ajmasia/splitrip/compare/0.4.0...0.5.0
[0.4.0]: https://github.com/ajmasia/splitrip/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/ajmasia/splitrip/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/ajmasia/splitrip/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/ajmasia/splitrip/releases/tag/0.1.0
