## Why

Splitting the cost of a group trip is still done with notes on a phone, chat messages and a spreadsheet somebody maintains once everyone is back home. The result is that nobody knows how much the group has spent while the trip is happening, and settling up gets postponed for weeks.

Splitrip solves exactly that: during the trip, any participant logs an expense in seconds from their phone and everyone immediately sees the trip total and who owes what to whom. It is a PWA deployable on Vercel, with no sign-up friction: you get in through a QR code or a link.

## What Changes

This is the first release of the product. There is no prior code: the change introduces the whole application at its minimum viable scope.

- **Trip management**: create a trip (name, optional dates, base currency), see the list of trips you take part in, and close a trip when it ends.
- **Roles**: every trip has at least one organiser (admin) and N participants. The organiser can invite, remove participants, edit any expense and close the trip. A participant manages their own expenses.
- **Account-free invitations**: the organiser generates an invitation link (and its QR code). Whoever opens it types their name and is in, with the role the invitation carried. The session persists on the device; there are no passwords or email addresses in this release.
- **Expense tracking**: amount, description, date, who paid and who it is split among. Two expense types:
  - `shared`: split equally among the selected participants (all of them by default).
  - `contribution`: paid by one person, adds to the trip total and creates **no debt** — this covers the "this one is on me" case.
- **Partial splits**: an expense can be split among only a subset of participants (the dinner three out of five attended), always equally among those chosen.
- **Status dashboard**: total spent on the trip, per-participant breakdown (how much each has paid against how much they are charged) and each person's net balance.
- **Settlement**: computation of the minimum set of transfers that clears every debt in the group, and recording of payments ("I already paid Ana €40") that updates the balances.
- **Real time and activity**: changes made by any participant are reflected immediately on everyone else's open screens, and the trip keeps a recent activity feed that traces who did what.
- **Organiser views**: the organiser gets a trip dashboard with the total spent, the per-participant breakdown (paid against charged), the split between `shared` and `contribution` spending, spending over time by day, and the full filterable detail of every expense. This is the view that answers "how are we doing?" without opening expenses one by one.
- **Closing summary**: closing the trip freezes a summary that **every participant** can consult: trip total, cost per person, what each person put in, the contributions that were not split, and the final settlement with the state of each payment. A closed trip becomes read-only and its summary stays available permanently.
- **Bilingual (Spanish / English)**: the whole interface is translated into Spanish and English. The default language is Spanish; the application detects the device language and the user can change it manually at any time.
- **Two usage contexts, one application**: the trip is prepared on a laptop and lived on a phone. Before departure the organiser sits at a desktop browser entering the bookings and upfront costs, which is a different interaction from logging a single dinner in a bar. The interface adapts its density to the viewport — stacked cards and thumb-reachable navigation on a phone, dense tables and more information per screen on a desktop — and the organiser gets a rapid successive-entry flow that only appears on large screens.
- **Installable PWA**: installable to the home screen on iOS and Android, with a cached shell so it opens fast.

### Out of scope for this release

Decisions taken explicitly, to bound the first release:

- **Web Push** (notifications with the app closed). Real-time sync and the activity feed cover the dominant use case — the group is travelling together with the app at hand — while push on iOS requires the PWA to be installed and remains fragile. Deferred to phase 2.
- **Multi-currency in the interface**. This release operates in euros only, but the data model stores currency and amount from day one so that adding conversion later does not force a migration of the expenses already recorded.
- **Receipt photos** attached to an expense.
- **Percentage or uneven splits** (beyond excluding participants from an expense).
- **Cross-device access recovery** by email. If a participant loses their device, the organiser regenerates an invitation for them.
- **Offline writes**. The PWA caches the shell so it starts fast, but recording an expense requires a connection.

## Capabilities

### New Capabilities

- `trip-management`: the life cycle of a trip (creation, basic data, participants, admin/participant roles, closing) and a person's trip list.
- `trip-invitations`: generation of invitation links and QR codes, joining without an account by providing a name, device-bound identity, invitation revocation and participant removal.
- `expense-tracking`: creation, editing and deletion of a trip's expenses, with payer, type (`shared` / `contribution`), the set of participants it is split among, and an amount with a currency.
- `balance-settlement`: per-participant balance computation from the expenses, a settlement proposal with the minimum number of transfers, and recording of payments that clear debt.
- `trip-reporting`: aggregate trip views — the organiser dashboard with totals and breakdowns, and the frozen closing summary every participant can consult.
- `realtime-activity`: real-time propagation of trip changes to connected clients, and the recent activity feed.
- `localization`: bilingual Spanish/English interface, with Spanish as the default, device language detection, a persistent manual switch, and amount and date formatting per the active language.
- `pwa-shell`: installability on a phone, the manifest, the shell service worker, and the responsive behaviour of the interface across the phone and desktop contexts.

### Modified Capabilities

None. The project has no prior specs.

## Impact

- **Repository**: new project. The whole codebase is introduced: Next.js (App Router) deployed on Vercel, in TypeScript.
- **Data and backend**: Supabase — Postgres for the data model, Realtime for change propagation and Row Level Security for isolation between trips. Tables are created for trips, participants, invitations, expenses, expense shares, payments and activity.
- **Authentication**: no identity provider is used. The session is a participant token issued on accepting the invitation and stored on the device; authorisation rests on that token against the RLS policies.
- **New dependencies**: the web framework and the Supabase client, a QR generation library, and a decimal arithmetic utility for monetary amounts (amounts are stored as integer cents to avoid floating-point errors).
- **Local development**: the whole environment runs in Docker. The Supabase stack (Postgres, Realtime, Studio, API) comes up in containers through the Supabase CLI, and the web application runs in its own container, orchestrated with `docker compose`. A developer clones the repository and starts with a single command, with no dependency on a remote project.
- **Operations**: deployment on Vercel, a managed Supabase project for production, and environment variables for both. Database migrations live in the repository and are applied to both the local Docker environment and the remote one. No cost on the free tiers at the expected volume.
- **Main risk**: the account-free model means anyone holding the invitation link can enter the trip. This is mitigated with revocable and expiring invitations and with participant removal, but it is a deliberate product decision in favour of zero friction.
