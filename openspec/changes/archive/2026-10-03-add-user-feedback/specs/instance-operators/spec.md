## Purpose

Says who operates a Splitrip instance — the people who run the deployment and look after it — independently of the roles anybody holds inside a trip.

## ADDED Requirements

### Requirement: Operators are listed by email
The system SHALL keep an instance-level list of operators identified by email address, compared without regard to letter case or surrounding whitespace, so that somebody can be made an operator before their account exists. The list SHALL be maintained by whoever runs the instance and SHALL NOT be readable or writable by any session through the application.

#### Scenario: Somebody listed before signing up
- **WHEN** an address is added to the operators list and its owner later creates an account with that address and signs in
- **THEN** the system recognises them as an operator

#### Scenario: The list is not exposed
- **WHEN** any session, operator or not, attempts to read or change the operators list through the application
- **THEN** the system returns no rows and changes nothing

### Requirement: Recognising an operator
The system SHALL treat a session as an operator's only when it is signed in to an account whose email address is on the operators list. A session holding only a device identity SHALL never be an operator's, whatever else it holds.

#### Scenario: A signed-in operator
- **WHEN** somebody signs in to an account whose address is on the operators list
- **THEN** the system recognises the session as an operator's

#### Scenario: A device identity
- **WHEN** a session holds only a device identity
- **THEN** the system does not recognise it as an operator's

#### Scenario: An account not on the list
- **WHEN** somebody signs in to an account whose address is not on the operators list
- **THEN** the system does not recognise the session as an operator's

### Requirement: Operating is independent of trip roles
Being an operator SHALL grant no access to any trip, and organising a trip SHALL NOT make anybody an operator.

#### Scenario: An operator outside a trip
- **WHEN** an operator who does not take part in a trip attempts to read it
- **THEN** the system discloses no trip data, as for anybody outside the trip

#### Scenario: An organiser who is not an operator
- **WHEN** a trip's `admin` whose address is not on the operators list attempts an operator's action
- **THEN** the system refuses it
