## Purpose

Names the version of the application a person is using — the release an instance was built from — and shows it to them, so that what is running can be told from the screen and everything that records the version records the right one.

## ADDED Requirements

### Requirement: A deployed instance is the release it was built from

The application's version SHALL be the release it was built from whenever it is built from a release, release candidates included, whatever version the project's package manifest names. A build made from no release SHALL take its version from the package manifest.

#### Scenario: A release candidate is installed or updated to

- **WHEN** an instance is installed at, or updated to, the release `0.13.0-rc.16` while the package manifest names `0.12.0`
- **THEN** the application's version is `0.13.0-rc.16`

#### Scenario: A build with no release behind it

- **WHEN** the application is built or run in development outside the installer and `update`
- **THEN** the application's version is the one the package manifest names

#### Scenario: Moving back to an earlier release

- **WHEN** an instance is moved back from `0.13.0-rc.16` to `0.13.0-rc.15`, both built with this change
- **THEN** the application's version is `0.13.0-rc.15`

### Requirement: The version is shown on every screen

The application SHALL show its name and its version at the foot of every screen of the shared frame — signed in or not, inside a trip or not, on the feedback form and on the operators' screen — unobtrusively, without pushing the screen wider than a 360 pixel viewport.

#### Scenario: Reading the version on the public entry page

- **WHEN** somebody who is not signed in opens the public entry page of an instance running `0.13.0-rc.16`
- **THEN** the foot of the page reads `Splitrip 0.13.0-rc.16`

#### Scenario: Reading the version inside a trip

- **WHEN** a participant opens a screen of a trip
- **THEN** the foot of the screen shows the same name and version, below the trip's content and clear of any bar pinned to the bottom of a phone

#### Scenario: Reading the version where there is no feedback link

- **WHEN** somebody opens the feedback form, or an operator opens the operators' screen
- **THEN** the version is shown at the foot of the screen there too

### Requirement: What records the version records the running release

Everything the application stores or names by its version — the feedback it receives and the cache of its offline shell — SHALL use the version defined by this capability, so that it changes on every release, candidates included.

#### Scenario: Feedback sent from a release candidate

- **WHEN** somebody sends feedback from an instance running `0.13.0-rc.16`
- **THEN** the message is stored with the version `0.13.0-rc.16`

#### Scenario: Updating from one candidate to the next

- **WHEN** an instance is updated from `0.13.0-rc.16` to `0.13.0-rc.17` and the installed application is opened again
- **THEN** the application offers the update, and once it is applied the offline shell's cache is the one named for `0.13.0-rc.17` and the cache named for `0.13.0-rc.16` is gone
