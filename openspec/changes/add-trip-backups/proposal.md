## Why

An organiser has no copy of their trip outside the instance it lives on. If that instance is lost without a usable backup, or the trip is deleted, or the organiser wants to take it to another instance, there is no way back. Whole-instance backups (`add-instance-backups`) protect the operator's data; organisers need something of their own, in their hands, that does not depend on the operator or on the instance surviving.

## What Changes

- **An organiser downloads a trip.** From the trip screen, an `admin` of the trip downloads a single file holding the trip and everything in it: its details and state, its participants by name and role, its expenses with their shares, its payments, and its activity. Open or closed, at any time.
- **Somebody who can open trips uploads one.** On the trip list, anybody allowed to open trips can create a trip from a file. They choose which of the file's participants they are; that place becomes theirs, as organiser. Every other participant comes back as a place with nobody in it, carrying everything recorded against them — expenses, shares, payments, balance — for its person to claim through a new invitation, exactly as for somebody the organiser added by name.
- **What comes back is what was there.** Amounts, shares, dates, payments, voided payments, a closed trip's state and frozen summary, and the activity as it was, without new activity entries for the upload itself beyond one saying the trip was restored.
- **A file is checked before anything is created.** A file that is not a trip backup, that is damaged, that comes from a newer format, or whose numbers do not add up is refused whole, and nothing is created.

### Out of scope

- **Restoring device links.** Nobody but the uploader is linked to the restored trip; everybody else claims their place again. A whole-instance restore is what keeps devices, and it is `add-instance-backups`.
- **Merging into an existing trip, or replacing one.** An upload always creates a new trip.
- **Invitations.** Their tokens are secrets that expire; the restored trip starts with none.
- **Exporting for spreadsheets or other applications.** The file is a backup to restore, not a report.
- **Operators downloading other people's trips.** Only a trip's organisers download it.

## Capabilities

### New Capabilities

- `trip-backups`: an organiser downloading a trip as a file, somebody allowed to open trips creating one from such a file, what the file holds, how people come back as places to claim, and how a bad file is refused.

### Modified Capabilities

None. Trip roles, places with nobody in them and joining by invitation live in `trip-management`, which so far exists only in the unarchived `add-splitrip-mvp` change and cannot be targeted by a delta. This change uses them as they are.

## Impact

- **Database**: a function that creates a trip from a backup in one transaction — checking the format, the caller's right to open trips and every amount — inserting the trip, its participants with no device except the caller's, expenses, shares, payments and activity, with the activity triggers kept from logging the inserts; and a read of everything a trip holds for its organisers.
- **Application**: a download action on the trip screen for organisers; an upload form on the trip list for those who can open trips, with the choice of which participant they are; messages in both languages.
- **Backup format**: a versioned JSON document, so later releases can still read files from this one.
- **Error codes**: new codes from `SP034` for a file that is not a backup, a format too new, numbers that do not add up, and a participant choice that is not in the file.
