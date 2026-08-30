## Purpose

Keeps the whole group looking at the same reality: when someone records or corrects an expense, everyone else sees it at once without reloading, and the trip keeps a readable trace of who did what. This is what removes the "have you already logged the dinner?" question during the trip.

## ADDED Requirements

### Requirement: Real-time propagation of trip changes
The system SHALL propagate to every client connected to a trip, without user action and within a few seconds, the creation, edit and deletion of expenses and payments, as well as participants joining. The totals, balances and settlement on display SHALL update accordingly.

#### Scenario: An expense recorded by someone else appears at once
- **WHEN** a participant has the trip screen open and another participant records an expense from their phone
- **THEN** the expense appears on the first participant's screen without them reloading or interacting
- **AND** the trip total and the balances update with that expense

#### Scenario: Propagated correction
- **WHEN** a participant corrects the amount of an expense while others have the screen open
- **THEN** the corrected amount and the recalculated balances are reflected on the other screens

#### Scenario: A participant joins
- **WHEN** a person joins the trip through an invitation
- **THEN** they appear in the participant list of everyone who has the trip open

### Requirement: Data isolation per trip
The system SHALL deliver real-time updates only to the participants of the trip they belong to. A client SHALL NOT receive data from trips they do not take part in.

#### Scenario: Client of another trip
- **WHEN** a client connected to trip A is active while an expense is recorded on trip B
- **THEN** that client receives no information about the trip B expense

#### Scenario: Removed participant
- **WHEN** an `admin` removes a participant from the trip
- **THEN** that participant stops receiving real-time updates for that trip

### Requirement: Recovery after connection loss
The system SHALL indicate to the user when the real-time connection is not active, and SHALL restore it and synchronise the pending data once connectivity returns, without requiring the user to reload the application.

#### Scenario: Temporary loss of coverage
- **WHEN** a participant loses connection while they have the trip open
- **THEN** the system shows an indicator that the data may not be up to date

#### Scenario: Connection restored
- **WHEN** the connection is restored
- **THEN** the system resubscribes, reloads the trip data and removes the indicator
- **AND** the screen reflects the changes that occurred while disconnected

### Requirement: Trip activity feed
The system SHALL record and display a chronological activity feed for the trip. Each entry SHALL state who performed the action, what the action was and when. At least the following SHALL be recorded: creation, edit and deletion of expenses; creation and voiding of payments; participants joining and leaving; and the closing and reopening of the trip.

#### Scenario: Viewing the feed
- **WHEN** a participant opens the trip activity feed
- **THEN** the system shows the most recent entries first, each with author, action and timestamp

#### Scenario: Entry created by a new expense
- **WHEN** Ana records a "Dinner" expense of €60.00
- **THEN** the feed gains an entry of the form "Ana added Dinner · €60.00" with its timestamp

#### Scenario: Entry created by an edit
- **WHEN** an `admin` corrects an expense recorded by someone else
- **THEN** the feed gains an entry identifying the `admin` as the author of the correction

#### Scenario: The feed arrives in real time
- **WHEN** any recordable action occurs while a participant has the trip open
- **THEN** the corresponding entry appears in their feed without reloading

#### Scenario: New activity indicator
- **WHEN** activity occurs on the trip while the participant is on another screen of the application
- **THEN** the system shows them an indicator that there is new activity, without interrupting what they are doing
