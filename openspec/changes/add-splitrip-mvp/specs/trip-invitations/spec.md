## Purpose

Brings travellers into a trip with as little friction as possible: the organiser shares a link or a QR code, and whoever opens it joins by typing only their name, with no account to create and no password to remember. It also covers withdrawing that access.

## ADDED Requirements

### Requirement: Invitation generation
The system SHALL allow an `admin` of a trip in the `open` state to generate an invitation. Every invitation SHALL carry the role (`admin` or `participant`) that its user will join with, SHALL have a unique and unguessable URL, and SHALL be presentable as a QR code as well as a copyable link.

#### Scenario: Generating a participant invitation
- **WHEN** an `admin` generates an invitation with the `participant` role
- **THEN** the system returns a unique URL and its QR code representation
- **AND** the invitation is recorded as active and bound to that trip and that role

#### Scenario: Generating an admin invitation
- **WHEN** an `admin` generates an invitation with the `admin` role
- **THEN** whoever uses that invitation joins the trip with the `admin` role

#### Scenario: Participant attempts to generate an invitation
- **WHEN** a participant with the `participant` role attempts to generate an invitation
- **THEN** the system rejects the operation and reports that admin permissions are required

#### Scenario: Unguessable link
- **WHEN** the system generates an invitation identifier
- **THEN** that identifier has at least 128 bits of entropy and is produced by a cryptographically secure generator

### Requirement: Joining a trip without an account
The system SHALL allow anyone opening an active invitation to join the trip by providing only a display name. The system SHALL NOT require a password, an email address or any external verification to complete joining.

#### Scenario: Successful join
- **WHEN** a person opens an active invitation and enters the name "Ana"
- **THEN** the system records them as a participant of the trip with the role carried by the invitation
- **AND** takes them to the trip screen, where they can already view and record expenses

#### Scenario: Empty name
- **WHEN** a person attempts to join without providing a name
- **THEN** the system rejects the join and reports that the name is required

#### Scenario: Name already used in the same trip
- **WHEN** a person attempts to join with a name already used by another participant of the same trip, ignoring case and surrounding whitespace
- **THEN** the system rejects the join and reports that the name is already taken in this trip

#### Scenario: Missing or malformed invitation
- **WHEN** a person opens an invitation URL that matches no invitation
- **THEN** the system shows a message stating that the invitation is not valid, and discloses no information about any trip

### Requirement: Handing the application to somebody already on the trip
When a person opens an invitation and gives a name matching a participant of that trip who holds no session, the system SHALL bind their device to that participant rather than creating a second one, keeping the role, the expenses and the balance that participant already has. The system SHALL tell them apart from a name taken by a participant who is already using the application, because displacing somebody's device and taking up an unused place are not the same act.

#### Scenario: A participant added by the organiser starts using the application
- **WHEN** somebody the `admin` added by name opens an invitation and gives that same name
- **THEN** the system binds their session to the participant that already exists
- **AND** the expenses, splits and balance recorded against that participant are theirs, unchanged and not duplicated

#### Scenario: The role on the row wins
- **WHEN** the participant they bind to holds a role different from the one the invitation carries
- **THEN** the system keeps the role the participant already had

#### Scenario: Told apart from a name in use
- **WHEN** the matching participant is already using the application from a device
- **THEN** the system reports that the name is in use, which is a different message from an unused place

### Requirement: Identity persistence on the device
After joining a trip, the system SHALL issue the participant a session credential stored on their device, so that later visits reach the trip without identifying again. That credential SHALL grant access only to the trips the person takes part in.

#### Scenario: Returning to the trip from the same device
- **WHEN** a participant who already joined reopens the application on the same device
- **THEN** the system recognises them and shows their trips directly, without asking for a name again

#### Scenario: Access from a device with no credential
- **WHEN** a person opens a trip URL on a device that holds no credential for that trip
- **THEN** the system does not show the trip data and offers the join path through an invitation

#### Scenario: Reusing the invitation from a second device
- **WHEN** an already joined participant reopens the same invitation from another device and enters exactly the name they are registered under
- **THEN** the system offers to continue as that existing participant instead of creating a duplicate
- **AND** on confirmation, issues a credential for that participant on the new device

### Requirement: Invitation revocation and expiry
The system SHALL allow an `admin` to revoke an active invitation. A revoked or expired invitation SHALL NOT allow further joins, and SHALL leave untouched the participants who already joined through it.

#### Scenario: Revoking an invitation
- **WHEN** an `admin` revokes an invitation
- **THEN** any later attempt to use that URL is rejected with an invalid invitation message
- **AND** the participants who had already joined through it keep their access

#### Scenario: Expired invitation
- **WHEN** a person opens an invitation whose expiry date has passed
- **THEN** the system rejects the join and states that the invitation has expired

#### Scenario: Invitation to a closed trip
- **WHEN** a person opens an invitation to a trip in the `closed` state
- **THEN** the system rejects the join and reports that the trip is closed

### Requirement: Removing participants
The system SHALL allow an `admin` to remove a participant from a trip in the `open` state. If that participant has any expense, payment or expense share attached to them, the system SHALL NOT delete them: it SHALL reject the removal and state what prevents them from leaving, so that balances are never left inconsistent.

#### Scenario: Removing a participant with no financial activity
- **WHEN** an `admin` removes a participant who has paid no expense and appears in no expense share
- **THEN** the system removes them from the trip and their credential stops granting access to it

#### Scenario: Removing a participant with expenses
- **WHEN** an `admin` attempts to remove a participant who has paid at least one expense or takes part in the share of one
- **THEN** the system rejects the removal and reports how many expenses involve them
