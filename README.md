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

`supabase/seed.sql` loads a trip to play with on every reset: five friends in Alsace over four days
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

A closed trip is read-only, and that is checked on every way there is of writing to one: each
function refuses it, and the two writes that still go through a policy — renaming the trip and
revoking one of its invitations — ask whether it is open. Reopening is the single change a closed
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

`npm run db:test` runs the pgTAP tests over all of it. Each one checks both halves of the same
policy: that the person who belongs can, and that the person who does not cannot.

The activity feed is written by database triggers, not by application code: an audit trail that
depends on every function remembering to write it ends up with gaps, whereas in a trigger it is
impossible to touch an expense without leaving a trace. The author of an entry is the current
session resolved to its participant, so correcting somebody else's expense is attributed to whoever
made the correction. Each entry keeps the author's name and enough detail to stay readable after
what it describes is gone.

## Available scripts

| Script                 | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run dev`          | Runs the development server with hot reloading                    |
| `npm run dev:all`      | Starts the Supabase stack and then the dev server                 |
| `npm run build`        | Produces the production build                                     |
| `npm start`            | Serves the production build                                       |
| `npm run db:start`     | Starts the local Supabase stack in Docker                         |
| `npm run db:stop`      | Stops it                                                          |
| `npm run db:status`    | Shows the service URLs and keys                                   |
| `npm run db:reset`     | Recreates the database from the migrations, discarding local data |
| `npm run db:check`     | Checks that the app environment reaches the Supabase API          |
| `npm run db:test`      | Runs the pgTAP database tests in `supabase/tests/`                |
| `npm test`             | Runs the unit tests once                                          |
| `npm run test:watch`   | Runs the unit tests and re-runs them on change                    |
| `npm run lint`         | Runs ESLint; fails on any warning                                 |
| `npm run lint:fix`     | Runs ESLint and applies the fixes it can                          |
| `npm run typecheck`    | Type-checks the project without emitting output                   |
| `npm run format`       | Formats the project with Prettier                                 |
| `npm run format:check` | Checks formatting without writing                                 |

Before opening a pull request, `npm run lint`, `npm run typecheck` and `npm run format:check` should all pass.

## Code quality

ESLint uses `eslint-config-next/core-web-vitals` plus its TypeScript rules and runs with `--max-warnings 0`, so anything the Next.js config reports as a warning fails the check.

Prettier owns formatting; `eslint-config-prettier` disables the ESLint rules that would conflict with it. Prettier ignores `openspec/`, whose formatting belongs to the `openspec` CLI.

TypeScript runs in strict mode with `noUncheckedIndexedAccess` and the unused-symbol checks enabled.

## Project layout

```
src/app/            Next.js App Router pages and layouts
openspec/           Specifications, design and task breakdown
supabase/           Database migrations and local stack configuration
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
