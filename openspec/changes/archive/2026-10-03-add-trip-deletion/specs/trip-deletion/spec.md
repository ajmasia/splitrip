## Purpose

Lets a trip's organiser remove a trip for good — one created by mistake, one opened to try the application, or one whose accounts were settled long ago — and makes sure everybody else on it is told rather than left looking at a trip that no longer exists.

## ADDED Requirements

### Requirement: An organiser deletes a trip
The system SHALL allow an `admin` of a trip to delete it, whether the trip is `open` or `closed` and whatever it contains. It SHALL NOT allow a `participant` of the trip, or anybody who is not on it, to delete it.

#### Scenario: An organiser deletes an open trip
- **WHEN** an `admin` of an open trip with expenses and payments deletes it, confirming its name
- **THEN** the trip no longer exists and the organiser is taken to their trip list, which no longer shows it

#### Scenario: An organiser deletes a closed trip
- **WHEN** an `admin` of a closed trip deletes it, confirming its name
- **THEN** the trip no longer exists, its frozen summary included

#### Scenario: A participant tries to delete
- **WHEN** a participant with the `participant` role attempts to delete the trip
- **THEN** the system rejects the operation and the trip is unchanged

#### Scenario: Somebody outside the trip tries to delete
- **WHEN** somebody who is not on a trip attempts to delete it
- **THEN** the system rejects the operation and the trip is unchanged

#### Scenario: The control is the organiser's
- **WHEN** a participant with the `participant` role views a trip
- **THEN** the system offers them no way to delete it

### Requirement: Deleting asks for the trip's name
Because a deleted trip cannot be brought back, the system SHALL delete a trip only when the organiser has typed its name to confirm, compared without regard to surrounding whitespace or letter case. It SHALL say beforehand that the deletion removes the trip and everything in it for every participant and cannot be undone. A confirmation that does not match SHALL be rejected by the system itself, not only by the form.

#### Scenario: The name matches
- **WHEN** the organiser of the trip "Lisboa 2026" types `lisboa 2026 ` and confirms
- **THEN** the trip is deleted

#### Scenario: The name does not match
- **WHEN** the organiser of the trip "Lisboa 2026" types `Lisboa` and confirms
- **THEN** the system rejects the deletion, says that the name does not match, and the trip is unchanged

#### Scenario: Before confirming
- **WHEN** the organiser starts deleting a trip
- **THEN** the system tells them that the trip and everything in it will be removed for every participant and that this cannot be undone, before anything is deleted

### Requirement: Everything in the trip goes with it
Deleting a trip SHALL remove, for every participant, everything that belongs to it: its participants, expenses with their shares, payments, activity, invitations and the summary frozen when it was closed. It SHALL leave every other trip, and every account, as it was.

#### Scenario: Nothing of the trip remains
- **WHEN** a trip with participants, expenses, payments, activity entries and invitations is deleted
- **THEN** none of its participants, expenses, shares, payments, activity entries or invitations remain

#### Scenario: Other trips are untouched
- **WHEN** a trip is deleted and its organiser and participants are also on another trip
- **THEN** the other trip, its expenses, payments and balances are unchanged

#### Scenario: Accounts stay
- **WHEN** a trip is deleted
- **THEN** the organiser's account and every other account that was on it still exist and can still sign in

#### Scenario: Its invitations stop working
- **WHEN** somebody opens an invitation link of a deleted trip
- **THEN** the system tells them that the invitation no longer works

### Requirement: Participants are told the trip is gone
When a trip is deleted, the system SHALL take anybody who has one of its screens open back to their trip list, with a notice that the trip was deleted, without them having to reload. It SHALL NOT act on such an announcement unless the trip is in fact gone. Somebody who opens one of its screens later SHALL be told it cannot be reached, as for any trip they are not on.

#### Scenario: A participant has the trip open
- **WHEN** the organiser deletes a trip while another participant has its screen open on another device
- **THEN** that participant is taken to their trip list with a notice that the trip was deleted, without reloading

#### Scenario: The trip disappears from every list
- **WHEN** a trip has been deleted
- **THEN** it appears in no participant's trip list

#### Scenario: An old link
- **WHEN** a participant opens a link to a screen of a deleted trip
- **THEN** the system tells them there is nothing there, as for a trip they are not on

#### Scenario: A false announcement
- **WHEN** a participant's screen receives an announcement that their trip was deleted while the trip still exists
- **THEN** the participant stays on the trip
