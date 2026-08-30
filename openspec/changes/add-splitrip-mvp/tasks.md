## 1. Project scaffolding and local Docker environment

- [x] 1.1 Initialise the repository with Next.js (App Router) and TypeScript in strict mode; verify that `npm run build` compiles without errors and that the initial page is served locally
- [x] 1.2 Configure ESLint, Prettier and the type-check script; verify that `npm run lint` and `npm run typecheck` pass cleanly
- [x] 1.3 Add the Conventional Commits setup (commitlint and a commit hook) and the SemVer version file; verify that a non-conforming message is rejected and a valid one passes
- [x] 1.4 Initialise the local Supabase project with the CLI; verify that `supabase start` brings the containers up and that Studio responds on its port
- [x] 1.5 Add the single-command development environment that starts the Supabase stack and the application together, plus a connectivity check that reads the app's own environment variables; verify that from a clean clone one command brings everything up and the check confirms the app reaches the local Supabase API
- [x] 1.6 Document in the README the local start-up, the required environment variables and the day-to-day commands; verify by following the README from scratch in a clean directory

## 2. Data schema and authorisation

- [x] 2.1 Create the migration with the `trips`, `participants` and `invitations` tables, with their keys, uniqueness constraints and the role `CHECK`; verify that the migration applies to the local database and that the constraints reject the invalid cases
- [x] 2.2 Create the migration with the `expenses`, `expense_shares` and `payments` tables, with amounts as `BIGINT` cents, a `currency` column with `CHECK (currency = 'EUR')`, a positive-amount `CHECK` and the constraint preventing a `contribution` from having shares; verify with inserts that each constraint fires
- [ ] 2.3 Create the migration for the `activity` table and the triggers feeding it from `expenses`, `payments`, `participants` and `trips`; verify that each kind of operation leaves an entry with author, action and timestamp
- [ ] 2.4 Enable RLS on every table and write the read policies based on trip membership through `auth.uid()`; verify with integration tests that a participant reads their trip and that an outsider gets no rows
- [ ] 2.5 Write the write policies distinguishing `admin` from `participant` as specified in `trip-management`; verify with tests that a `participant` cannot modify someone else's expense and that an `admin` can
- [ ] 2.6 Create the balances view aggregating paid, charged and settled per participant; verify against a fixture data set that the balances match hand-computed figures and sum to exactly zero

## 3. Money arithmetic

- [ ] 3.1 Implement the pure split-in-cents function with deterministic assignment of the remainder; verify with unit tests that €60.00 among 4 gives equal shares, that €10.00 among 3 gives 3.34/3.33/3.33, and that the sum of shares always equals the amount
- [ ] 3.2 Implement the pure greedy settlement function over the balances; verify with unit tests that it solves the spec case, that it never proposes more than `n-1` transfers and that applying them leaves every balance at zero
- [ ] 3.3 Add a property-based test over random sets of expenses and payments; verify that for any input the balances sum to zero and the settlement clears them
- [ ] 3.4 Implement the interface amount formatting and parsing; verify with tests that it rejects amounts with more than two decimal places, zero and negatives, and that it rounds correctly when converting to cents

## 4. Database write functions

- [ ] 4.1 Implement the create-expense RPC function inserting the expense and its shares atomically, applying the split rule; verify with integration tests the full-split case, the subset case and the contribution-without-shares case
- [ ] 4.2 Implement the edit- and delete-expense RPC functions regenerating the shares and honouring the per-role permissions; verify with tests that the balances are correct after editing the amount and after changing the split set
- [ ] 4.3 Implement the record- and void-payment RPC functions with their validations; verify with tests that they reject payments to oneself, non-positive amounts and participants from another trip
- [ ] 4.4 Implement the join-by-invitation RPC function, including the duplicate-name check and rejoining from a second device; verify with tests the valid, revoked, expired and closed-trip invitation cases
- [ ] 4.5 Implement the close- and reopen-trip RPC functions, generating the JSONB summary snapshot on close; verify with tests that the summary does not change between two reads and that it is regenerated on reopening and closing again
- [ ] 4.6 Add the closed-trip check to every write function; verify with tests that any write against a `closed` trip is rejected

## 5. Identity and access

- [ ] 5.1 Integrate the Supabase client with an automatic anonymous session on first visit and token refresh; verify that a fresh browser gets a stable `auth.uid()` that survives reloads
- [ ] 5.2 Implement trip creation and the participant's trip list; verify in the application that the creator appears as `admin` and only sees the trips they take part in
- [ ] 5.3 Implement invitation generation with a 128-bit identifier, an attached role and an expiry; verify that the identifier comes from a cryptographically secure generator and that the invitation is recorded as active
- [ ] 5.4 Implement the invitation screen with a copyable link and a QR code; verify by scanning the QR with a phone that it lands on the join screen of the right trip
- [ ] 5.5 Implement the join screen with name entry and its validations; verify the empty-name, duplicate-name and invalid-invitation cases
- [ ] 5.6 Implement invitation revocation and participant removal with its financial-activity check; verify that removing someone with expenses is rejected with the corresponding message
- [ ] 5.7 Implement role management with the guarantee that an `admin` always remains; verify that the only organiser cannot demote themselves and that they can once there is another

## 6. Interface foundation: PWA and languages

- [ ] 6.1 Implement the Spanish and English copy catalogues with typed keys; verify that the compiler fails when a key exists in Spanish and is missing from English
- [ ] 6.2 Implement language resolution (stored preference, browser header, Spanish by default) and the persistent language switcher; verify the three resolution paths and that the preference survives a reload
- [ ] 6.3 Implement amount and date formatting with `Intl` according to the active language; verify that 1055 cents render as "10,55 €" in Spanish and with English conventions in English
- [ ] 6.4 Implement the phone base layout with thumb-reachable navigation and touch targets of at least 44 pixels; verify on a 360-pixel-wide screen that there is no horizontal scrolling
- [ ] 6.5 Implement the responsive density layer: a shared breakpoint constant and CSS-driven switching between stacked cards and tables, with content constrained to a readable measure; verify that the same page renders as cards at 360 pixels and as a table at 1280 pixels with no hydration warning in the console
- [ ] 6.6 Implement the role-and-viewport gate offering the organiser tools only to an `admin` on a desktop viewport; verify that an `admin` sees them at 1280 pixels, does not at 360 pixels, that a `participant` never does, and that the dashboard stays reachable on a phone
- [ ] 6.7 Add the PWA manifest with icons for iOS and Android, a theme colour and standalone mode; verify by installing the application on an Android device and on an iOS device that it opens without the browser interface
- [ ] 6.8 Add the shell-caching service worker, the offline notice and new-version detection; verify that the second opening does not wait for the network, that the notice appears offline instead of the browser error, and that a new version is applied without reinstalling

## 7. Expenses

- [ ] 7.1 Implement the main trip screen with the expense list sorted by date descending and the empty state; verify that it shows description, amount, payer, type and the number of people in the split
- [ ] 7.2 Implement the add-expense form with its default values (payer is whoever records it, split among everyone, today's date); verify that an expense can be recorded providing only a description and an amount
- [ ] 7.3 Add payer selection and split-subset selection to the form; verify that a €45.00 expense split among three of five charges €15.00 to each and leaves the other two unchanged
- [ ] 7.4 Add the `contribution` expense type to the form, hiding the split when selected; verify that a €300.00 contribution adds to the trip total and changes no balance
- [ ] 7.5 Implement the successive expense entry flow for an `admin` on a desktop viewport, keeping date, payer and split between entries and reporting the session count and total; verify that ten expenses can be entered from the keyboard alone and that a rejected entry keeps what was typed
- [ ] 7.6 Implement the expense detail, edit and delete with the per-role permissions; verify that a `participant` cannot edit someone else's expense and an `admin` can, and that the numeric keypad appears on tapping the amount field

## 8. Balances and settlement

- [ ] 8.1 Implement the balances screen with each participant's net figure and what the current user has to pay or collect highlighted; verify against a fixture trip with known balances
- [ ] 8.2 Implement the settlement proposal and the "all settled" state; verify that it reproduces the spec case and proposes no transfer when every balance is zero
- [ ] 8.3 Implement recording a payment from the settlement proposal, partial payments included; verify that a €25.00 payment against a €40.00 debt leaves the balance at -€15.00 and updates the proposal
- [ ] 8.4 Implement the payment history and voiding a payment with its permissions; verify that voiding reverses the balances of both parties and leaves a trace in the activity

## 9. Real time and activity

- [ ] 9.1 Implement the per-trip channel subscription to the changes of the relevant tables, invalidating the affected queries; verify with two browsers that an expense added in one appears in the other without reloading and that the totals update
- [ ] 9.2 Implement the connection-lost indicator and resynchronisation on recovery; verify by cutting the network that the notice appears and that on restoring it the screen reflects the changes made while disconnected
- [ ] 9.3 Implement the trip activity feed with author, action and timestamp; verify that a new expense generates the corresponding entry and that an edit made by an `admin` identifies them as the author
- [ ] 9.4 Implement the new-activity indicator for when the user is on another screen; verify that it appears without interrupting what they are doing
- [ ] 9.5 Verify real-time isolation: check with tests that a client subscribed to trip A receives no event from trip B and that a removed participant stops receiving them

## 10. Organiser dashboard, closing and export

- [ ] 10.1 Implement the organiser dashboard with total spent, the shared/contribution breakdown, the number of expenses, the average cost per person and the per-participant table; verify against a fixture trip with known figures and check the empty state raises no errors
- [ ] 10.2 Add spending over time by day to the dashboard; verify with a trip spanning several dates that the daily amounts reconcile with the total
- [ ] 10.3 Implement the expense detail with filters by payer and by type, showing the filtered total, presented as a table sortable by date and amount on desktop; verify the three filter cases, the €0.00 empty total, and that sorting works on both columns
- [ ] 10.4 Restrict the dashboard to the `admin` role, offering the `participant` the balances view, and give it a compact stacked layout on phone viewports; verify that a `participant` cannot reach the dashboard, that an `admin` can reach it at 360 pixels without horizontal scrolling, and that the figures match the desktop layout
- [ ] 10.5 Implement closing the trip from the interface and the closing summary screen reachable by every participant; verify that after closing, a `participant` sees the complete summary and that the trip becomes read-only
- [ ] 10.6 Implement exporting the summary as shareable text and exporting the expenses as CSV; verify that the text includes total, cost per person, balances and settlement, and that the CSV has one row per expense with date, description, amount, payer, type and split participants

## 11. End-to-end verification and deployment

- [ ] 11.1 Write the end-to-end run with Playwright: create a trip, invite, join, add expenses of both types, view the settlement, record a payment, close and view the summary; verify that it passes against the local Docker environment
- [ ] 11.2 Add continuous integration running lint, types, unit tests, integration tests against Postgres and the end-to-end run; verify that the full run passes on a clean branch
- [ ] 11.3 Create the production Supabase project and apply the repository migrations to it; verify that the deployed schema matches the local one and that RLS is enabled on every table
- [ ] 11.4 Deploy on Vercel with its environment variables; verify the complete run from a real phone, including installation as a PWA on iOS and on Android
- [ ] 11.5 Verify behaviour with a group of five participants on separate devices: check that the amounts reconcile to the cent, that real time reaches everyone and that the final settlement is correct
