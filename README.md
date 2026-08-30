# Splitrip

Shared travel expenses, settled in seconds. A mobile-first PWA where travellers join a trip by QR — no account needed — log what they spend, and see in real time who owes whom.

> **Status:** under construction. This README describes what actually works today.

## What it does

- Create a trip and invite travellers with a link or a QR code. They join by typing a name — no account, no password.
- Log expenses on the go: who paid, how much, and who it is split among (everyone, or just the three who went to that dinner).
- Mark an expense as a contribution when someone picks up the tab as a gift: it counts towards the trip total but creates no debt.
- See at any moment what the trip has cost and who owes whom, with the minimum set of transfers that settles everything.
- Record settlement payments as they happen, so balances stay honest.
- Everything updates in real time across everyone's phones, with an activity feed of who did what.
- Available in Spanish and English, defaulting to Spanish.

## Where things are written down

This file is operational: how to run the project and how to work on it. What it does and why it does
it that way live elsewhere.

| Question                                                     | Where                                                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| What the product must do, requirement by requirement         | [`openspec/changes/add-splitrip-mvp/specs/`](openspec/changes/add-splitrip-mvp/specs/) |
| Why each technical decision was taken, and what was rejected | [`design.md`](openspec/changes/add-splitrip-mvp/design.md)                             |
| What is built and what is left                               | [`tasks.md`](openspec/changes/add-splitrip-mvp/tasks.md)                               |
| Why a particular line of code is the way it is               | the comment next to it                                                                 |

## Tech stack

| Concern                  | Choice                                                  |
| ------------------------ | ------------------------------------------------------- |
| Framework                | Next.js 16 (App Router) with TypeScript in strict mode  |
| Database, auth, realtime | Supabase (Postgres, anonymous auth, Row Level Security) |
| Hosting                  | Vercel                                                  |
| Local development        | Docker                                                  |

## Requirements

- Node.js 20.9 or newer (`npm install` refuses to run on anything older)
- Docker, running, for the local Supabase stack

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev:all
```

`npm run dev:all` starts the Supabase stack in Docker and then the Next.js dev server. The first run
downloads the Supabase images and takes several minutes; later runs take seconds. The application is
served at <http://localhost:3000>.

`npm run db:check` verifies that the application environment actually reaches the Supabase API, using
the same variables the app reads.

The backend runs in Docker; the application runs on your machine. There is no `Dockerfile` and no
`docker compose`. `npm run db:start` brings up the whole Supabase stack through the Supabase CLI,
which is pinned as a dev dependency so every clone runs the same version:

| Service                   | URL                                                       |
| ------------------------- | --------------------------------------------------------- |
| API gateway               | <http://127.0.0.1:54321>                                  |
| Postgres                  | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio                    | <http://127.0.0.1:54323>                                  |
| Mailpit (captured emails) | <http://127.0.0.1:54324>                                  |

Studio is the fastest way to look at the data: it shows the tables, the RLS policies and the SQL
editor.

### Environment variables

Copy `.env.example` to `.env.local`. The values it carries are the local stack defaults: the Supabase
CLI generates the same ones on every machine, so they are committed deliberately and are not secrets.
Production values are configured in Vercel and never live in the repository.

| Variable                               | What it is                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Base URL of the Supabase API                                                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key; safe in the browser because every table is protected by Row Level Security |

### Resetting the database

`npm run db:reset` recreates the database from the migrations in `supabase/migrations/`, discarding
whatever local data you had.

### Sample data

`supabase/seed.sql` loads a trip to play with on every reset — five friends in Alsace over four days
of Christmas markets — and the account that organises it:

**sonia@splitrip.test / unViajeALaAlsacia**

That is also the only account allowed to open new trips locally. The other four travellers have just
the identity their phone was given. The trip carries the awkward cases on purpose: a flat one of them
paid for alone and asked nobody to share, expenses split among only some of the group, amounts that
leave cents over, and settlement payments already made. Its balances sum to exactly zero, so it
doubles as a quick check that nothing is off.

The trip screen opens on it with **1702,65 € spent, 161,53 € per person and 895,00 € not split**:
the average divides the 807,65 € that are actually shared, not the total, because the two
contributions charge nobody.

These are the figures the balances screen must show for it, worked out from the seed by hand:

| Who       | Fronted  | Charged  | Balance    |
| --------- | -------- | -------- | ---------- |
| Francisca | 43,72 €  | 169,23 € | −275,51 €  |
| Marta     | 219,73 € | 151,20 € | +168,53 €  |
| Sonia     | 81,50 €  | 141,45 € | −9,95 €    |
| Virginia  | 137,70 € | 176,55 € | −38,85 €   |
| Yvonne    | 325,00 € | 169,22 € | +155,78 €  |
| **Sum**   |          |          | **0,00 €** |

Francisca is deepest in the red despite paying for the flat: those 800 € are a contribution, which
counts towards what the trip cost and puts nobody in debt.

And this is the settlement it must propose — four transfers, one fewer than the five people with
something outstanding:

```
Francisca pays Marta    168,53 €
Francisca pays Yvonne   106,98 €
Virginia pays Yvonne     38,85 €
Sonia pays Yvonne         9,95 €
```

### Trying it from a phone

`next dev` listens on the whole network and prints a `Network:` address next to the local one. Open
the application at that address rather than at `localhost`: an invitation link carries the host it
was created from, so one made at `localhost` is useless on a phone.

Installing to a home screen and the offline behaviour need a secure context, which plain HTTP over
the local network is not. Try those at `http://localhost:3000` after `npm run build && npm start`, or
on the deployed instance.

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

Before opening a pull request, `npm run lint`, `npm run typecheck` and `npm run format:check` should
all pass.

## When something does not work

**Every page fails with `JWT issued at future`.** The PostgREST container's clock has drifted from
the host, which Docker Desktop does after the machine sleeps. Restart it:

```bash
docker restart supabase_rest_splitrip
```

**A change is not showing up.** The dev server sometimes serves a server component from before the
edit. Stop it, start it again, and hard-reload the page.

**A page throws.** `src/app/error.tsx` catches it and prints a digest that can be matched against the
server log; `global-error.tsx` does the same for the root layout. A `404` on a trip means either that
the link leads nowhere or that you are not part of that trip — Row Level Security makes the two
indistinguishable, deliberately.

## Interface language

The interface is Spanish and English, defaulting to Spanish. The copy lives in two catalogues under
`src/lib/i18n/`, and no visible string is written inline in a component.

The Spanish catalogue is the source of truth and its keys define the type the English one has to
satisfy, so a phrase added to one and forgotten in the other does not compile. `npm run typecheck`
is the check.

Which language a reader gets is decided on the server: the preference they stored, then the browser's
`Accept-Language`, then Spanish.

## Code quality

ESLint uses `eslint-config-next/core-web-vitals` plus its TypeScript rules and runs with
`--max-warnings 0`, so anything the Next.js config reports as a warning fails the check.

Prettier owns formatting; `eslint-config-prettier` disables the ESLint rules that would conflict with
it. Prettier ignores `openspec/`, whose formatting belongs to the `openspec` CLI.

TypeScript runs in strict mode with `noUncheckedIndexedAccess` and the unused-symbol checks enabled.

## Project layout

```
src/app/            Next.js App Router pages, layouts and server functions
src/components/     Components shared between pages
src/lib/i18n/       Copy catalogues, language resolution and formatting
src/lib/money/      Splitting, settling and reading amounts
src/lib/supabase/   Browser and server clients
src/lib/trips/      Reads and helpers for trips, expenses and invitations
src/proxy.ts        Runs before every request, refreshing the session it carries
openspec/           Specifications, design and task breakdown
supabase/           Database migrations, seed data and pgTAP tests
scripts/            Development and verification scripts
```

Writes that touch more than one row go through Postgres functions in `supabase/migrations/`, invoked
over RPC; reads go straight to tables and views, protected by Row Level Security. Each function
refuses with its own `SQLSTATE`, which `src/lib/errors.ts` maps to translated copy.

## Contributing

The project follows [Conventional Commits](https://www.conventionalcommits.org/) with atomic commits,
and [Semantic Versioning](https://semver.org/).

A `commit-msg` hook runs commitlint on every commit, so a malformed message never reaches the
history. The accepted types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`,
`revert`, `style` and `test`.

A `pre-commit` hook runs the linter, the type-checker and the unit tests first, so a commit that
breaks any of them never happens. The pgTAP database tests are deliberately left out: they need the
Docker stack running, and a commit should not depend on that. They run in continuous integration, and
locally with `npm run db:test`.

The hook is installed by husky through the `prepare` script, which npm runs automatically after
`npm install`. If hooks ever stop firing, `npm run prepare` reinstalls them.

Everything in this repository is written in English: code, comments, tests, commit messages and
documentation. The product interface itself is bilingual and defaults to Spanish.

### Releasing

A `0.X.0` tag is published on completing each task group in
[`tasks.md`](openspec/changes/add-splitrip-mvp/tasks.md), and `1.0.0` on completing the MVP. A
version marks a verifiable functional increment, not an intermediate step.

```bash
npm version minor   # bumps package.json, commits and tags in one step
git push --follow-tags
```

`.npmrc` configures that command to produce a `chore(release): <version>` commit and a bare `0.1.0`
tag with no `v` prefix, so releases obey the same rules as every other commit.

`package.json` is the single source of the version: `next.config.ts` reads it at build time and
exposes it as `APP_VERSION`, so what the application shows can never drift from what was released.

## Licence

[GNU Affero General Public License v3.0 or later](LICENSE).

Splitrip is free software: you may redistribute and modify it under the terms of the AGPL. The Affero
clause matters for a hosted application: anyone who runs a modified version as a network service must
make their source available to its users, not only those who redistribute the code.
