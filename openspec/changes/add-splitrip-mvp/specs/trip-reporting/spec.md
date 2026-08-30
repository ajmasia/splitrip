## Purpose

Answers the two aggregate questions a group asks about a trip: "how are we doing?" while the trip is under way, through the organiser's dashboard, and "how did it all end?" when it finishes, through a closing summary any participant can consult.

## ADDED Requirements

### Requirement: Organiser dashboard
The system SHALL offer participants with the `admin` role a trip dashboard presenting, as a minimum: the total spent, the split between shared spending and contributions, the number of expenses recorded, the average cost per person, and a per-participant table with what they have paid, what they are charged and their net balance.

#### Scenario: Organiser reviews the trip status
- **WHEN** an `admin` opens the dashboard of a trip with 12 expenses
- **THEN** the system shows the total spent, how much of that total is shared and how much is contributions, the number of expenses, the average cost per person and the per-participant table

#### Scenario: Spending over time
- **WHEN** an `admin` opens the dashboard of a trip with expenses on several dates
- **THEN** the system shows the spending aggregated by day

#### Scenario: Participant attempts to open the dashboard
- **WHEN** a participant with the `participant` role attempts to open the organiser dashboard
- **THEN** the system denies access and states that it is an organiser view
- **AND** offers them the balances and settlement view, which they may consult

#### Scenario: Dashboard of a trip with no expenses
- **WHEN** an `admin` opens the dashboard of a trip with no expenses
- **THEN** the system shows the totals at zero and an empty state, without errors

### Requirement: Filterable expense detail
The system SHALL allow an `admin` to review the full expense detail of the trip, filtering at least by payer and by expense type, and SHALL show the total for the filtered expenses.

#### Scenario: Filter by payer
- **WHEN** an `admin` filters the expenses by the payer "Ana"
- **THEN** the system shows only the expenses paid by Ana and their total amount

#### Scenario: Filter by expense type
- **WHEN** an `admin` filters the expenses by type `contribution`
- **THEN** the system shows only the contributions and their total amount

#### Scenario: Filter with no results
- **WHEN** an `admin` applies a combination of filters matching no expense
- **THEN** the system shows an empty state with a total of €0.00

### Requirement: Trip closing summary
On closing a trip, the system SHALL generate a summary including: the total spent, the cost per person, what each participant contributed, the contributions that were not split along with their author, the final balance of each participant, and the settlement with the state of each transfer. The summary SHALL reflect the state of the trip at the moment of closing and SHALL NOT change while the trip remains closed.

#### Scenario: Summary generated on closing
- **WHEN** an `admin` closes the trip
- **THEN** the system generates the closing summary from the trip data at that moment
- **AND** makes it available on the trip screen

#### Scenario: The summary does not change while the trip is closed
- **WHEN** the closing summary of a `closed` trip is consulted at two different moments
- **THEN** the system returns exactly the same figures both times

#### Scenario: Regeneration after reopening and closing again
- **WHEN** an `admin` reopens a closed trip, changes are recorded and it is closed again
- **THEN** the system generates a new closing summary reflecting those changes

### Requirement: Every participant can view the closing summary
The system SHALL allow any participant of the trip, regardless of their role, to view the closing summary once the trip is in the `closed` state.

#### Scenario: Participant views the summary
- **WHEN** a participant with the `participant` role opens a trip in the `closed` state
- **THEN** the system shows them the complete closing summary, including the balances and settlement of every participant

#### Scenario: Summary requested for an open trip
- **WHEN** a participant attempts to view the closing summary of a trip in the `open` state
- **THEN** the system states that the trip is not closed yet and offers them the running balances view

#### Scenario: Person outside the trip
- **WHEN** someone who is not a participant of the trip attempts to access its closing summary
- **THEN** the system denies access and discloses no trip data

### Requirement: Exporting the summary
The system SHALL allow any participant to export the trip summary in a shareable text format usable outside the application, including the total, the cost per person, the balances and the outstanding settlement.

#### Scenario: Sharing the summary
- **WHEN** a participant chooses to share a trip summary
- **THEN** the system produces readable text with the total, the cost per person, each participant's balance and the settlement transfers
- **AND** offers to copy or share it through the device's own mechanisms

#### Scenario: Exporting the expense detail
- **WHEN** an `admin` exports the trip expenses
- **THEN** the system generates a CSV file with one row per expense including date, description, amount, payer, type and the participants in the split
