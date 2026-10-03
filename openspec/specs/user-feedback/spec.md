# user-feedback Specification

## Purpose
Lets anybody using Splitrip tell whoever runs the instance what went wrong or what they would like, from the screen where it happened, and lets the instance's operators read it.

## Requirements

### Requirement: Feedback is reachable from every screen
The system SHALL offer, on every screen of the application, a way to open the feedback form, to anybody using it: an organiser, a participant, a signed-in account or somebody with no session at all. It SHALL meet the same touch-target and viewport rules as the rest of the interface.

#### Scenario: From inside a trip
- **WHEN** a participant is on any screen of a trip
- **THEN** the system offers them a way to open the feedback form

#### Scenario: Before having a session
- **WHEN** somebody with no session is on the public entry page
- **THEN** the system offers them a way to open the feedback form

#### Scenario: On a phone
- **WHEN** the feedback entry point is shown on a 360-pixel-wide viewport
- **THEN** it is at least 44 pixels tall and causes no horizontal scrolling

### Requirement: Sending feedback
The system SHALL accept a feedback message of between 1 and 2,000 characters once surrounding whitespace is removed, with an optional kind among "something is broken", "an idea" and "something else", defaulting to the last. After a message is accepted the system SHALL confirm it to the sender and offer them the way back to where they came from.

#### Scenario: A message is sent
- **WHEN** somebody writes a message, picks the kind "an idea" and sends it
- **THEN** the system stores it with that kind and confirms that it was sent

#### Scenario: No kind chosen
- **WHEN** somebody sends a message without choosing a kind
- **THEN** the system stores it with the kind "something else"

#### Scenario: An empty message
- **WHEN** somebody sends a message that is empty or only whitespace
- **THEN** the system rejects it, says that a message is required, and keeps nothing

#### Scenario: A message that is too long
- **WHEN** somebody sends a message longer than 2,000 characters
- **THEN** the system rejects it, says what the limit is, and keeps what they typed in the form

### Requirement: Context sent with the message
Each accepted message SHALL be stored with the screen it was sent from, the application version, the interface language and the moment it was received. When it is sent from inside a trip the sender takes part in, it SHALL also be stored with that trip; a trip the sender does not take part in SHALL NOT be recorded, whatever the form submitted. The form SHALL state, before sending, what is sent alongside the message.

#### Scenario: Sent from a trip screen
- **WHEN** a participant sends feedback from one of their trip's screens
- **THEN** the message is stored with that screen, that trip, the application version and their interface language

#### Scenario: A trip the sender is not in
- **WHEN** a submission names a trip its sender does not take part in
- **THEN** the message is stored without a trip

#### Scenario: Told what is sent
- **WHEN** somebody opens the feedback form
- **THEN** the form lists what will be sent with their message before they send it

### Requirement: Sending needs no account
The system SHALL accept feedback from a session holding only a device identity. Somebody who has no session when they send SHALL be given a device identity at that moment; merely opening the form or any other screen SHALL NOT issue one.

#### Scenario: A participant without an account
- **WHEN** a participant who joined through an invitation sends feedback
- **THEN** the system accepts it

#### Scenario: Nobody has a session yet
- **WHEN** somebody with no session opens the feedback form without sending it
- **THEN** no identity is issued

#### Scenario: Sending without a session
- **WHEN** somebody with no session sends a valid message
- **THEN** the system issues them a device identity and accepts the message

### Requirement: Limits against abuse
The system SHALL accept at most 5 messages from the same identity within any hour, and SHALL enforce this and the length limit on the server, whatever the form allows. A rejected submission SHALL say why and SHALL keep nothing.

#### Scenario: Within the limit
- **WHEN** an identity sends its fifth message within an hour
- **THEN** the system accepts it

#### Scenario: Over the limit
- **WHEN** an identity sends a sixth message within the same hour
- **THEN** the system rejects it, says to try again later, and keeps nothing

#### Scenario: Bypassing the form
- **WHEN** a submission over 2,000 characters reaches the server without going through the form
- **THEN** the system rejects it

### Requirement: Operators read feedback
The system SHALL offer operators a screen listing every feedback message, newest first, each with its message, its kind, when it was received, the screen it was sent from, the application version, the interface language and, when there is one, the trip. The system SHALL NOT let anybody who is not an operator read any feedback, the sender included.

#### Scenario: An operator reads feedback
- **WHEN** an operator opens the feedback screen
- **THEN** the system lists every message newest first with its kind and its context

#### Scenario: No feedback yet
- **WHEN** an operator opens the feedback screen and nothing has been sent
- **THEN** the system shows an empty state without errors

#### Scenario: Somebody who is not an operator
- **WHEN** a session that is not an operator's opens the feedback screen
- **THEN** the system discloses no feedback and does not reveal whether any exists

#### Scenario: The sender afterwards
- **WHEN** somebody who sent feedback tries to read it back
- **THEN** the system discloses no feedback

#### Scenario: Only operators are pointed at it
- **WHEN** an operator is using the application
- **THEN** the system offers them a way to the feedback screen, which it offers to nobody else
