import type { Catalogue } from './catalogue'

export const en: Catalogue = {
  'app.name': 'Splitrip',
  'app.tagline': 'Shared travel expenses, settled in seconds.',
  'app.version': 'Version {version}',

  'language.label': 'Language',

  'connection.offline':
    'No connection. You are seeing what was last loaded, and nothing can be recorded.',
  'update.available': 'A new version is ready.',
  'update.apply': 'Update',

  'offline.heading': 'No connection',
  'offline.body': 'This screen could not be loaded. Try again once the connection is back.',

  'error.page.heading': 'Something went wrong',
  'error.page.body': 'This did not load. Trying again usually settles it.',
  'error.page.retry': 'Try again',
  'error.page.home': 'Go to the start',

  'notFound.heading': 'There is nothing here',
  'notFound.body': 'That link leads nowhere, or to a trip you are not part of.',

  'landing.heading': 'Settle up as the trip happens.',
  'landing.body':
    'Open a trip with your account, or come into one through an invitation somebody sent you.',

  'account.signIn': 'Sign in',
  'account.signOut': 'Sign out',

  'signIn.heading': 'Sign in',
  'signIn.email.label': 'Email',
  'signIn.password.label': 'Password',
  'signIn.submit': 'Sign in',
  'signIn.pending': 'Signing in…',
  'signIn.note':
    'An account is only needed to open trips. To come into one, an invitation is enough.',

  'trips.heading': 'Your trips',
  'trips.subtitle': 'The trips you take part in.',
  'trips.create': 'Create a trip',
  'trips.empty.title': 'You are not travelling with anyone yet',
  'trips.empty.body':
    'Create a trip and share the link, or come in through an invitation somebody sent you.',
  'trips.column.name': 'Trip',
  'trips.column.dates': 'Dates',
  'trips.column.people': 'People',
  'trips.column.role': 'Your part',
  'trips.column.status': 'State',
  'trips.column.spent': 'Spent',
  'trips.status.open': 'Under way',
  'trips.status.closed': 'Closed',
  'trips.role.admin': 'You organise',
  'trips.role.participant': 'You take part',
  'trips.people.one': '1 person',
  'trips.people.other': '{count} people',
  'trips.expenses.none': 'No expenses',
  'trips.expenses.one': '1 expense',
  'trips.expenses.other': '{count} expenses',
  'trips.dates.none': 'No dates',

  'newTrip.heading': 'Create a trip',
  'newTrip.name.label': 'Name of the trip',
  'newTrip.name.placeholder': 'Alsace at Christmas',
  'newTrip.you.label': 'What is your name?',
  'newTrip.you.placeholder': 'Sonia',
  'newTrip.you.hint': 'This is how the rest of the group will see you on this trip.',
  'newTrip.start.label': 'Starts',
  'newTrip.end.label': 'Ends',
  'newTrip.dates.hint': 'The dates are optional.',
  'newTrip.submit': 'Create the trip',
  'newTrip.pending': 'Creating…',
  'newTrip.cancel': 'Cancel',

  'expenses.heading': 'Expenses',
  'expenses.empty.title': 'No expenses yet',
  'expenses.empty.body': 'Record the first one and the split works itself out.',
  'expenses.column.date': 'Date',
  'expenses.column.description': 'What for',
  'expenses.column.payer': 'Who paid',
  'expenses.column.type': 'Type',
  'expenses.column.split': 'Split',
  'expenses.column.amount': 'Amount',
  'expenses.type.shared': 'Shared',
  'expenses.type.contribution': 'Treat',
  'expenses.split.none': 'Not split',

  'trip.back': 'Your trips',
  'trip.participants': 'Who is travelling',
  'trip.you': 'you',

  'trip.invite': 'Invite',
  'trip.role.promote': 'Make organiser',
  'trip.role.promote.label': 'Make {name} an organiser of the trip',
  'trip.role.demote': 'Make traveller',
  'trip.role.demote.label': 'Make {name} a traveller',
  'trip.role.changing': 'Changing…',
  'trip.remove': 'Remove',
  'trip.removing': 'Removing…',
  'trip.remove.label': 'Remove {name} from the trip',

  'invite.heading': 'Invite to the trip',
  'invite.body':
    'Share the link or show the QR code. Whoever opens it joins by typing only their name, with no account and no password.',
  'invite.role.label': 'What will they be?',
  'invite.role.participant': 'A traveller',
  'invite.role.admin': 'An organiser',
  'invite.role.hint':
    'An organiser can invite, correct any expense and close the trip. A traveller records their own.',
  'invite.create': 'Create an invitation',
  'invite.pending': 'Creating…',
  'invite.live': 'Live invitations',
  'invite.empty.title': 'No invitations yet',
  'invite.empty.body': 'Create one and pass it to whoever is travelling with you.',
  'invite.expires': 'Expires on {date}',
  'invite.link.label': 'Invitation link',
  'invite.qr.label': 'Invitation QR code',
  'invite.copy': 'Copy',
  'invite.copied': 'Copied',
  'invite.revoke': 'Revoke',
  'invite.revoking': 'Revoking…',
  'invite.closed': 'The trip is closed: nobody else comes in.',

  'join.heading': 'Join the trip',
  'join.body':
    'Somebody sent you an invitation. Type your name and you are in: no account, no password.',
  'join.dead.heading': 'This invitation no longer works',
  'join.name.label': 'What is your name?',
  'join.name.placeholder': 'Ana',
  'join.name.hint': 'This is how the rest of the group will see you on this trip.',
  'join.submit': 'Join the trip',
  'join.pending': 'Joining…',
  'join.taken.body':
    'Somebody on this trip already goes by {name}. If that is you on another phone, carry on as them; otherwise join under a different name.',
  'join.taken.confirm': 'That is me, on another phone',

  'error.credentials': 'That email address and password do not match.',
  'error.name_required': 'A name is needed.',
  'error.name_taken': 'That name is already taken on this trip.',
  'error.invitation_invalid': 'That invitation is not valid. Ask the organiser for a new one.',
  'error.invitation_expired': 'That invitation has expired. Ask the organiser for a new one.',
  'error.trip_name_required': 'The trip needs a name.',
  'error.trip_dates_out_of_order': 'A trip cannot end before it starts.',
  'error.needs_an_account':
    'Opening a trip needs an allowed account. Joining one through an invitation does not.',
  'error.participant_has_expenses.one':
    'This person cannot be removed: 1 expense is attached to them.',
  'error.participant_has_expenses.other':
    'This person cannot be removed: {count} expenses are attached to them.',
  'error.participant_has_payments.one':
    'This person cannot be removed: 1 payment is attached to them.',
  'error.participant_has_payments.other':
    'This person cannot be removed: {count} payments are attached to them.',
  'error.trip_needs_an_admin': 'The trip has to keep somebody organising it.',
  'error.not_allowed': 'You are not allowed to do that.',
  'error.needs_admin': 'That is for an organiser of the trip.',
  'error.trip_closed': 'The trip is closed.',
  'error.unexpected': 'Something went wrong. Try again.',
}
