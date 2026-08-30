# Splitrip

Shared travel expenses, settled in seconds. A mobile-first PWA where travellers join a trip by QR — no account needed — log what they spend, and see in real time who owes whom.

> **Status:** under construction. This README grows alongside the implementation, so it always describes what actually works today.

## What it does

- Create a trip and invite travellers with a link or a QR code. They join by typing a name — no account, no password.
- Log expenses on the go: who paid, how much, and who it is split among (everyone, or just the three who went to that dinner).
- Mark an expense as a contribution when someone picks up the tab as a gift: it counts towards the trip total but creates no debt.
- See at any moment what the trip has cost and who owes whom, with the minimum set of transfers that settles everything.
- Record settlement payments as they happen, so balances stay honest.
- Everything updates in real time across everyone's phones, with an activity feed of who did what.
- Available in Spanish and English, defaulting to Spanish.

Full behaviour is specified under [`openspec/changes/add-splitrip-mvp/specs/`](openspec/changes/add-splitrip-mvp/specs/).

## Tech stack

| Concern                  | Choice                                                  |
| ------------------------ | ------------------------------------------------------- |
| Framework                | Next.js 16 (App Router) with TypeScript in strict mode  |
| Database, auth, realtime | Supabase (Postgres, anonymous auth, Row Level Security) |
| Hosting                  | Vercel                                                  |
| Local development        | Docker                                                  |

The reasoning behind each choice, and the alternatives that were rejected, is in [`design.md`](openspec/changes/add-splitrip-mvp/design.md).

## Requirements

- Node.js 20.9 or newer (`npm install` refuses to run on anything older)
- Docker, running, for the local Supabase stack

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev:all
```

`npm run dev:all` starts the Supabase stack in Docker and then the Next.js dev server. The first run downloads the Supabase images and takes several minutes; later runs take seconds. The application is served at <http://localhost:3000>.

`npm run db:check` verifies that the application environment actually reaches the Supabase API, using the same variables the app reads.

Everything above is verified from a clean clone: `npm install`, `cp .env.example .env.local`, `npm run dev:all`, with nothing else installed globally.

### How local development is put together

The backend runs in Docker; the application runs on your machine. There is no `Dockerfile` and no `docker compose` — see [`design.md`](openspec/changes/add-splitrip-mvp/design.md) for the reasoning behind that and every other technical decision.

`npm run db:start` brings up the whole Supabase stack in containers through the Supabase CLI, which is pinned as a dev dependency so every clone runs the same version:

| Service                   | URL                                                       |
| ------------------------- | --------------------------------------------------------- |
| API gateway               | <http://127.0.0.1:54321>                                  |
| Postgres                  | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio                    | <http://127.0.0.1:54323>                                  |
| Mailpit (captured emails) | <http://127.0.0.1:54324>                                  |

Studio is the fastest way to look at the data: it shows the tables, the RLS policies and the SQL editor.

### Environment variables

Copy `.env.example` to `.env.local`. The values it carries are the local stack defaults: the Supabase CLI generates the same ones on every machine, so they are committed deliberately and are not secrets. Production values are configured in Vercel and never live in the repository.

| Variable                               | What it is                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Base URL of the Supabase API                                                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key; safe in the browser because every table is protected by Row Level Security |

### Resetting the database

`npm run db:reset` recreates the database from the migrations in `supabase/migrations/`, discarding whatever local data you had.

### Sample data

`supabase/seed.sql` loads a trip to play with on every reset, and the account that organises it —
**sonia@splitrip.test / unViajeALaAlsacia** — which is also the one allowed to open new trips
locally. The other four travellers have only the identity their phone was given, which is what the
model expects of a traveller. The trip itself is: five friends in Alsace over four days
of Christmas markets, with the awkward cases already in it — a flat one of them paid for on her own
and asked nobody to share, expenses split among only some of the group, amounts that leave cents
over, and settlement payments already made. The balances it produces sum to exactly zero, so it
doubles as a quick check that nothing is off.

## Data model

The schema lives as versioned SQL migrations in `supabase/migrations/`, applied identically to the
local Docker stack and to production. It is being built up alongside the implementation; today it
covers the tables that bound a trip and the money spent on it:

| Table            | What it holds                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `trips`          | Name, optional dates, base currency, `open`/`closed` state and the frozen closing summary |
| `participants`   | Who takes part in a trip, under what name, with the `admin` or `participant` role         |
| `invitations`    | The links that let someone join: their token, the role they grant, expiry and revocation  |
| `expenses`       | What was spent: description, amount, day, payer, and `shared` or `contribution`           |
| `expense_shares` | What each participant is charged for a `shared` expense                                   |
| `payments`       | Settlement payments from one participant to another                                       |
| `activity`       | The trip feed: who did what and when                                                      |

Rules that must never be bypassed are database constraints rather than application checks, so no
route can forget one: a trip only accepts `EUR` and cannot end before it starts, a summary exists
exactly when the trip is closed — so no trip is closed and left without its figures — two people on
the same trip cannot answer to the same name (ignoring case and
surrounding whitespace), one device identity joins a trip once, and an invitation token is unique
and long enough to carry 128 bits of entropy.

Money follows the same principle. Every amount is an integer number of cents — no floating-point
type ever touches money — and must be strictly positive. A `contribution` counts towards the trip
total but creates no debt, so it can have no shares: that is enforced with a composite foreign key
against the expense type, which also refuses to turn an expense that already has shares into a
contribution. Payers, payees and authors are tied to `(id, trip_id)` of `participants`, so money
cannot move between people from different trips.

A participant carrying expenses or payments cannot be deleted, and neither can the auth identity
behind them: their money would be left dangling. Those checks are `DEFERRABLE`, so deleting a whole
trip is still possible inside a transaction that asks for them to be deferred first.

Splitting an amount is a pure function, tested without a database: integer division of the cents,
with the leftover handed out one by one to the first participants in identifier order. Ordering
rather than chance is what makes a split reproducible — the same expense split twice charges the
same people the same cents — and it is why shares are persisted rather than recomputed on the fly.
Reading an amount somebody typed is a pure function as well: it works on the digits of the string
and never multiplies a decimal number, because `10.55 * 100` is 1054.9999999999999 in floating
point. It accepts either decimal separator, refuses more than two decimals, zero and negatives, and
returns the reason it refused so the interface can say it in the reader's language.

Settling is a pure function too: whoever owes the most pays whoever is owed the most, until nobody
owes anybody.

Both are checked twice over. `npm test` runs the worked examples and, on top of them, property tests
that build hundreds of random trips — any number of participants, expenses split among any subset,
contributions, payments — and assert the two invariants the product rests on: the balances add up to
exactly zero, and the proposed transfers leave nobody owing anybody.

Balances are derived, never stored. The `participant_balances` view sums, for each participant,
what they paid, what the splits charged them and what they have moved in settlement payments, and
reports the net: positive means the group owes them. Because every shared expense is charged in
full to somebody and every payment is both sent and received, the net figures of a trip always sum
to exactly zero. Contributions are reported apart — they add to what the trip cost but put nobody
in debt, their payer included.

Isolation between trips is enforced by Row Level Security, so a route cannot leak one group's
money to another by oversight: every table is readable only by the people who take part in the
trip, resolved through `auth.uid()`. Writing follows the roles — an admin edits the trip, invites,
removes participants and corrects anybody's expense, while a participant may only touch what they
recorded themselves — and a closed trip accepts no change but being reopened. Where the rule spans
more than one row, it is a function rather than a policy that enforces it.

What no policy allows stays denied, which is deliberate for anything spanning more than one row.
An expense and its shares, or a trip and its first admin, are created together or not at all, so
they go through database functions rather than being writable by hand from a client.

### Write functions

Those functions run as `SECURITY DEFINER`, which means Row Level Security is not standing behind
them: each one resolves the caller to their participant and refuses a stranger itself, and each is
executable only by the `authenticated` role.

`create_expense` records an expense and its shares in one transaction. Given nothing but a trip, a
description and an amount it splits among everybody, attributes the payment to whoever recorded it
and dates it today; a payer, a date, a subset to split among and the `contribution` type can all be
given instead.

`update_expense` and `delete_expense` are the only way to correct or remove one — `expenses` has no
`UPDATE` or `DELETE` policy at all. Two things come out of that. An amount can no longer be changed
while its shares still hold the old one, which is the single way the balances could come to lie:
every edit throws the shares away and computes them again from the amount and the split. And the
refusal is audible, where a denial by policy is not: an `UPDATE` that Row Level Security rejects
touches no row and says nothing, so the interface would have no way to tell the reader that they
may only correct their own expenses. On `update_expense` every argument left out means "leave it as
it is", so fixing an amount does not quietly reassign the payer or reset who was in the split.

`record_payment` and `void_payment` do the same for settling up. A payment is history, so it is
never deleted and never edited: recording one is a single row, and correcting a mistake means
voiding it, which leaves the entry and its trace in place while it stops counting towards the
balances. Nothing in either function knows what anybody owes, which is what makes a partial payment
an ordinary payment — the balances simply absorb whatever amount changed hands.

`create_invitation` mints the link an organiser shares. An invitation is a bearer token — whoever
holds it gets into the trip — so its only real protection is that it cannot be guessed, and the
token is therefore not something a client is trusted to choose: `invitations` has no `INSERT` policy
at all, and the function draws 128 bits from pgcrypto's cryptographically secure generator and
encodes them for a URL. Each invitation carries the role its user will join with, so handing over
the organising of a trip is a matter of which link you send, and expires — thirty days by default,
long enough to outlast a trip being planned, short enough that a link left in a chat stops working
before the next one. Only an organiser of an open trip may mint one; a mere participant and a
complete outsider are refused in the same words, so neither learns whether the trip exists.

`join_trip` brings somebody in. It reads an invitation that the person joining cannot read — the
policy on `invitations` serves members only, so an outsider cannot learn that a trip exists by
guessing at tokens — and hands back the participant they became, with the role the invitation
carried. Opening the same invitation again from the same device is how somebody returns to their
trip: it gives them back the participant they already were, and does not rename them.

A name already on the trip is refused, and that refusal has two readings the database cannot tell
apart: a second traveller who happens to share a name, and the same traveller arriving from a new
phone. The interface asks which it is and comes back confirming, at which point the participant is
rebound to the new device. So anybody holding an invitation can claim any name on that trip — the
price of joining without an account, and the reason invitations expire and can be revoked.

`revoke_invitation` and `remove_participant` withdraw access, and they are functions for the same
reason the expense writes are: a refusal by policy touches no row and says nothing, and both of
these have to explain themselves. Revoking is idempotent — two organisers tapping the same button is
not an error — and it touches the invitation and nothing else, so whoever came in through it stays.

Removing somebody refuses whenever money points at them: an expense they paid, a share they are in,
a payment they made or received, or any of those they recorded. An expense whose payer has vanished
is a balance that no longer adds up, and there is no undo for that. The refusal carries the number
of entries in the way as its `DETAIL`, so the interface can say how much is in the way rather than
just that something is. Whoever recorded an entry counts as attached to it too — not because they
owe anything, but because the row points at them, and leaving them out would swap a sentence
somebody can read for a foreign key violation they cannot.

`set_participant_role` moves somebody between the two roles, and carries the rule the whole trip
depends on: it has to keep somebody organising it. The only organiser cannot step down, and cannot
walk out either — those are two routes to the same empty chair, so the check lives in one function
that both of them call rather than being written out twice and drifting apart. Handing over a trip is
therefore promote-then-step-down, in that order. Asking for the role somebody already holds changes
nothing and is not an error, so a double tap is harmless.

In `remove_participant` that check comes last, after the money. A refusal about expenses is final —
no promotion makes it possible — while the empty chair only asks for somebody else to be given the
keys first, and the more useful sentence is the one that closes the door rather than the one that
suggests a door.

`close_trip` ends the trip and freezes it into a summary stored as JSON on the trip itself: what it
cost in all, how much of that was shared and how much was somebody's treat, the cost per person, the
final balance of each traveller, the contributions nobody was asked to share, and every payment
already handed over. Recomputing those figures on each read would let them move the moment somebody
corrected an old expense, which is exactly what a closing summary must not do.

What the snapshot does not hold is the outstanding transfers, and deliberately: turning balances
into transfers is one greedy algorithm that already lives in TypeScript, and a second copy in SQL
would be two versions of one rule waiting to disagree. Derived from balances that are frozen, the
transfers are just as frozen. `reopen_trip` puts the trip back to `open` and drops the summary with
it — a trip taking changes again has no final figures to show — and the next close writes them
afresh.

`create_trip` makes a trip and its first organiser in one go, which is why neither `trips` nor
`participants` accepts an insert from a client. It asks for two names: the trip's, and the
creator's, because creating a trip makes you a participant of it and a participant without a name is
nobody on the list. Reading the list back is the `trip_overview` view, which carries what a list has
to show — state, dates, what has been spent and by how many people — and, running as the invoker,
returns the trips the reader takes part in and no others.

A closed trip is read-only, and that is checked on every way there is of writing to one: each
function refuses it, and the one write that still goes through a policy — renaming the trip — asks
whether it is open. Reopening is the single change a closed
trip accepts, and `reopen_trip` is what makes it. `closed_trip.test.sql` tries all of them as the
organiser, on the reasoning that if the strongest hand on the trip cannot, nobody can.

A rejection carries its own `SQLSTATE`, so the bilingual interface maps a broken rule to its copy
without reading English text:

| Code    | What was refused                                        |
| ------- | ------------------------------------------------------- |
| `42501` | The caller has no standing to do this                   |
| `SP001` | The trip is closed                                      |
| `SP002` | The amount is not a positive number of cents            |
| `SP003` | The currency is not supported in this release           |
| `SP004` | A contribution cannot be split                          |
| `SP005` | A shared expense needs at least one person in its split |
| `SP006` | The split reaches somebody outside the trip             |
| `SP007` | Somebody named in the operation is not on the trip      |
| `SP008` | A payment cannot be made to oneself                     |
| `SP009` | The payment is already voided                           |
| `SP010` | The invitation does not exist, or has been revoked      |
| `SP011` | The invitation has expired                              |
| `SP012` | A name is required to join                              |
| `SP013` | Somebody on the trip already goes by that name          |
| `SP014` | The trip is already in the state it is being moved to   |
| `SP015` | A trip needs a name                                     |
| `SP016` | A trip cannot end before it starts                      |
| `SP017` | Opening a trip needs an account the instance allows     |
| `SP018` | Inviting somebody needs admin permissions               |
| `SP019` | An invitation carries a role that does not exist        |
| `SP020` | An invitation cannot last that long, or that briefly    |
| `SP021` | The participant has expenses attached to them           |
| `SP022` | The participant has payments attached to them           |
| `SP023` | The trip would be left with nobody organising it        |

`npm run db:test` runs the pgTAP tests over all of it. Each one checks both halves of the same
policy: that the person who belongs can, and that the person who does not cannot.

The activity feed is written by database triggers, not by application code: an audit trail that
depends on every function remembering to write it ends up with gaps, whereas in a trigger it is
impossible to touch an expense without leaving a trace. The author of an entry is the current
session resolved to its participant, so correcting somebody else's expense is attributed to whoever
made the correction. Each entry keeps the author's name and enough detail to stay readable after
what it describes is gone.

## Identity

Two kinds of identity, and the policies cannot tell them apart. A traveller joining a trip is signed
in anonymously against Supabase Auth; somebody who opens trips signs in with an email address and a
password. Both are a real `auth.uid()` carrying a genuine JWT and a refresh token, so every policy is
written once and never asks which kind it is looking at, and the participant rows of a trip are bound
to that `uid` either way. The door stays open besides: Supabase can later promote an anonymous user
to a permanent one while keeping its `uid`, and therefore its whole history of trips.

`src/proxy.ts` refreshes whatever session a request already carries — it calls `getUser`, which asks
the auth server rather than trusting whatever the cookie was last set to — and mints none. Handing an
identity to every first page view meant every crawler that reached the deployment took one, and they
pile up in the auth table for nobody's benefit. An identity is issued where one is wanted: signing
in, or opening an invitation. Reading the entry screen costs nothing.

That file is named `proxy.ts` and exports `proxy`. In Next.js 16 the `middleware` convention was
renamed; the behaviour is the same, the name is not.

Signing in is an email address and a password, and there is one message for a wrong password and an
address that does not exist: telling somebody that the address is real turns a sign-in form into a
way of finding out who has an account here.

Opening a trip is the one thing that needs more. `create_trip` refuses an anonymous session, and
refuses an account whose address is not in `trip_creators` — a list the instance keeps. Without it, a
deployment reachable from the public internet, that hands an identity to whoever asks and lets that
identity create data, is somebody else's free hosting waiting to be found.

The list is a table rather than a setting because the platform offers no setting that would do. Its
per-provider switch closes email logins along with email sign-ups, and its global one closes
anonymous sign-ins too, which would take every invitation down with it. A table is better anyway: it
is enforced by the only door into `trips`, it travels in a migration, it can be tested, and somebody
can be allowed before their account exists.

Two powers, deliberately apart: running a trip you were invited to, and opening new ones. An
invitation carrying the `admin` role still makes an account-less traveller an organiser of that trip.

The accepted consequence is that clearing browser data means losing access. The organiser
regenerates an invitation, and rejoining under the same name recovers the participant. Attaching an
email address, which would fix it properly, is out of scope for this release.

### Inviting

`/trips/<id>/invite` is where an organiser mints one. A participant asking for it is given the same
404 as a stranger: who runs a trip is not something a screen should confirm to somebody who cannot
act on it. The screen offers the two roles an invitation can carry, and lists the ones still live —
a revoked or expired invitation is not shown at all, a list of dead links being a list of things to
mistake for working ones.

Each one comes with its link and its QR code, both pointing at `/join/<token>`, and with the
button that takes it back: revoking one stops it letting anybody else in and leaves the people
who already came through it exactly where they are. The link is
absolute, and its origin is read from the request rather than from a setting, so a laptop, a preview
deployment and production each hand out a link back to themselves with nothing to configure. It sits
in a read-only field that selects itself on focus, because the clipboard API needs a secure context
and a phone reading a deployment over plain HTTP would otherwise be left with a button that does
nothing.

Which is also what to do when trying it from a phone: `next dev` listens on the whole network and
prints a `Network:` address next to the local one. Open the application at that address rather than
at `localhost`, and the invitation it hands out carries it, so a phone on the same network reaches
the same server. Nothing else has to be exposed today — every read and write goes through the server,
and the browser never talks to Supabase itself.

The QR is drawn on the server as a single SVG path — one element rather than a thousand rectangles —
and stays dark ink on white whatever the palette is doing. Inverting it in the dark theme would look
considered and would stop scanning on half the phones that tried it.

### Joining

`/join/<token>` asks for a name and says nothing about the trip. It cannot: the policy on
`invitations` serves members only, and a page that greeted a token with the name of a trip would be
a way of finding out which trips exist.

What it does answer on arrival is whether the link still opens anything. `invitation_status` returns
one of four words and nothing else — no name, no date, no trip — runs without a session, because
opening an invitation must cost no identity, and gives revoked and never-existed the same answer, so
neither confirms that a token was ever real. Whoever holds the token could learn as much by using
it. Without that check a dead link rendered a form that looked perfectly usable and only refused
once a name had been sent, which wastes somebody's time and leaves them guessing at what they got
wrong.

The anonymous identity is minted here, at the moment a name is sent, and not when the page is
opened. Following an invitation link costs nothing, and an empty name is refused before the identity
is drawn, so a blank submission leaves no stray user behind either. The database remains the
authority on all of it; the check in front is only about the order things happen in.

A name already on the trip has two readings the database cannot tell apart, so the screen asks
rather than deciding: it reports the clash and offers to carry on as that person, which is how the
same traveller arrives from a second phone. Confirming rebinds the existing participant to the new
device, keeping their role and their history rather than making a second one. The name comes back
from the server and the field is remounted around it, because React empties a form once its action
returns and an offer to continue as somebody would otherwise sit above an empty box.

## Look and feel

The interface is composed the way a printed bill is composed: figures that align themselves in a
tabular column, dotted leaders between a name and its amount, a rule above a subtotal and a double
rule above a total. That double rule is not decoration — it says which figure is the final one. Money
owed reads in red and money owing in plain ink, as accounting has always done it, and never by
colour alone: the sign and the word are always beside it.

The paper is a cool grey with a faint green cast rather than a cream, and the accent is a spruce
green — travel and money, without the blue of a bank. Dark is the same palette lit differently, and
it follows the device: there is no manual switch. Every colour, size and family lives in the
`@theme` block of `src/app/globals.css` and nowhere else, so the palette can be read start to
finish.

Type does three jobs: **Bricolage Grotesque** for the name and screen titles, where its character
shows without getting in the way; **Archivo** for everything that gets read, because it holds up
small and has real tabular figures; **IBM Plex Mono** for what gets checked rather than read —
labels, invitation tokens, table headings.

The app icon is what the product does: three equal parts above, the whole figure below.

### Phone first, desk when there is room

One set of components, whose density answers the viewport. Below `--breakpoint-wide` (48rem) content
stacks into cards and the primary actions sit at the bottom edge, where a thumb reaches without the
hand shifting its grip; above it the same content opens into tables and the actions follow the
content, because on a desktop the bottom of the window is the furthest thing from the pointer.

Density is expressed in CSS, never by branching on a width measured in JavaScript: a component tree
that differs between server and client causes hydration mismatches and makes the first paint wrong.
So a list that reads as cards on a phone and as a table on a desk puts both in the document and lets
CSS decide which one shows. Only one is ever displayed, so only one reaches a screen reader.

`npm run check:viewport -- <url> <width> <height>` drives a real browser against a running dev server
and fails if anything reaches past the viewport, if a control is shorter than 44 pixels, or if the
console complains — a hydration mismatch does not break a page, it only says so in the console,
which is exactly why it survives unnoticed. It refuses
to measure a page that did not load, since a failed navigation still leaves a document behind — the
browser's own error page — and measuring that reports nothing about the application. Neither
can be answered from the markup — both are results of layout — and both are easy to break without
noticing.

### Installing it

`src/app/manifest.ts` is what makes a browser offer to add this to a home screen: a name, a scope, a
set of icons and `display: 'standalone'`, which is the line that drops the address bar. Its colours
are the paper of the light palette rather than the brand green — they paint the window chrome and
the launch screen, and a green frame around a page that is not green reads as a mistake rather than
as branding.

iOS does not read the manifest at all. It takes its own route through the `apple-mobile-web-app-*`
meta tags, and it labels the icon from the title in those rather than from the manifest's name. The
tag that makes it open full screen was renamed to `mobile-web-app-capable`, which Safari has only
read since 16.4, so both names are emitted and an older iPhone keeps working.

The artwork lives once, in `src/app/icon.svg`, and `npm run icons` rasterises it into the four sizes
the home screens want, using the Chrome that `check:viewport` already needs. Four hand-made bitmaps
would drift the first time somebody adjusted the drawing. Three of them differ in more than size:

- the plain 192 and 512 leave the square behind the drawing empty, so their rounded corners are
  transparent and a launcher's own background shows through;
- the maskable one is inset to 72% on a filled ground, because Android crops an icon to whatever
  shape the launcher uses and anything outside the middle circle may not survive it;
- the Apple one is filled too, because iOS masks a square it expects to be opaque, and a transparent
  corner there comes out black.

### Starting fast, and losing the network

`src/app/sw.js/route.ts` serves the service worker from a route rather than from `public/`, so its
cache name carries the application version. That is what makes a release an update: the new worker
invalidates every cache the previous one filled, and nobody has to remember to bump a constant by
hand.

It is deliberately small, because most of what this application serves is not cacheable. Every page
is built for the person reading it, so a cached page would eventually show somebody another person's
trip list — pages are never served from cache, only their failure is handled. What is cacheable is
the build output, which is hashed and therefore immutable: the worker answers those from cache
first, which is what makes the second opening not wait for the network. The one page it keeps whole
is `/offline`, which a navigation falls back to instead of the browser's error page, and which
carries no account state for the same reason.

An update never applies itself. The waiting worker sits there and the reader is told there is a new
version; swapping the code under somebody half-way through typing an expense is not an improvement.
Pressing the button posts to the worker, which steps forward, and the page reloads once.

The worker is registered only in a production build. One caching `/_next/static` while the
development server is hot-reloading serves yesterday's modules, which looks like a bug in whatever
you were working on rather than a bug in the worker. That also means the offline behaviour is tried
with `npm run build && npm start`, not with `npm run dev`.

### When something breaks

A trip's numbers come from a database over a network, and a screen that throws when that fails once
should say so rather than take the page down. `src/app/error.tsx` catches it, offers another go, and
prints the digest so a report can be matched against the server log; `global-error.tsx` does the same
for a failure in the root layout, carrying its own colours because the stylesheet never reaches it;
`not-found.tsx` answers a link that leads nowhere — or to a trip the reader is not part of, which
Row Level Security makes indistinguishable from nowhere, deliberately.

## Interface language

The interface is Spanish and English, defaulting to Spanish. The copy lives in two catalogues under
`src/lib/i18n/`, with no i18n library: with two languages and a small interface, one would weigh
more than it is worth, and `Intl` is already in every browser this targets.

The Spanish catalogue is the source of truth, and its keys define the type the English one has to
satisfy. So a phrase added in Spanish and forgotten in English does not compile, and neither does an
English key that Spanish never had — the check runs in both directions, in `npm run typecheck`.

Which language a reader gets is decided on the server, in this order: the preference they stored,
then the `Accept-Language` the browser sent (honouring its quality values, since a browser writing
`en;q=0.7, es;q=0.9` is stating an order rather than a list), then Spanish. The switcher is a plain
form with a server function behind it, so it works before any JavaScript has loaded, and the choice
is a cookie the server reads on every request.

Amounts and dates are formatted with `Intl` in the active language: 1055 cents read as `10,55 €` in
Spanish and `€10.55` in English. Dates are formatted in UTC, deliberately — a trip date is a civil
date with no time and no zone, and formatting it locally would move a dinner in Reykjavik to the
following day for a reader sitting west of the meridian.

No visible copy is written inline in a component; it all goes through the catalogue from the first
screen. Retranslating an interface that is already built costs far more than building it translated,
and it is a mistake that only shows once it is everywhere.

## Available scripts

| Script                   | What it does                                                      |
| ------------------------ | ----------------------------------------------------------------- |
| `npm run dev`            | Runs the development server with hot reloading                    |
| `npm run dev:all`        | Starts the Supabase stack and then the dev server                 |
| `npm run build`          | Produces the production build                                     |
| `npm start`              | Serves the production build                                       |
| `npm run db:start`       | Starts the local Supabase stack in Docker                         |
| `npm run db:stop`        | Stops it                                                          |
| `npm run db:status`      | Shows the service URLs and keys                                   |
| `npm run db:reset`       | Recreates the database from the migrations, discarding local data |
| `npm run db:check`       | Checks that the app environment reaches the Supabase API          |
| `npm run db:test`        | Runs the pgTAP database tests in `supabase/tests/`                |
| `npm run check:viewport` | Checks a running page for overflow and small touch targets        |
| `npm run icons`          | Rasterises `src/app/icon.svg` into the home-screen PNG sizes      |
| `npm test`               | Runs the unit tests once                                          |
| `npm run test:watch`     | Runs the unit tests and re-runs them on change                    |
| `npm run lint`           | Runs ESLint; fails on any warning                                 |
| `npm run lint:fix`       | Runs ESLint and applies the fixes it can                          |
| `npm run typecheck`      | Type-checks the project without emitting output                   |
| `npm run format`         | Formats the project with Prettier                                 |
| `npm run format:check`   | Checks formatting without writing                                 |

Before opening a pull request, `npm run lint`, `npm run typecheck` and `npm run format:check` should all pass.

## Code quality

ESLint uses `eslint-config-next/core-web-vitals` plus its TypeScript rules and runs with `--max-warnings 0`, so anything the Next.js config reports as a warning fails the check.

Prettier owns formatting; `eslint-config-prettier` disables the ESLint rules that would conflict with it. Prettier ignores `openspec/`, whose formatting belongs to the `openspec` CLI.

TypeScript runs in strict mode with `noUncheckedIndexedAccess` and the unused-symbol checks enabled.

## Project layout

```
src/app/            Next.js App Router pages, layouts and server functions
src/components/     Components shared between pages
src/lib/i18n/       Copy catalogues, language resolution and formatting
src/lib/money/      Splitting, settling and reading amounts
src/lib/supabase/   Browser and server clients
src/proxy.ts        Runs before every request: signs the device in and refreshes its session
openspec/           Specifications, design and task breakdown
supabase/           Database migrations, seed data and pgTAP tests
scripts/            Development and verification scripts
```

## Contributing

The project follows [Conventional Commits](https://www.conventionalcommits.org/) with atomic commits, and [Semantic Versioning](https://semver.org/).

A `commit-msg` hook runs commitlint on every commit, so a malformed message never reaches the history. The accepted types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style` and `test`.

A `pre-commit` hook runs the linter, the type-checker and the unit tests first, so a commit that breaks any of them never happens. The pgTAP database tests are deliberately left out: they need the Docker stack running, and a commit should not depend on that. They run in continuous integration, and locally with `npm run db:test`.

The hook is installed by husky through the `prepare` script, which npm runs automatically after `npm install`. If hooks ever stop firing, `npm run prepare` reinstalls them.

### Releasing

A `0.X.0` tag is published on completing each task group in [`tasks.md`](openspec/changes/add-splitrip-mvp/tasks.md), and `1.0.0` on completing the MVP. A version marks a verifiable functional increment, not an intermediate step.

```bash
npm version minor   # bumps package.json, commits and tags in one step
git push --follow-tags
```

`.npmrc` configures that command to produce a `chore(release): <version>` commit and a bare `0.1.0` tag with no `v` prefix, so releases obey the same rules as every other commit.

`package.json` is the single source of the version: `next.config.ts` reads it at build time and exposes it as `APP_VERSION`, so what the application shows can never drift from what was released.

Everything in this repository is written in English: code, comments, tests, commit messages and documentation. The product interface itself is bilingual and defaults to Spanish.

## Licence

[GNU Affero General Public License v3.0 or later](LICENSE).

Splitrip is free software: you may redistribute and modify it under the terms of the AGPL. The Affero clause matters for a hosted application: anyone who runs a modified version as a network service must make their source available to its users, not only those who redistribute the code.
