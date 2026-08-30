## Purpose

Makes the application behave like a phone app rather than a web page: it installs to the home screen, starts fast, and is usable one-handed and on the move, which is how expenses get logged during a trip. It also covers the other half of the product's life — the organiser preparing the trip from a desktop browser — by adapting the interface density to the viewport rather than stretching a phone layout across a wide screen.

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
- **THEN** the application works normally, with the layout adapted to the wider viewport

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

### Requirement: Phone interface
On phone-sized viewports the interface SHALL be laid out for one-handed use on the move: thumb-reachable navigation, touch targets of at least 44 pixels on a side, forms that require no zooming, content stacked in a single column, and the record-an-expense action reachable from the main trip screen.

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

### Requirement: Desktop interface density
On desktop-sized viewports the interface SHALL raise its information density rather than stretch the phone layout: lists that are stacked cards on a phone SHALL be presented as tables with their columns visible, and the content SHALL be constrained to a readable measure instead of spanning the full window width. The same data and the same actions SHALL be available in both layouts.

#### Scenario: Expense list on a desktop
- **WHEN** a participant opens the trip expense list on a desktop-sized viewport
- **THEN** the expenses are presented as a table with date, description, amount, payer and split visible as columns
- **AND** the same list on a phone-sized viewport is presented as stacked cards

#### Scenario: No loss of capability on either layout
- **WHEN** the same trip is opened on a phone and on a desktop by the same participant
- **THEN** every action available in one layout is available in the other

#### Scenario: Wide window
- **WHEN** the application is displayed in a very wide browser window
- **THEN** the content is constrained to a readable measure rather than stretched across the full width

### Requirement: Organiser tools appear by role and viewport
Interface affordances built for preparing a trip at a desk — successive expense entry and the dense expense tables of the organiser dashboard — SHALL be offered only to participants with the `admin` role on desktop-sized viewports. An `admin` on a phone-sized viewport SHALL be shown the trip interface by default. The organiser dashboard SHALL remain reachable on a phone in a compact, stacked form: an `admin` SHALL never be denied their own trip data because of their screen size.

#### Scenario: Organiser at a desk
- **WHEN** a participant with the `admin` role opens the trip on a desktop-sized viewport
- **THEN** the organiser tools are offered, including successive expense entry

#### Scenario: Organiser on a phone during the trip
- **WHEN** a participant with the `admin` role opens the trip on a phone-sized viewport
- **THEN** the trip interface is shown by default, without the desk-oriented tools
- **AND** the organiser dashboard remains reachable, laid out in a compact stacked form

#### Scenario: Participant on a desktop
- **WHEN** a participant with the `participant` role opens the trip on a desktop-sized viewport
- **THEN** the denser desktop layout is used
- **AND** no organiser tool is offered

### Requirement: Light and dark appearance
The system SHALL present the interface in a light and a dark palette, following the reader's operating system unless they say otherwise. It SHALL offer a persistent control to choose light or dark explicitly, and to return to following the system. The choice SHALL survive a reload and SHALL apply from the first paint, without the interface appearing briefly in the other palette.

#### Scenario: Following the operating system
- **WHEN** somebody who has chosen nothing opens the application on a device set to dark
- **THEN** the system shows the dark palette
- **AND** shows the light one on a device set to light

#### Scenario: Overriding the operating system
- **WHEN** a reader on a device set to light chooses the dark appearance
- **THEN** the system shows the dark palette
- **AND** keeps showing it after a reload and on the next visit

#### Scenario: Returning to the operating system
- **WHEN** a reader who had chosen an appearance sets the control back to following the system
- **THEN** the system shows the palette their device asks for

### Requirement: Updating the installed application
The system SHALL detect when a new version has been published and SHALL apply it without the user having to uninstall and reinstall the application.

#### Scenario: New version available
- **WHEN** a new version is published and the user opens the installed application
- **THEN** the system loads the new version, prompting the user if a reload is needed to complete it
