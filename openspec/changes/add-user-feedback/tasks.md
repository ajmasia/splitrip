## 1. Operators

- [x] 1.1 Create the migration with the `instance_operators` table, its lowercase check and RLS enabled with no policies, and the `is_operator()` function; verify with pgTAP that a signed-in listed address is an operator, that an address listed before its account exists is recognised once it signs in, that a device identity and an unlisted account are not, and that no session can read or write the table
- [x] 1.2 Add the sample organiser's address to the operators list in the local seed and document in the README how an operator is added, next to trip creators; verify that after `npm run db:reset` the sample organiser is an operator and that the README steps work as written

## 2. Storing feedback

- [x] 2.1 Create the migration with the `feedback` table, its checks on kind, message length, path length and language, the `on delete set null` trip reference, the `(user_id, created_at)` index, RLS with a select policy for operators only and no write policies; verify with pgTAP that an operator reads every row, and that a participant, a trip organiser and the sender themselves read none
- [x] 2.2 Implement the `submit_feedback` function with its error codes for an empty message, a message over 2,000 characters and a sixth message within an hour, defaulting the kind and dropping a trip the caller is not in; verify with pgTAP each refusal, that a refused submission stores nothing, that the fifth message in an hour is accepted, that a device identity can submit, and that an outsider's trip identifier is stored as null
- [x] 2.3 Map the new error codes in the error table and add their copy in both languages; verify that the type check fails if either catalogue lacks one of the new keys

## 3. Sending feedback

- [ ] 3.1 Implement the feedback entry point in the shared frame as a link that carries the current screen and, under a trip, the trip; verify that it appears on the public entry page, on the trip list and on a trip screen with the right `from` and `trip` values, that it is at least 44 pixels tall and that `npm run check:viewport` reports no overflow at 360 pixels on the public entry page
- [x] 3.2 Implement the feedback page with the message field, the three kinds, the list of what is sent alongside the message and the confirmation with its way back; verify that opening the page without a session issues no identity, and that the confirmation leads back to the screen it was opened from
- [x] 3.3 Implement the server action that keeps only an application-relative path, takes the version and language on the server, issues a device identity when there is none and calls `submit_feedback`; verify in the application a message sent from a trip screen with a session, one sent from the public entry page without one, the empty-message and too-long refusals keeping what was typed, and the over-the-limit refusal on a sixth message

## 4. Reading feedback

- [x] 4.1 Implement the operators' feedback screen listing every message newest first with its kind, message, time, screen, version, language and trip name, with its empty state; verify as an operator with seeded and freshly sent messages, and with none
- [x] 4.2 Refuse the screen to anybody who is not an operator with a not-found, and show the link to it on the home screen only to operators; verify that a participant, a trip organiser who is not an operator and a session without one all get a not-found and see no link, and that an operator sees the link and reaches the screen
