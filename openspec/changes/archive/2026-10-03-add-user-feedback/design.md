## Context

See proposal.md for why; the behaviour is in `specs/user-feedback` and `specs/instance-operators`.

What the existing code already settles:

- **Allowlists by email.** `trip_creators` is an email-keyed table with RLS enabled and no policies, read only from `security definer` functions that compare it with the email in the caller's JWT and refuse anonymous sessions. Operators follow the same shape.
- **Writes go through functions.** Every write in the schema is a `security definer` RPC that validates and raises a dedicated `SPnnn` SQLSTATE, which `src/lib/errors.ts` maps to copy. The last code in use is `SP030`.
- **Identities are minted on intent.** `src/proxy.ts` refreshes sessions and mints none; `src/app/actions/join.ts` calls `signInAnonymously()` only when somebody actually joins. Feedback reuses that rule.
- **The shared frame is a server component.** `AppShell` renders the header on every screen but is not told which route it is on, and a server component cannot read the current path without help.

## Goals / Non-Goals

**Goals:**
- Accept feedback from any session, anonymous included, without letting the form be the only guard.
- Record context the sender cannot falsify where it matters: version and language come from the server, not from the request.
- Keep every page server-rendered; add as little client code as the entry point needs.

**Non-Goals:**
- Defending against a determined attacker rotating identities: that is the job of the anonymous sign-in rate limits planned in task 11.6 of `add-splitrip-mvp`. This change limits per identity.
- Any operator tooling beyond reading.

## Decisions

### Operators: a table like `trip_creators`, checked by one function

`instance_operators (email text primary key, note text, added_at timestamptz)`, lowercase-trimmed by a check constraint, RLS enabled with no policies. A `security definer` function `is_operator()` returns true when the JWT is not anonymous and its lowercased email is in the table. RLS policies and the application ask that function rather than reading the table.

*Alternative considered:* a column on `trip_creators` or a role claim in the JWT. Rejected: being allowed to open trips and running the instance are different powers that will diverge, and a custom claim needs an auth hook for what a lookup does in one line.

### Feedback: a table written only through `submit_feedback`

`feedback (id, user_id, kind, message, path, app_version, locale, trip_id, created_at)`:

- `kind` checked to `bug | idea | other`; `message` checked to 1–2,000 characters after trimming; `path` limited in length; `locale` checked to the supported languages.
- `trip_id` references `trips` with `on delete set null`, so deleting a trip keeps the feedback sent from it.
- `user_id` is kept for the rate limit only; the operators' screen does not show it.
- RLS enabled. No insert, update or delete policy: the only way in is the function. A select policy `using (public.is_operator())`.
- An index on `(user_id, created_at)` serves the rate check.

`submit_feedback(p_message, p_kind, p_path, p_trip_id, p_app_version, p_locale)` is `security definer` and, in order: refuses a call without `auth.uid()`; trims and checks the message (`SP031` required, `SP032` too long); counts the caller's rows in the last hour and refuses a sixth (`SP033`); keeps `p_trip_id` only if the caller is a participant of that trip, otherwise stores null without saying so — refusing would let anybody probe which trip identifiers exist; defaults the kind to `other`.

*Alternative considered:* insert through an RLS `with check` policy. Rejected: the rate limit needs a count of other rows, which a policy can express only awkwardly, and every other write in the schema already goes through a function.

### Version and language are taken on the server

The server action reads `APP_VERSION` and the resolved interface language itself and passes them to the function; the form does not carry them. Only the path and the trip come from the page, and the action keeps the path only when it is an application-relative path (starts with a single `/`), so the stored screen is always one of ours.

### The entry point: a small client link in the shared frame

`AppShell` gains a `FeedbackLink`, a client component that reads `usePathname()` and builds `/feedback?from=<path>`, adding `&trip=<id>` when the path is under `/trips/<id>`. That is the whole of the client code; the form itself is a server-rendered page.

*Alternative considered:* have the proxy copy the path into a request header for `AppShell` to read. Rejected: it would make every route dynamic for the sake of one link, and couples the proxy to a UI concern.

### The form: its own page, a plain form and a server action

`/feedback` renders the message field, the kind as three radio options and a short "sent with your message" list, then posts to a server action that mints an anonymous identity when there is none (as `join.ts` does), calls `submit_feedback` and shows a confirmation with a link back to `from`. Errors come back through `useActionState`, keeping what was typed, as the other forms do.

*Alternative considered:* a dialog over the current screen. Rejected: a page needs no client state beyond the form, works without JavaScript, and on a phone a full screen is what a dialog would become anyway.

### The operators' screen and how they reach it

`/operator/feedback` checks `is_operator()` and otherwise renders a not-found, so its existence is not confirmed to anybody else. The list comes from `operator_feedback()`, a `security definer` function guarded by `is_operator()` that returns every message newest first with the name of its trip. Reading the table directly would be enough for the messages, but the trip's name sits behind the trip's own policies, which an operator on no trip does not pass; the function hands over that name and nothing else of the trip, and returns nothing to anybody who is not an operator. The link to it appears on the home screen for operators only; the home screen already asks who the viewer is, so the check costs one call there rather than one on every page.

## Risks / Trade-offs

- **A new identity resets the rate limit.** → Clearing cookies yields a fresh anonymous identity and five more messages. Bounded by the per-address limits on anonymous sign-ins in task 11.6; acceptable for an instance with a handful of operators reading by hand.
- **The path is whatever the browser reports.** → It is restricted to relative paths and a maximum length and shown to operators as text, never as a link they are led to follow blindly.
- **Operators without an account cannot read.** → By design: reading requires a signed-in account on the list. Adding an operator is a row in a table, documented in the README alongside trip creators.
- **`user_id` is personal data kept indefinitely.** → It is a random identifier, not shown on the screen; deletion and retention are left to triage, which is out of scope.

## Migration Plan

One additive migration: the two tables, the two functions, the policies and the index. Nothing existing changes, so deploying it is safe and rolling back is dropping what it created. The local seed adds the sample organiser's address to the operators list so the screen can be tried locally; production operators are added by hand, as trip creators are.
