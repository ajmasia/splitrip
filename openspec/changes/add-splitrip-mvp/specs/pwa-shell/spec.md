## Purpose

Makes the application behave like a phone app rather than a web page: it installs to the home screen, starts fast, and its interface is built to be used one-handed and on the move, which is how expenses actually get logged during a trip.

## ADDED Requirements

### Requirement: Installable application
The system SHALL publish a web app manifest with a name, icons in the sizes required by iOS and Android, a theme colour and a standalone display mode, so that the browser offers to install it to the home screen.

#### Scenario: Installation on Android
- **WHEN** a user opens the application in a supported Android browser
- **THEN** the browser offers to add it to the home screen
- **AND** opening it from there displays it without the browser address bar

#### Scenario: Installation on iOS
- **WHEN** a user uses "Add to Home Screen" in Safari on iOS
- **THEN** the application appears with its icon and its name
- **AND** opening it displays it full screen, without the browser interface

#### Scenario: Use from a desktop browser
- **WHEN** a user opens the application in a desktop browser
- **THEN** the application works normally, adapting the width of the interface

### Requirement: Fast start and offline behaviour
The system SHALL cache the static interface assets through a service worker, so that the application opens without waiting for the network. Where there is no connection, the system SHALL show a clear message instead of a browser error, and SHALL prevent expenses from being recorded until the connection is restored.

#### Scenario: Second opening of the application
- **WHEN** a user who has already visited the application opens it again
- **THEN** the interface is shown from cache without waiting for the static assets to download

#### Scenario: Opening with no connection
- **WHEN** a user opens the installed application with no internet connection
- **THEN** the system shows the interface and a notice that there is no connection, instead of a browser error page

#### Scenario: Attempting to record an expense with no connection
- **WHEN** a user attempts to record an expense with no connection
- **THEN** the system informs them that a connection is required and does not treat the expense as recorded

### Requirement: Mobile-first interface
The interface SHALL be designed for phone screens as the primary case: thumb-reachable navigation, touch targets of at least 44 pixels on a side, forms that require no zooming, and the record-an-expense action reachable from the main trip screen.

#### Scenario: Recording an expense in few taps
- **WHEN** a participant with the trip open wants to record an expense
- **THEN** an add-expense action is visible on the main trip screen
- **AND** they can complete the recording by providing only a description and an amount, accepting the remaining defaults

#### Scenario: Interface on a narrow screen
- **WHEN** the application is displayed on a 360-pixel-wide screen
- **THEN** all content is readable and usable without horizontal scrolling

#### Scenario: Amount entry
- **WHEN** a participant taps the amount field
- **THEN** the device shows a numeric keypad

### Requirement: Updating the installed application
The system SHALL detect when a new version has been published and SHALL apply it without the user having to uninstall and reinstall the application.

#### Scenario: New version available
- **WHEN** a new version is published and the user opens the installed application
- **THEN** the system loads the new version, prompting the user if a reload is needed to complete it
