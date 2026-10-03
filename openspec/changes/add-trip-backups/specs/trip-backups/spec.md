## Purpose

Gives organisers a copy of their trips in their own hands: a file they download from the trip and from which somebody allowed to open trips can create it again, on the same instance or another, with everything recorded in it.

## ADDED Requirements

### Requirement: An organiser downloads a trip

An `admin` of a trip SHALL be able to download, from the trip's screen and at any time whether the trip is open or closed, a single file holding the trip's name, dates, currency, state and, when closed, its frozen summary; its participants by name and role; its expenses with their shares; its payments, voided ones included; and its activity. The file SHALL hold no device identity, account, email address or invitation. A `participant` SHALL not be offered the download, and SHALL be refused it if they ask anyway.

#### Scenario: Downloading an open trip

- **WHEN** an organiser downloads a trip with expenses of both types and payments
- **THEN** they receive one file named after the trip and the date, holding all of the above

#### Scenario: A participant cannot download

- **WHEN** a `participant` of a trip opens its screen, or requests its download directly
- **THEN** no download is offered, and the direct request is refused

#### Scenario: Nothing that identifies a device

- **WHEN** an organiser downloads a trip whose participants joined from their phones
- **THEN** the file holds their names and roles and no identifier of their devices, accounts or email addresses

### Requirement: A trip is created from a backup

Anybody allowed to open trips SHALL be able to create a trip from a backup file from the trip list, choosing which of the file's participants they are. The new trip SHALL hold everything the file holds, as it was: amounts and shares to the cent, dates, payments and voided payments, the state and a closed trip's frozen summary, and the activity, followed by one entry saying the trip was restored and by whom. The chosen participant SHALL become the uploader's place, with the role `admin`. Every other participant SHALL be a place with nobody in it, keeping their name, role and everything recorded against them. Somebody not allowed to open trips SHALL be refused, and nothing created.

#### Scenario: Restoring a trip

- **WHEN** somebody allowed to open trips uploads a backup and chooses the participant named Tyrion
- **THEN** a new trip exists with every expense, share, payment, balance and activity entry of the file, Tyrion's place is theirs as organiser, and the other participants are places with nobody in them

#### Scenario: Claiming a place in a restored trip

- **WHEN** the organiser of a restored trip invites a participant and that person joins choosing their name
- **THEN** they take up their place with every expense and balance the backup held for them

#### Scenario: Restoring a closed trip

- **WHEN** a backup of a closed trip is uploaded
- **THEN** the new trip is closed, with the same frozen summary

#### Scenario: Somebody who cannot open trips

- **WHEN** a signed-in user not allowed to open trips uploads a backup
- **THEN** it is refused and no trip is created

#### Scenario: The same file twice

- **WHEN** the same backup is uploaded twice
- **THEN** two separate trips exist, sharing nothing

### Requirement: A bad file is refused whole

The system SHALL check an uploaded file before creating anything, and SHALL refuse it, creating nothing, when it is not a trip backup, when it is damaged or incomplete, when it comes from a format newer than the system reads, when its shares do not add up to their expenses or reference somebody not in the file, or when the chosen participant is not in the file. The refusal SHALL say which of these it is. Files written by earlier releases SHALL keep being accepted.

#### Scenario: Not a backup

- **WHEN** a photo or an arbitrary JSON file is uploaded
- **THEN** it is refused as not a trip backup, and no trip is created

#### Scenario: Numbers that do not add up

- **WHEN** a backup whose shares for one expense add up to one cent less than the expense is uploaded
- **THEN** it is refused as inconsistent, and no trip is created

#### Scenario: A newer format

- **WHEN** a backup from a format newer than the instance reads is uploaded
- **THEN** it is refused, saying the instance needs updating to read it
