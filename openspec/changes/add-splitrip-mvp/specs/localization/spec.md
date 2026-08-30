## Purpose

Lets the application be used in either Spanish or English, so that a travel group with people of different languages can share the same trip while each person sees the interface in their own language.

## ADDED Requirements

### Requirement: Supported languages and default language
The system SHALL offer the complete interface in Spanish and in English. Spanish SHALL be the default language: where no applicable preference can be determined, the interface SHALL be shown in Spanish.

#### Scenario: Language cannot be determined
- **WHEN** a user with no stored preference opens the application and their browser declares a language that is neither Spanish nor English
- **THEN** the system shows the interface in Spanish

#### Scenario: Translation coverage
- **WHEN** any screen of the application is shown in English
- **THEN** every visible text on it appears in English, with no untranslated literals

### Requirement: Device language detection
In the absence of an explicit user preference, the system SHALL select the language from the language declared by the browser, where it matches one of the supported languages.

#### Scenario: Browser in English
- **WHEN** a user with no stored preference opens the application in a browser configured in English
- **THEN** the system shows the interface in English

#### Scenario: Browser in Spanish
- **WHEN** a user with no stored preference opens the application in a browser configured in Spanish
- **THEN** the system shows the interface in Spanish

### Requirement: Manual language switching
The system SHALL allow the user to change the interface language at any time. The chosen preference SHALL be kept on the device and SHALL take precedence over the browser-declared language on later visits.

#### Scenario: Switching language
- **WHEN** a user switches the language from Spanish to English
- **THEN** the interface switches to English without losing the context they were in

#### Scenario: Preference persistence
- **WHEN** a user who chose English reopens the application on the same device, with the browser configured in Spanish
- **THEN** the system shows the interface in English

### Requirement: Language is independent between participants
Language SHALL be a per-device preference and SHALL NOT affect what other participants of the trip see. User-entered data — trip names, expense descriptions, participant names — SHALL always be shown exactly as written, untranslated.

#### Scenario: Two participants with different languages
- **WHEN** one participant uses the application in English and another on the same trip uses it in Spanish
- **THEN** each sees the interface in their own language
- **AND** both see the same expense descriptions and amounts, with the entered text unaltered

#### Scenario: Expense description in another language
- **WHEN** a participant records an expense with the description "Dinner" and another views the trip in Spanish
- **THEN** the second one sees the description "Dinner" exactly as written

### Requirement: Amount and date formatting by language
The system SHALL format monetary amounts and dates according to the conventions of the active language, keeping the euro as the currency in both languages.

#### Scenario: Amount in Spanish
- **WHEN** an amount of 1055 cents is shown with the interface in Spanish
- **THEN** the system presents it as "10,55 €"

#### Scenario: Amount in English
- **WHEN** that same amount is shown with the interface in English
- **THEN** the system presents it using English conventions, with the corresponding decimal separator and the euro symbol

#### Scenario: Dates
- **WHEN** the date of an expense is shown
- **THEN** the system formats it according to the conventions of the active language
