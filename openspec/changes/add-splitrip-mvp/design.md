## Context

New project, no prior code. The motivation and scope are in `proposal.md`; the behavioural requirements, in `specs/`.

Four constraints shape the design:

1. **No accounts for travellers.** A traveller gets in through a QR code and types their name, with no password and no email, but there still has to be a stable per-device identity for authorisation to rest on. Opening a trip is the one thing that does need an account, so that a public deployment cannot be used as free hosting by whoever finds it.
2. **Real time.** Several phones with the same screen open must see the same numbers within seconds.
3. **Money.** Amounts have to add up to the cent, always, and reproducibly.
4. **Minimal operations.** One developer, free tiers, a complete local environment in Docker and deployment on Vercel.

## Goals / Non-Goals

**Goals:**

- A data model where balances are derived and verifiable, not a counter that gets updated and can drift out of sync.
- Authorisation centred on the database (Row Level Security), so that no application route can bypass trip isolation by oversight.
- Exact, deterministic monetary arithmetic, isolated in pure functions testable without a database.
- A reproducible local environment in Docker, schema-identical to production.

**Non-Goals:**

- Scaling beyond dozens of concurrent trips with small groups. Queries are designed for clarity, not for volume.
- Offline writes with conflict resolution.
- A type system shared with native clients: the only user interface is the PWA.

## Decisions

### Stack: Next.js (App Router) + Supabase

**Chosen:** Next.js 16 with the App Router and TypeScript, deployed on Vercel; Supabase as managed Postgres with Auth, Realtime and RLS.

**Why:** splitting expenses is a purely relational problem (participants, expenses, shares, payments) where SQL and integrity constraints do half the work. Supabase additionally provides, with no code of our own, the two pieces that would cost the most: real-time propagation of table changes and an authorisation model that lives next to the data.

**Alternatives considered:** *Convex*, which gives reactivity by default and would have simplified real time, but with a proprietary data model and no SQL, precisely where this problem is strongest. *Postgres directly (Neon) with Drizzle*, which would have required building both authentication and real time by hand — disproportionate work for a first release.

### Identity: two kinds of session over one `auth.uid()`

**Chosen:** Supabase Auth, used two ways. Somebody joining a trip gets an anonymous user (`signInAnonymously`) bound to their device. Somebody who opens trips signs in with an email address and a password. Both are a real `auth.uid()` with a genuine JWT and token refresh, so every RLS policy is written once and never asks which kind it is looking at.

**Why:** it turns "no accounts for travellers" into a problem the platform has already solved, without giving up accounts where they earn their keep. The two forms differ in exactly one place — the barrier in front of creating a trip — and nowhere else in the schema, the policies or the queries.

**Alternatives considered:** an opaque token of our own stored in `localStorage` and validated on every server route — it works, but it leaves RLS without an identity and forces all authorisation into application code, which is precisely what we want to avoid. A server-signed cookie: same problem, more ceremony.

**Accepted consequence:** a participant who clears their browser data loses access, and rejoins through an invitation under the name they are registered with. Whoever holds an account simply signs in again.

### Creating a trip needs an account

**Chosen:** only a session that is not anonymous may create a trip. The check lives in the `create_trip` function — `auth.jwt() ->> 'is_anonymous'` — and public sign-up is turned off, so accounts exist only because somebody made them out of band. Joining by invitation is untouched, and an invitation carrying the `admin` role still makes an account-less traveller an organiser of that trip.

**Why:** a personal deployment reachable from the public internet, that hands an identity to whoever asks and lets that identity create data, is somebody else's free hosting waiting to be discovered. The barrier is where it is because a check in the interface is a suggestion: `create_trip` is the only door into `trips`, and neither table accepts an insert from a client.

**Why it is not the whole answer:** the barrier stops stray identities from creating data, not from existing. Three more things bound that, in order of how much they buy: an anonymous session is issued only where one is genuinely needed — opening an invitation, or being inside the application — rather than on any first page view, which by itself removes the crawlers that would otherwise take an identity each; rate limits per address; and a periodic sweep of anonymous users belonging to no trip.

**Why not a CAPTCHA first:** its widget needs a person to interact with it, and the anonymous sign-in happens on the server, in the proxy, where there is nobody to show it to. Moving sign-in to the browser to accommodate one would reintroduce a first paint with no identity and put a puzzle in front of every visitor of a product whose whole premise is that getting in costs nothing. It stays available as an escalation, hung off the invitation flow, which is the one place a person is actually interacting.

**Two powers, deliberately separate:** administering a trip you were invited to, and opening new trips. Conflating them would mean an organiser could not delegate the running of a trip to somebody in the group without also handing them the ability to create trips on the instance.

### Writes through RPC, reads through RLS

**Chosen:** reads go straight to tables and views from the client, protected by RLS. Writes touching more than one row — creating an expense with its shares, closing a trip and generating its summary, joining through an invitation — go through Postgres functions invoked over RPC.

**Why:** creating an expense and splitting it are a single atomic operation. Doing it from the client as two writes opens the door to expenses with no split if the second one fails. Beyond that, the split in cents must be computed by a single authority to be reproducible, and the natural authority is the database.

**Alternatives considered:** Next.js Server Actions with the `service_role` key. Rejected: that key bypasses RLS entirely, so an authorisation bug in application code becomes a data leak between trips. RPC functions run with the user's permissions and validate membership explicitly.

### Materialised shares rather than computed ones

**Chosen:** every `shared` expense generates N rows in `expense_shares`, one per participant in the split, holding the amount in cents charged to them. The split is computed at creation time and persisted.

**Why:** the reproducible-split requirement (`balance-settlement`) demands that leftover cents always land on the same people. Persisting the split guarantees this by construction and makes the numbers auditable: the row literally states what each person was charged. It also reduces balances to a trivial SQL sum.

**Split rule:** integer division of the cents by the number of participants, with the `r` leftover cents assigned one by one to the first `r` participants ordered by their identifier. Because it depends on a stable order rather than on chance, it is deterministic and verifiable.

**Alternative considered:** computing the split on the fly on every query. Cleaner in appearance, but it leaves the fate of the leftover cents at the mercy of whatever order the query returns, which is not guaranteed.

### Balances as a view, settlement as a pure function

**Chosen:** balances are exposed through a Postgres view that sums, per participant, what they paid minus what they were charged, plus what they collected minus what they paid in settlements. The algorithm turning balances into transfers lives in TypeScript, as a pure function shared between server and client.

**Why:** balances are an aggregation and Postgres computes them better and always consistently with the data. Settlement, by contrast, is an algorithm (greedy: repeatedly match the largest creditor with the largest debtor) over a handful of numbers already in memory; as a pure function it can be tested exhaustively without a database, edge cases included. The result has at most `n-1` transfers, which is what the spec requires.

**Note:** the greedy approach does not always yield the absolute minimum number of transfers — the optimal problem is NP-hard — but it does satisfy the `n-1` bound and gives optimal or near-optimal results for groups of this size. Chasing the exact optimum adds nothing perceptible with 5 people.

### Money: integer cents and an explicit currency from day one

**Chosen:** amounts are stored as `BIGINT` cents. Every expense and every payment carries a `currency` column with `CHECK (currency = 'EUR')` in this release. Formatting to text happens only at the edge of the interface.

**Why:** no floating-point type should ever touch money. And carrying the currency column from the start, even accepting only one value, avoids the most expensive future migration: adding multi-currency later would otherwise force a retroactive decision about which currency each historical expense was in. Extending then means relaxing the `CHECK` and adding a rates table.

### Activity feed through triggers

**Chosen:** `activity` entries are written by Postgres triggers on `expenses`, `payments`, `participants` and `trips`.

**Why:** the feed is an audit log, and a log that depends on application code remembering to write it ends up with gaps. In triggers it is impossible to modify an expense without leaving a trace. As a side effect, the feed travels over the same real-time channel as the rest of the tables, with no extra code.

### Real time: one channel per trip

**Chosen:** subscription to Postgres changes (`postgres_changes`) filtered by `trip_id`, one channel per trip. Each received event invalidates the corresponding client query rather than applying the change by hand to local state.

**Why:** invalidating and re-reading is far harder to get wrong than merging messages into local state, and at this data volume the cost of reloading a trip screen is negligible. It also solves reconnection for free: when the connection returns, everything is invalidated and the screen becomes correct again, which is exactly what `realtime-activity` requires.

**Isolation:** the `trip_id` filter is a convenience, not the guarantee. The guarantee is RLS: Supabase Realtime applies the table policies before delivering an event, so a client cannot receive data from someone else's trip even by subscribing deliberately.

### Closing summary frozen as a snapshot

**Chosen:** on closing a trip, the closing RPC function computes the complete summary and stores it as JSONB in a column on the trip. Queries for a `closed` trip read that snapshot, not the live tables.

**Why:** the spec requires the summary not to change while the trip is closed. A summary recomputed each time would change if somebody corrected something, and would also repeat the whole aggregation on every read. The snapshot is the cheapest read and the only one that satisfies the requirement literally.

### Local development: the backend in Docker, the app on the host

**Chosen:** `supabase start` brings up the complete Supabase stack in containers (Postgres, GoTrue, Realtime, Studio, API) through the Supabase CLI, pinned as a dev dependency. The Next.js application runs on the host, not in a container. A single npm script starts both. The schema lives as versioned SQL migrations in the repository and is applied identically locally and in production.

**Why:** the real value of Docker here is not isolating Node, it is having the same Postgres, with the same RLS policies and the same triggers, on the laptop. RLS policies are the kind of thing that can only truly be tested against the database, and testing them against the shared remote project is slow and destructive.

**Why the application is not containerised:** containerising it would buy either production parity or reproducibility, and it buys neither. Production is Vercel, which builds Next.js natively and never reads a Dockerfile, so an app container would be parity with nothing — unrun infrastructure that rots silently. And on macOS a dev server behind a bind mount has slow file watching and unreliable hot reload, so it would trade a good developer experience for a worse one. The Node version is pinned by `engines` and the lockfile, which is the reproducibility that actually matters here.

**Alternative considered:** a `docker compose` at the repository root orchestrating both. Rejected on the above, and on a practical point: the Supabase CLI orchestrates its own containers rather than exposing a compose file to extend, so "one compose file for everything" was never really on the table — it would have meant reimplementing the stack by hand and then owning its upgrades.

**Revisit this if:** self-hosting becomes a goal. The AGPL makes it plausible that someone will want to deploy a modified Splitrip outside Vercel, and that is when a production Dockerfile earns its place — built and tested for a target that actually exists.

### Repository conventions

**Chosen:** Semantic Versioning for released versions and Conventional Commits for the history, with atomic commits — one commit per logical change — and no reference to AI tooling in the messages. A `0.X.0` annotated tag is published on completing each of the task groups in `tasks.md`, and `1.0.0` on completing the MVP. The application version file is the source of the version the PWA shows the user.

**Why:** with conventional, atomic commits the history is the source of the changelog and makes the version bump derivable rather than a manual decision. It is also what makes Vercel's rollback useful: reverting to a specific version is only safe if each commit is a coherent unit.

**Consequence for the tasks:** the task list is grouped so that each task is a reasonable commit on its own, and each group a releasable increment.

### Two usage contexts, one responsive component tree

**Chosen:** a single set of components whose layout and density respond to the viewport, not two applications. Phone viewports get stacked cards and thumb-reachable navigation; desktop viewports get tables with visible columns and content constrained to a readable measure. On top of that, two affordances are gated on being an `admin` on a desktop viewport: successive expense entry and the dense dashboard tables.

**Why:** the trip is prepared at a desk and lived on a phone, and entering fifteen bookings in a row is genuinely a different interaction from logging one dinner in a bar. But the underlying data, permissions and mutations are identical in both contexts, so two component trees would duplicate every screen to vary only presentation — and would then drift.

**Alternatives considered:** separate desktop and mobile routes, which makes each context optimal but doubles the surface to maintain and the places a bug can hide. Rejected for a first release. Strict mobile-first with a stretched desktop layout, which is what the specs originally said: rejected once the organiser's desk work turned out to be half the product's life rather than an edge case.

**Where the line falls:** viewport decides *density*; role decides *capability*; the two together decide whether the desk-oriented tools are *offered*. An `admin` on a phone is never denied their trip data — the dashboard stays reachable in compact form — they are simply not shown a bulk-entry flow that a phone cannot serve well.

**Implementation consequence:** the breakpoint is a shared constant, and density is expressed in CSS rather than by branching on a JavaScript-measured width. Rendering a different component tree depending on a measured viewport causes hydration mismatches and makes the server unable to produce correct HTML on the first paint.

### Internationalisation: static catalogues, Spanish by default

**Chosen:** the copy lives in per-language JSON catalogues (`es`, `en`) loaded on the server according to the resolved language, with no heavy i18n library. Resolution follows this order: stored user preference → browser `Accept-Language` header → Spanish. Amounts and dates are formatted with the browser's native `Intl` APIs using the active language.

**Why:** with two languages and a small interface, a full i18n library adds more weight and configuration than value. Static catalogues with a TypeScript type derived from the Spanish catalogue's keys give what actually matters here: the compiler warns when a key is missing from English. `Intl` is already in every target browser and avoids a formatting dependency.

**Design consequence:** no visible copy is written inline in a component; everything goes through the catalogue from the very first screen. Retranslating an interface that is already built costs far more than building it translated, and it is a mistake that only surfaces once it is everywhere.

### Testing strategy

Three levels, chosen by what can actually break:

- **Unit tests over pure functions**: the split in cents and the settlement algorithm. This is where the risk of the money not adding up lives, and they are free to test exhaustively. They include a property-based test: for any set of expenses, the balances sum to exactly zero.
- **Integration tests against the local Postgres in Docker**: RLS policies and RPC functions. Each test checks both that the legitimate participant can and that the outsider cannot.
- **One end-to-end run** with Playwright: create trip → invite → join → add expense → view settlement → close and view the summary. Just one, the happy path, as a safety net before deploying.

## Risks / Trade-offs

- **Anyone holding the invitation link gets into the trip** → 128-bit cryptographically generated identifiers (unguessable), revocable and expiring invitations, and participant removal. This is a deliberate product decision: the absence of friction is the reason the app will be used during the trip rather than after it.
- **Losing the device or clearing browser data means losing access** → Rejoining with the same name from the same invitation recovers the participant identity, and the organiser can regenerate invitations. The real fix, attaching an email address, is stated as out of scope.
- **A bug in the RLS policies leaks data between trips** → This is the gravest risk in the design. It is mitigated with RLS enabled by default on every table, no use of `service_role` on the user request path, and integration tests that explicitly verify denied access.
- **Someone corrects an expense while another person is editing it** → Last write wins, with no locking. With groups of five the collision is rare and real time makes it immediately visible. Detecting it explicitly is not worth it in the first release.
- **With no push, a participant may not learn about a change until they open the app** → Accepted and stated in the proposal. The activity feed keeps the complete trace, so opening the app shows what has happened.
- **The expense date depends on the device time zone** → It is stored as a civil date (`DATE`), with no time and no zone, because what matters is "the day of the trip" and not the exact instant. This prevents a dinner expense from showing up on the following day because of the destination's time difference.
- **Free tiers have limits** → With small groups the volume is trivial; the first limit that would be reached is the Supabase project's inactivity pause, which affects availability, not data.
- **An open door to anonymous sessions on a public deployment** → Anyone reaching the site can be handed an identity. It buys them nothing — creating a trip needs an account, and every other write checks membership — but the identities themselves accumulate and count against a free tier's quota. Bounded by issuing a session only where one is needed, by rate limits per address, and by sweeping anonymous users who belong to no trip. Escalates to a CAPTCHA on the invitation flow if that proves insufficient.

## Migration Plan

There is no migration: this is a new project with no prior users or data. Bringing it up means:

1. Create the production Supabase project and apply the repository migrations to it.
2. Deploy on Vercel with the environment variables pointing at that project.
3. Verify the complete run in the deployed environment from a real phone, including installation as a PWA on iOS and on Android.

**Rollback:** the deployment is rolled back through Vercel's rollback to the previous version. Database migrations are additive within this release, so rolling the application back does not leave the schema incompatible.

## Open Questions

- **Default invitation expiry.** The behaviour is specified; the concrete period (the length of the trip? 30 days?) can be settled during implementation without affecting the specs or the tasks.
- **Visual identity.** The name is settled: **Splitrip**, repository `github.com/ajmasia/splitrip`. The icon and the palette remain to be defined, and they affect only the manifest and the static assets.
