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

- Node.js 20.9 or newer
- Docker, for the local Supabase stack

## Getting started

```bash
npm install
npm run dev
```

The application is then served at <http://localhost:3000>.

## Available scripts

| Script                 | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Runs the development server with hot reloading  |
| `npm run build`        | Produces the production build                   |
| `npm start`            | Serves the production build                     |
| `npm run lint`         | Runs ESLint; fails on any warning               |
| `npm run lint:fix`     | Runs ESLint and applies the fixes it can        |
| `npm run typecheck`    | Type-checks the project without emitting output |
| `npm run format`       | Formats the project with Prettier               |
| `npm run format:check` | Checks formatting without writing               |

Before opening a pull request, `npm run lint`, `npm run typecheck` and `npm run format:check` should all pass.

## Code quality

ESLint uses `eslint-config-next/core-web-vitals` plus its TypeScript rules, and runs with `--max-warnings 0`: everything the Next.js config reports as a warning — accessibility issues among them — fails the check. A lint that cannot fail is not a safety net.

Prettier owns formatting, and `eslint-config-prettier` disables the ESLint rules that would fight it. Prettier deliberately ignores `openspec/`: those artifacts have a structure the `openspec` CLI parses and validates, so that tool owns their formatting.

TypeScript runs in strict mode with `noUncheckedIndexedAccess` and the unused-symbol checks enabled. The balance and settlement code indexes participant arrays heavily, and an `undefined` slipping through there would corrupt money rather than raise a visible error.

## Project layout

```
src/app/            Next.js App Router pages and layouts
openspec/           Specifications, design and task breakdown
```

## Contributing

The project follows [Conventional Commits](https://www.conventionalcommits.org/) with atomic commits, and [Semantic Versioning](https://semver.org/).

A `commit-msg` hook runs commitlint on every commit, so a malformed message never reaches the history. The accepted types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style` and `test`.

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
