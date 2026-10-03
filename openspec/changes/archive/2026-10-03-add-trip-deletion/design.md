## Context

See proposal.md for why; the behaviour is in `specs/trip-deletion`.

What the repository already settles:

- **The schema was built for this.** Every table hangs from `trips` with `on delete cascade` — participants, invitations, expenses, payments, activity — and shares cascade from their expense. The references from expenses and payments to participants are deferrable precisely "so that deleting a whole trip can cascade in any order". The activity triggers already log nothing when the row they react to goes because its trip went. The frozen summary is a column of `trips`. Deleting the row is the whole of the data work, once those references are deferred: they are `deferrable initially immediate`, so the function defers them by name for its own transaction before deleting, or the cascade is refused when it reaches a participant before the shares that point at them.
- **Organiser operations are database functions.** `close_trip` and `reopen_trip` are `security definer` functions that call `caller_participant` and `is_trip_admin`, raise `42501` when the caller is not an organiser and an `SPxxx` code for anything the screen should explain; `src/lib/errors.ts` maps each code to a message. The last code in use is `SP029`.
- **Destructive steps take two clicks.** `CloseTripButton` shows what is about to happen and asks again before doing it.
- **Real time cannot deliver this through Row Level Security.** Realtime checks each change against the subscriber's read policies, which ask whether they are a participant of the trip. By the time a deletion's changes are read, the trip and its participants are gone and every check fails, so the subscribers are told nothing.
- **A missing trip already has a screen.** A trip the reader cannot see, or that does not exist, ends in `notFound()` and the application's "nothing here" page.

## Goals / Non-Goals

**Goals:**
- One database function decides who may delete and whether the confirmation matches; the screen asks, the database enforces.
- Everybody with the trip open learns it is gone without reloading, and nobody can be thrown out of a trip that still exists.

**Non-Goals:**
- Tombstones. Nothing about a deleted trip is kept to tell a deleted trip from one never seen; a later visit gets the ordinary "nothing here".
- Removing the participants' device identities; the planned sweep of identities belonging to no trip covers them.

## Decisions

### `delete_trip(p_trip_id, p_confirm_name)`

A `security definer` function in the shape of `close_trip`: `caller_participant` refuses anybody not on the trip, `is_trip_admin` refuses a `participant` with `42501`, and a name that does not match the trip's, compared after trimming and lowercasing both, is refused with a new code `SP030` before anything is deleted. It then deletes the trip row and returns nothing. Open or closed makes no difference.

The name is checked in the database, not only in the form, so that no other caller — a stale form, a hand-made request — can delete without it.

*Alternative considered:* a `DELETE` policy on `trips` and a direct delete from the client. Rejected: it would leave the confirmation to the client, and every other organiser operation is a function with its own checks and codes.

### The confirmation form

A `DeleteTripButton` beside closing and reopening on the trip screen, shown to an `admin` only. Its first step is the button; its second says that the trip and everything in it is removed for every participant and cannot be undone, and asks for the trip's name, with the confirm button enabled once the typed name matches. The same comparison as the database's is used, so the form never accepts what the database will refuse. A refused confirmation keeps the form open with the message.

### After the deletion: the organiser

The server action calls `delete_trip`, announces the deletion (below), and redirects to the trip list with a `?deleted` marker, which shows a notice that the trip was deleted. The notice is generic: the trip's name no longer exists anywhere to be shown.

### After the deletion: everybody else

The server action announces it with a broadcast on the trip's own channel, `trip:<id>`, through `channel.httpSend('trip_deleted', {})`. It goes through the gateway's real-time API path, which already reaches Realtime, and needs no socket of the server's own. `TripChannel`, already subscribed to that channel on every trip screen, also listens for `trip_deleted`.

The channel is public, so anybody who knows a trip's id could send that event. It is therefore treated as a hint, never as a fact: on receiving it the screen asks the server, through a server action reading the trip with the participant's own session, whether it still exists. Only if it does not does it go to the trip list with the same notice the organiser sees. A false announcement costs one query and changes nothing.

*Alternatives considered:* delivering the trip's `DELETE` through `postgres_changes` (it cannot pass Row Level Security once the participants are gone, as above); a private channel with authorization policies (sound, but it needs Realtime's authorization tables and policies for one event whose effect is already harmless).

A participant who was away when it happened gets nothing pushed; their next request to the trip finds it missing and gets the "nothing here" page, and their trip list no longer has it.

### Error message

`SP030` maps to a message saying the name typed does not match the trip's, in both languages.

## Risks / Trade-offs

- **An organiser deletes the wrong trip.** → The name has to be typed, and the warning says it cannot be undone. The instance's backups are the only way back, and they restore the whole instance.
- **A co-organiser deletes a trip another organiser still wanted.** → Any `admin` may, as any `admin` may close it; the activity feed goes with the trip, so there is no record of who did it. Accepted for groups that already trust their organisers.
- **The broadcast does not reach somebody** (asleep device, no socket). → They find the trip gone on their next request, as above; the announcement only saves them a reload.

## Migration Plan

One migration adds the function and its grant; no table changes, nothing to backfill. On a self-hosted instance it is applied by `update` like any other migration. Rolling back the application leaves the function unused.
