## Purpose

Records the money spent during a trip: who paid it, how much, on what, and among whom it is split. It is the source of truth from which every balance and settlement of the group is derived.

## ADDED Requirements

### Requirement: Recording a shared expense
The system SHALL allow any participant of a trip in the `open` state to record an expense of type `shared`, providing a description, an amount, a date, a payer and the set of participants it is split among. By default, the payer SHALL be whoever records the expense and the split SHALL include every participant of the trip.

#### Scenario: Recording with the default values
- **WHEN** a participant records a "Dinner" expense of €60.00 without changing payer or split, in a trip with 4 participants
- **THEN** the system stores the expense with type `shared`, with themselves as payer and with all 4 participants in the split
- **AND** the expense appears immediately in the trip list for every participant

#### Scenario: Recording an expense paid by someone else
- **WHEN** a participant records an expense and selects another participant as the payer
- **THEN** the system attributes the payment to the selected participant for balance purposes
- **AND** records in the trip activity that a different person created the expense

#### Scenario: Expense date
- **WHEN** a participant records an expense without providing a date
- **THEN** the system assigns it the current date
- **AND** if they do provide a date, the system stores the one provided

### Requirement: Recording a contribution that is not split
The system SHALL allow recording an expense of type `contribution`: it is paid by one participant, adds to the total spent on the trip, and SHALL NOT create any debt for anyone else. A contribution SHALL NOT have a split set.

#### Scenario: Adding a contribution
- **WHEN** a participant records a "Van rental" expense of €300.00 with type `contribution`
- **THEN** the system stores it with no split set
- **AND** the amount adds to the total spent on the trip
- **AND** no participant, the payer included, sees their balance changed by that expense

#### Scenario: Attempting to give a contribution a split
- **WHEN** an expense of type `contribution` is submitted with a set of participants to split among
- **THEN** the system rejects the operation and reports that a contribution is not split

### Requirement: Splitting among a subset of participants
The system SHALL allow an expense of type `shared` to be split among only a subset of the trip participants. The split SHALL always be equal among the included participants. The split set SHALL contain at least one participant, and every member SHALL belong to the trip.

#### Scenario: A dinner attended by three out of five
- **WHEN** a participant of a five-person trip records a "Dinner" expense of €45.00 selecting only three participants in the split
- **THEN** the system charges €15.00 to each of those three participants
- **AND** the other two participants see no change to their balance from that expense

#### Scenario: Empty split
- **WHEN** an expense of type `shared` is submitted with no participants in the split
- **THEN** the system rejects the operation and reports that it must be split among at least one person

#### Scenario: Split including someone outside the trip
- **WHEN** an expense is submitted whose split set includes someone who is not a participant of the trip
- **THEN** the system rejects the operation

#### Scenario: The payer may be left out of the split
- **WHEN** a participant records a €30.00 expense that they paid but whose split includes only two other people
- **THEN** the system charges €15.00 to each of those two people
- **AND** the payer is left with a €30.00 credit from that expense

### Requirement: Amount validation
The system SHALL accept only amounts strictly greater than zero, with at most two decimal places, and SHALL store them as an integer number of cents to avoid floating-point rounding errors.

#### Scenario: Zero or negative amount
- **WHEN** an expense is submitted with an amount of 0 or a negative amount
- **THEN** the system rejects the operation and reports that the amount must be greater than zero

#### Scenario: Amount with more than two decimal places
- **WHEN** an expense is submitted with an amount of 10.555
- **THEN** the system rejects the operation and reports the accepted format

#### Scenario: Valid amount
- **WHEN** an expense of €10.55 is recorded
- **THEN** the system stores it as 1055 cents and displays it as €10.55

### Requirement: Expense currency
Every expense SHALL store the currency its amount is expressed in. In this release the system SHALL accept `EUR` exclusively, and SHALL reject any other currency, so that the data model is ready to support several currencies later without migrating the expenses already recorded.

#### Scenario: Expense in the accepted currency
- **WHEN** an expense is recorded without specifying a currency
- **THEN** the system stores it with currency `EUR`

#### Scenario: Unsupported currency
- **WHEN** an expense is submitted with currency `USD`
- **THEN** the system rejects the operation and reports that this release operates in euros only

### Requirement: Editing and deleting expenses
The system SHALL allow editing and deleting expenses of a trip in the `open` state. A participant with the `participant` role SHALL be able to modify or delete only the expenses they recorded; an `admin` SHALL be able to modify or delete any expense of the trip. Every edit or deletion SHALL recalculate the affected balances and SHALL appear in the trip activity.

#### Scenario: Correcting the amount of one's own expense
- **WHEN** a participant corrects the amount of an expense they recorded, from €60.00 to €65.00
- **THEN** the system stores the new amount and the balances of those involved are recalculated
- **AND** the change appears in the trip activity

#### Scenario: Deletion of an expense by its author
- **WHEN** a participant deletes an expense they recorded
- **THEN** the system removes it from the trip and the balances are recalculated without it

#### Scenario: Participant deleting someone else's expense
- **WHEN** a participant with the `participant` role attempts to delete an expense recorded by someone else
- **THEN** the system rejects the operation

#### Scenario: Editing on a closed trip
- **WHEN** any participant attempts to edit or delete an expense of a trip in the `closed` state
- **THEN** the system rejects the operation and reports that the trip is closed

### Requirement: Successive expense entry on a desktop
The system SHALL offer participants with the `admin` role on desktop-sized viewports a flow for entering several expenses in succession: after an expense is saved the form SHALL stay open and ready for the next one, keeping the values most likely to repeat and clearing the rest. The flow SHALL be completable from the keyboard alone, without reaching for a pointer between expenses.

#### Scenario: Entering several bookings before departure
- **WHEN** an `admin` on a desktop viewport saves an expense through the successive-entry flow
- **THEN** the expense is recorded and the form remains open, focused and ready for the next one
- **AND** the description and amount are cleared while the date, payer and split are kept

#### Scenario: Keyboard-only entry
- **WHEN** an `admin` fills in the description and the amount and submits from the keyboard
- **THEN** the expense is recorded and focus returns to the description field, ready for the next entry

#### Scenario: Running total during entry
- **WHEN** an `admin` has recorded several expenses in one successive-entry session
- **THEN** the system shows how many expenses were entered in that session and their total

#### Scenario: Error during successive entry
- **WHEN** an expense submitted through the successive-entry flow is rejected
- **THEN** the system reports the error and keeps the entered values in the form, so nothing typed is lost

### Requirement: Viewing the trip expenses
The system SHALL show any participant of the trip the complete list of expenses, sorted by date in descending order, stating for each one the description, the amount, the payer, the type and how many people it is split among.

#### Scenario: Trip listing
- **WHEN** a participant opens the trip expenses screen
- **THEN** the system shows every expense of the trip, most recent first, with description, amount, payer, type and number of people in the split

#### Scenario: Expense detail
- **WHEN** a participant opens a single expense
- **THEN** the system shows the full detail, including the participants it is split among and the amount charged to each

#### Scenario: Trip with no expenses
- **WHEN** a participant opens a trip that has no expenses yet
- **THEN** the system shows an empty state inviting them to record the first expense
