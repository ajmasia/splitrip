## Why

Splitrip is about to reach its first real groups, and what they run into — a figure that looks wrong, a screen that does not fit a phone, a feature they reach for and do not find — is exactly what should shape the next release. Today the only way that reaches whoever runs the instance is a chat message, sent later if at all, without the screen, the version or the trip it was about. Asking from inside the application, at the moment something happens, is the cheapest way to hear it while it is still fresh.

## What Changes

- **A feedback button on every screen.** Anybody using the application, organiser or participant, signed in or holding only a device identity, can open a short form from any screen: a free-text message and an optional kind — something is broken, an idea, something else.
- **Context sent with it, and said so.** The submission carries the screen it was sent from, the application version, the interface language and, when it was sent from inside a trip the sender belongs to, that trip. The form states what is sent alongside the message, so nobody is surprised by it.
- **Sending needs no account.** Whoever has no session yet, on the public entry page for instance, is given a device identity when they send, the same way joining a trip does it — never on merely viewing a page.
- **Limits against abuse.** A message has a maximum length, and one identity can send only a few messages in a given window. Anonymous identities are free to obtain, so both limits are enforced by the database, not by the form.
- **Operators: who runs the instance.** A new instance-level list of operators, kept by email like the list of addresses allowed to open trips. Being an operator is unrelated to organising any trip: the feedback is about the application, so it reaches whoever runs it.
- **An operators' feedback screen.** Operators get a read-only screen listing every message newest first, with its kind, its context and when it was sent. Nobody else can read feedback — not the sender afterwards, not a trip's organisers.
- **Bilingual**, in Spanish and English like the rest of the interface.

### Out of scope

- **Notifying operators** by email or otherwise when feedback arrives. They read it on the screen; a notification channel is a separate decision with its own costs.
- **Replying to the sender**, or the sender seeing their past messages. The sender may hold only a device identity with no address to reply to.
- **Triage**: marking messages as read, resolved or assigned, deleting them, or filtering the list. The list is short at first; triage comes when it is not.
- **Attachments**, such as screenshots.
- **Managing operators from the interface.** Like the list of trip creators, it is edited in the database by whoever runs the instance.

## Capabilities

### New Capabilities

- `instance-operators`: who operates a Splitrip instance — an email-keyed list, separate from trip roles — and how an operator is recognised from a signed-in session.
- `user-feedback`: sending feedback from any screen with its automatic context and its limits, and operators reading it.

### Modified Capabilities

None. The feedback button joins the shared application frame, which no current requirement describes, and no existing behaviour changes.

## Impact

- **Database**: new migration with an operators table, a `feedback` table with Row Level Security (insert through a function only, select for operators only), a function that submits feedback enforcing length, rate and trip-membership rules, and a helper that tells whether the caller is an operator. New pgTAP tests.
- **Server**: a server action that mints a device identity when the sender has none, then submits; a query for the operators' list.
- **Interface**: a feedback entry point in the shared application frame, the feedback form page, the operators' feedback page and a link to it shown only to operators. New copy in both language catalogues; new database error codes mapped in the error table.
- **Dependencies**: none new.
