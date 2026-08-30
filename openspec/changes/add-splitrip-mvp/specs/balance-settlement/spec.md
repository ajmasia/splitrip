## Purpose

Turns a trip's list of expenses into an actionable answer: how much each person put in, how much they owe, and which concrete transfers will leave nobody owing anybody. It also covers recording the payments with which the group settles those debts.

## ADDED Requirements

### Requirement: Exact split of an expense in cents
The system SHALL split the amount of a `shared` expense equally among the participants of its split, operating in integer cents. Where the amount does not divide exactly, it SHALL distribute the leftover cents one by one following a stable, reproducible order, so that the sum of the shares SHALL always equal the expense amount exactly.

#### Scenario: Amount that divides exactly
- **WHEN** a €60.00 expense is split among 4 participants
- **THEN** the system charges €15.00 to each
- **AND** the sum of the four shares is exactly €60.00

#### Scenario: Amount with leftover cents
- **WHEN** a €10.00 expense is split among 3 participants
- **THEN** the system charges €3.34 to one participant and €3.33 to each of the other two
- **AND** the sum of the three shares is exactly €10.00

#### Scenario: Reproducible split
- **WHEN** the shares of the same unchanged expense are computed twice
- **THEN** the system assigns the leftover cents to the same participants in both computations

### Requirement: Each participant's balance
The system SHALL compute, for every participant of the trip, the total they have paid, the total charged to them by the splits they appear in, and their net balance as the difference between the two. A positive balance SHALL mean the group owes them money; a negative one, that they owe money to the group. The sum of the net balances of all participants SHALL always be exactly zero.

#### Scenario: Balance of someone who fronted money
- **WHEN** a participant has paid €100.00 in expenses and is charged €40.00 by the splits
- **THEN** the system shows them a net balance of +€60.00, meaning the group owes them that amount

#### Scenario: Balance of someone who paid nothing
- **WHEN** a participant has paid no expense and is charged €40.00 by the splits
- **THEN** the system shows them a net balance of -€40.00, meaning they owe that amount to the group

#### Scenario: Balances always reconcile
- **WHEN** the system computes the balances of a trip with any combination of expenses, contributions and payments
- **THEN** the sum of the net balances of all participants is exactly zero

### Requirement: Contributions create no debt
The system SHALL NOT include expenses of type `contribution` in the balance of any participant, not even that of their payer. Such expenses SHALL count only towards the total spent on the trip.

#### Scenario: Contribution by a participant
- **WHEN** a participant pays a €300.00 contribution and no other expense
- **THEN** their net balance from that expense is €0.00
- **AND** the total spent on the trip includes those €300.00

### Requirement: Settlement proposal
The system SHALL propose, from the current balances, a set of concrete transfers of the form "X pays €N to Y" that brings every balance to zero. The number of proposed transfers SHALL be at most the number of participants with a non-zero balance minus one.

#### Scenario: Settling a trip with open balances
- **WHEN** a participant views the settlement of a trip where Ana holds +€60.00, Beto -€40.00 and Carla -€20.00
- **THEN** the system proposes that Beto pays €40.00 to Ana and that Carla pays €20.00 to Ana
- **AND** applying those transfers would bring every balance to zero

#### Scenario: Already settled trip
- **WHEN** a participant views the settlement of a trip where every balance is zero
- **THEN** the system states that nothing is outstanding and proposes no transfer

#### Scenario: Viewing at any point of the trip
- **WHEN** a participant views the settlement while the trip is still under way
- **THEN** the system computes the proposal from the expenses recorded up to that moment, without requiring the trip to be closed

### Requirement: Recording payments between participants
The system SHALL allow recording a payment from one participant to another for a given amount. A recorded payment SHALL change the balance of both parties, and therefore the settlement proposal. Payer and payee SHALL be distinct participants of the same trip, and the amount SHALL be greater than zero.

#### Scenario: Recording a payment that clears a debt
- **WHEN** Beto, holding -€40.00, records a €40.00 payment to Ana, who held +€40.00
- **THEN** the balance of both becomes €0.00
- **AND** the settlement no longer proposes that transfer

#### Scenario: Partial payment
- **WHEN** Beto, holding -€40.00, records a €25.00 payment to Ana
- **THEN** Beto's balance becomes -€15.00 and Ana's is reduced by the same amount
- **AND** the settlement proposes the remaining €15.00 transfer

#### Scenario: Payment to oneself
- **WHEN** a payment is submitted whose payer and payee are the same person
- **THEN** the system rejects the operation

#### Scenario: Voiding a wrongly recorded payment
- **WHEN** a participant voids a payment they recorded, or an `admin` voids any payment of the trip
- **THEN** the system reverses its effect on the balance of both parties
- **AND** records the voiding in the trip activity

### Requirement: Viewing the state of debts
The system SHALL show any participant of the trip a view with the net balance of everyone and the outstanding transfers, highlighting explicitly what the current user has to pay or collect.

#### Scenario: A participant checks their position
- **WHEN** a participant holding -€40.00 opens the balances view
- **THEN** the system prominently shows them whom to pay and how much
- **AND** also shows the balance of the other participants

#### Scenario: Payment history
- **WHEN** a participant opens the trip payment history
- **THEN** the system lists the recorded payments with payer, payee, amount and date
