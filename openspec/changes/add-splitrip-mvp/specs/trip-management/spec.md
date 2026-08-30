## Purpose

Defines the life cycle of a shared trip: how it is created, the data that describes it, who takes part and in what role, and how it is closed when the trip ends. This is the capability that bounds the scope within which expenses and balances exist.

## ADDED Requirements

### Requirement: Trip creation
The system SHALL allow a person signed in with an account to create a trip by providing a name. A person who holds only a device identity SHALL NOT be able to create one. The person who creates it SHALL be recorded as a participant of the trip with the `admin` role. The trip SHALL start in the `open` state with `EUR` as its base currency.

#### Scenario: Creation with the minimum data
- **WHEN** a signed-in person creates a trip providing only the name "Iceland 2026"
- **THEN** the system creates the trip in the `open` state, with `EUR` as base currency, and records that person as a participant with the `admin` role
- **AND** redirects them to the screen of the newly created trip

#### Scenario: Attempt to create a trip without an account
- **WHEN** somebody holding only a device identity attempts to create a trip
- **THEN** the system rejects the creation, reports that creating a trip needs an account, and offers them the sign-in screen
- **AND** their access to the trips they already take part in is unaffected

#### Scenario: Empty trip name
- **WHEN** a person attempts to create a trip with no name, or with a name containing only whitespace
- **THEN** the system rejects the creation and reports that the name is required

#### Scenario: Optional dates
- **WHEN** a person creates a trip providing a start date and an end date
- **THEN** the system stores both dates with the trip
- **AND** if the end date precedes the start date, it rejects the creation and reports the error

### Requirement: Signing in to organise
The system SHALL allow a person to sign in with an email address and a password, and to sign out. The system SHALL NOT offer public sign-up: accounts are created out of band, so that the number of people who can open new trips stays bounded. Signing in SHALL NOT be required to take part in a trip.

#### Scenario: Signing in
- **WHEN** a person enters the email address and password of an existing account
- **THEN** the system signs them in and they can create trips

#### Scenario: Wrong credentials
- **WHEN** a person enters an email address or password that does not match an account
- **THEN** the system rejects the attempt and reports that the credentials do not match, without disclosing which of the two was wrong

#### Scenario: No public sign-up
- **WHEN** a person looks for a way to create an account from the application
- **THEN** the system offers none, and states that accounts are arranged with whoever runs the instance

#### Scenario: Signing out
- **WHEN** a signed-in person signs out
- **THEN** the system ends their session and they can no longer create trips
- **AND** they keep reaching the trips they take part in, through the device identity that succeeds their session

### Requirement: A participant's trip list
The system SHALL show each person the list of trips they take part in, and SHALL exclude from that list any trip they do not take part in.

#### Scenario: Participant with several trips
- **WHEN** a participant who belongs to three trips opens the application
- **THEN** the system lists those three trips with their name, their state (`open` or `closed`) and the total spent on each
- **AND** shows no trip they are not a participant of

#### Scenario: Person with no trips
- **WHEN** a person with no trips opens the application
- **THEN** the system shows an empty state offering to create a trip or to join one through an invitation

### Requirement: Roles and permissions within a trip
Every participant of a trip SHALL hold exactly one of two roles: `admin` or `participant`. An `admin` SHALL be able to edit the trip data, invite and remove participants, change roles, edit or delete any expense of the trip, and close it. A `participant` SHALL be able to record expenses, and to edit or delete only the expenses they recorded themselves. Both roles SHALL be able to view every expense, balance and settlement of the trip.

#### Scenario: Participant edits someone else's expense
- **WHEN** a participant with the `participant` role attempts to edit an expense recorded by someone else
- **THEN** the system rejects the operation and reports that they may only modify their own expenses

#### Scenario: Admin edits someone else's expense
- **WHEN** a participant with the `admin` role edits an expense recorded by someone else
- **THEN** the system applies the change and attributes it in the activity log to the `admin` who made it

#### Scenario: Promoting a participant to admin
- **WHEN** an `admin` changes another participant's role to `admin`
- **THEN** that participant gains every organiser permission

### Requirement: At least one admin is guaranteed
A trip SHALL have at least one participant with the `admin` role at all times. The system SHALL reject any operation that would leave the trip with no admin.

#### Scenario: The only admin attempts to demote themselves
- **WHEN** the only participant with the `admin` role attempts to change their own role to `participant`
- **THEN** the system rejects the operation and reports that the trip must keep at least one admin

#### Scenario: Demotion with another admin present
- **WHEN** an `admin` changes their role to `participant` in a trip that has another `admin`
- **THEN** the system applies the change

### Requirement: Editing the trip data
The system SHALL allow an `admin` to modify the name and the dates of a trip in the `open` state.

#### Scenario: Admin renames the trip
- **WHEN** an `admin` changes the trip name
- **THEN** the system stores the new name and reflects it for every participant

#### Scenario: Participant attempts to edit the trip
- **WHEN** a participant with the `participant` role attempts to change the trip name
- **THEN** the system rejects the operation and reports that admin permissions are required

### Requirement: Closing and reopening a trip
The system SHALL allow an `admin` to close a trip in the `open` state. A trip in the `closed` state SHALL be read-only: no creation, edit or deletion of expenses, payments or participants is accepted. The system SHALL allow an `admin` to reopen a closed trip, returning it to the `open` state.

#### Scenario: Closing the trip
- **WHEN** an `admin` closes the trip
- **THEN** the system marks the trip as `closed`, generates its closing summary and makes it available to every participant

#### Scenario: Attempt to record an expense on a closed trip
- **WHEN** any participant attempts to record an expense on a trip in the `closed` state
- **THEN** the system rejects the operation and reports that the trip is closed

#### Scenario: Reopening the trip
- **WHEN** an `admin` reopens a trip in the `closed` state
- **THEN** the system returns the trip to the `open` state and accepts changes again
- **AND** the closing summary is no longer frozen and will be recalculated on the next close

#### Scenario: Participant attempts to close the trip
- **WHEN** a participant with the `participant` role attempts to close the trip
- **THEN** the system rejects the operation and reports that admin permissions are required
