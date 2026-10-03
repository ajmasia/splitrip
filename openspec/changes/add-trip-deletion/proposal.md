## Why

An organiser can close a trip and reopen it, but cannot get rid of one. Trips created by mistake, trips opened to try the application out and trips whose accounts were settled long ago stay in everybody's list for good, and with real groups now using the self-hosted instance the first of those already exist. Closing is the wrong tool for them: it keeps the trip, and its purpose is to keep it.

## What Changes

- **An organiser can delete a trip.** An `admin` of the trip can delete it at any time, open or closed, whatever it contains. A `participant` cannot.
- **Deletion is permanent.** The trip and everything in it — participants, expenses and their shares, payments, activity, invitations and the summary frozen when it was closed — disappears for every participant. There is no archive and no undo.
- **It asks for the trip's name.** Because nothing brings a deleted trip back, the organiser confirms by typing its name; the deletion is refused when the name does not match, by the database as well as by the form.
- **Nobody is left on a dead screen.** Whoever has the trip open on another device is taken back to their list with a notice that the trip was deleted, as soon as it happens; whoever opens it later, from a link or a bookmark, finds it gone like any trip they cannot reach.

### Out of scope

- **Archiving or hiding a trip**, for everybody or for one person. Deletion is the only new operation.
- **Restoring a deleted trip.** The instance's backups are the only way back, and they restore the whole instance.
- **Removing the device identities of the trip's participants.** They stop belonging to any trip and are left to the sweep of anonymous identities that belong to none, which the MVP already plans.
- **Deleting accounts.** An organiser's account, and any other account on the trip, stays.

## Capabilities

### New Capabilities

- `trip-deletion`: an organiser deleting a trip for good, the confirmation it needs, what goes with it, and what the trip's other participants see when it is gone.

### Modified Capabilities

None. The requirements on trip roles live in `trip-management`, which so far exists only in the unarchived `add-splitrip-mvp` change and cannot be targeted by a delta. Its list of what an `admin` may do does not mention deletion and is not contradicted by it; when that change is archived, the organiser's right to delete may be added to that list.

## Impact

- **Database**: a migration with a `delete_trip(trip_id, confirm_name)` function that checks the caller is an `admin` of the trip and the name matches, then deletes the trip and lets the existing cascades take everything in it. No table changes: every table already cascades from `trips`, the references to participants are deferrable for exactly this, and the activity triggers already log nothing for a cascade.
- **Application**: a server action and a confirmation form on the trip screen, beside closing and reopening; a notice on the trip list; the trip channel listening for the deletion and leaving the screen.
- **Real time**: the deletion is announced on the trip's channel as a broadcast, since a deleted row cannot be delivered through Row Level Security once the participants it is checked against are gone.
- **Error codes**: one new code for a confirmation that does not match, with its message in both languages.
