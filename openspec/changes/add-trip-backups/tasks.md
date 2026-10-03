## 1. Restoring in the database

- [ ] 1.1 Make the activity triggers log nothing while the transaction-local setting `splitrip.restoring` is on, and add the `trip_restored` activity action; verify with pgTAP that with the setting on, inserting an expense, a payment and a participant logs nothing, and with it off logs as before
- [ ] 1.2 Create `restore_trip(p_backup jsonb, p_me text)`, `security definer`, executable by `authenticated` only: refusing anybody not on `trip_creators` with `SP017`, validating the whole document before inserting — `SP034` not a backup or incomplete, `SP035` a newer version, `SP036` references or shares that do not add up, `SP037` an unknown `p_me` — then inserting the trip, participants, expenses, shares, payments and activity with new identifiers, the caller's place as `admin` and everybody else unclaimed, closing a closed trip last with its summary copied, and logging `trip_restored`; verify with pgTAP that a restored trip matches the source row for row (amounts, shares, balances, voided payments, activity), that a closed trip comes back closed with the same summary, that each refusal leaves no rows behind, that restoring twice makes two unrelated trips, and that a restored unclaimed place is taken up through `join_trip` with its balance
- [ ] 1.3 Map `SP034`–`SP037` in the error table with their messages in both languages; verify that the type check fails if either catalogue lacks a key

## 2. Downloading a trip

- [ ] 2.1 Write the version 1 document builder as a pure function from the six tables' rows to the JSON document, mapping identifiers to keys and leaving out every user identifier; verify with unit tests that the document round-trips the sample trip's numbers, that no `user_id`, email or `created_by` value appears in it, and that keys tie shares and payments to the right participants
- [ ] 2.2 Add the `/trips/<id>/backup` route for organisers and the download action on the trip screen beside closing and deleting; verify against the local stack that an organiser downloads the sample trip with a file named after it and the date, that a participant sees no action and gets a refusal from the route, that the controls are 44 pixels tall, and that `npm run check:viewport` reports no overflow at 360 pixels on the trip screen

## 3. Uploading a trip

- [ ] 3.1 Add the upload form on the trip list for those who can open trips: choosing a file, reading its participants in the browser, choosing which one is you, and sending both to a server action that calls `restore_trip` and opens the new trip, refusing files over the size limit; verify against the local stack that the sample trip's backup restores as a new trip with the same balances, that a non-backup file, an inconsistent one and a too-large one show their messages and create nothing, that somebody not allowed to open trips sees no form, and that `npm run check:viewport` reports no overflow at 360 pixels on the trip list
- [ ] 3.2 Keep a version 1 backup of the sample trip as a test fixture and restore it in the test suite; verify that the suite fails if a later change stops it restoring

## 4. On the running instance

- [ ] 4.1 Publish a release candidate with this change, download a real trip on the Proxmox instance, restore it on the local stack and on the instance; verify that the balances match the original to the cent, and that a participant invited to the restored trip on the instance claims their place from a phone and sees their balance
