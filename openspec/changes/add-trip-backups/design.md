## Context

A trip is six tables: `trips`, `participants`, `expenses`, `expense_shares`, `payments` and `activity`, all cascading from `trips`. Participants may have no `user_id` — a place somebody claims through an invitation by choosing its name — and every policy compares `user_id` with `auth.uid()`, so such a place grants nothing until claimed. Triggers on `trips`, `participants`, `expenses` and `payments` write `activity`. Several `created_by` columns reference `auth.users`. Writes go through `security definer` functions that check roles and the trip's state; whether a caller may open trips is the `trip_creators` list, checked by `create_trip`.

## Goals / Non-Goals

**Goals:**

- One function call creates the whole trip or nothing.
- A file written by this release is readable by every later one.

**Non-Goals:**

- Streaming or very large trips. A trip is a few hundred rows; the file is tens of kilobytes.

## Decisions

### The file is versioned JSON, with the file's own identifiers

```
{ "format": "splitrip-trip", "version": 1, "exportedAt": …, "appVersion": …,
  "trip": { name, startDate, endDate, currency, status, closedAt, summary, createdAt },
  "participants": [ { key, displayName, role, joinedAt } ],
  "expenses": [ { key, type, description, amountCents, currency, spentOn, paidBy, createdAt, shares: [ { participant, amountCents } ] } ],
  "payments": [ { from, to, amountCents, currency, paidOn, voidedAt, createdAt } ],
  "activity": [ { action, actor, actorName, subject, details, occurredAt } ] }
```

`key` values are the rows' current identifiers, used only to tie rows together inside the file; a restore gives every row a new identifier and maps references through them. Columns referencing `auth.users` are left out, and `activity.details` is kept as it is, minus any identifier of a user. A later format adds a reader for its version; the reader for version 1 stays.

- *A SQL dump of the rows*: ties the file to the schema of the day and would carry device identifiers.
- *CSV per table*: several files, no place for the format's version, and types lost.

### Download is a read for organisers, assembled on the server

A route handler at `/trips/<id>/backup` checks that the caller is an `admin` of the trip, reads the six tables with the caller's session — Row Level Security already lets participants read their trip — shapes the document, and answers it as `application/json` with a `Content-Disposition` naming the trip and the date. A `participant` gets the same refusal as any trip they cannot administer.

### Restore is one `security definer` function

`restore_trip(p_backup jsonb, p_me text)` checks the caller is on `trip_creators`, validates the whole document — format and version, required fields, every reference resolving to a key in the file, every shared expense's shares adding up to its amount, `p_me` naming a participant — before inserting anything, then inserts in dependency order with new identifiers, the caller's place getting `user_id = auth.uid()` and role `admin`, everybody else `user_id` null. A closed trip is inserted open and closed last, so the guards against writing to closed trips are not tripped; its summary is copied, not recomputed. `created_by` columns are set to the caller.

The activity triggers check a transaction-local setting, `splitrip.restoring`, which the function sets, and log nothing while it is on; the function inserts the file's activity as it was and one `trip_restored` entry at the end.

- *Inserting from the server action through the existing write functions*: each would log activity, check the trip state row by row, and leave a half-made trip when one failed halfway.

### Upload is a server action on the trip list

The form reads the file in the browser to list its participants for the "which one is you" choice, and sends the file and the choice; the action calls `restore_trip` and redirects to the new trip. The upload limit is raised to what a large trip needs, and a larger file is refused before reaching the database.

### Error codes

`SP034` not a trip backup or damaged, `SP035` format newer than this release reads, `SP036` numbers or references that do not add up, `SP037` the chosen participant is not in the file; each with its message in both languages.

## Risks / Trade-offs

- [A file edited by hand to inflate somebody's balance] → It restores as a new trip the uploader organises, affecting only the people who later claim places in it; it is checked for consistency, not authenticity, and the activity says it was restored and by whom.
- [Activity entries referring to rows by identifier] → Subjects are mapped through the file's keys like every other reference; an entry whose subject is not in the file keeps its text and loses the link.
- [Schema changes making old files unreadable] → The format is versioned and readers are kept; a task verifies a version 1 file after each later change touching these tables.

## Migration Plan

A migration with the function, the trigger changes and the new activity action; nothing to backfill.
