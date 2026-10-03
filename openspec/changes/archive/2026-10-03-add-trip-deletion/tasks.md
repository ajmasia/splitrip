## 1. Deleting in the database

- [x] 1.1 Create the migration with `delete_trip(p_trip_id, p_confirm_name)` — `security definer`, refusing anybody not on the trip, a `participant` with `42501` and a name that does not match, after trimming and lowercasing, with `SP030`, then deleting the trip row — executable by `authenticated` only; verify with pgTAP that an organiser deletes an open trip and a closed one, that afterwards none of its participants, expenses, shares, payments, activity entries or invitations remain, that a participant, an outsider and a mismatched name are refused and leave everything in place, that a name differing only in case and surrounding spaces is accepted, and that another trip of the same people is untouched
- [x] 1.2 Map `SP030` in the error table and add its message in both languages; verify that the type check fails if either catalogue lacks the new key

## 2. Deleting from the trip screen

- [x] 2.1 Add the name comparison the form and the database share, as a pure function; verify with unit tests that surrounding spaces and letter case are ignored and that a different or partial name does not match
- [x] 2.2 Add the `deleteTrip` server action calling `delete_trip`, announcing the deletion on the trip's channel with `httpSend('trip_deleted', {})`, and redirecting to the trip list with the `deleted` marker, returning the error's message when refused; verify against the local stack that an organiser ends on their list without the trip and that a refused deletion returns the mismatch message
- [x] 2.3 Add `DeleteTripButton` to the trip screen beside closing and reopening, for an `admin` only: the warning that everything goes for every participant and cannot be undone, the name field, and the confirm button enabled only once the name matches; verify in the browser that a participant sees no such control, that the button stays disabled with a partial name, and that the controls are 44 pixels tall and cause no horizontal scrolling at 360 pixels wide
- [x] 2.4 Show the notice on the trip list when it is reached with the `deleted` marker, in both languages; verify that it appears after a deletion and not on an ordinary visit

## 3. Telling the others

- [x] 3.1 Make `TripChannel` listen for `trip_deleted` and, on receiving it, ask the server through a server action whether the trip is still readable with the reader's session, going to the trip list with the notice only when it is not; verify with two browsers that a participant with the trip open lands on their list with the notice when the organiser deletes it, and that sending `trip_deleted` by hand for a trip that still exists leaves the participant on it
- [x] 3.2 Verify on the local stack that an invitation link of a deleted trip says the invitation no longer works, that an old link to one of its screens shows the "nothing here" page, and that the trip appears in nobody's list
- [x] 3.3 Record in the README's description of what the application does that an organiser can delete a trip, and in the changelog under Unreleased; verify both read correctly
