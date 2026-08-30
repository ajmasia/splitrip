import type { Catalogue } from './catalogue'

export const en: Catalogue = {
  'app.name': 'Splitrip',
  'app.tagline': 'Shared travel expenses, settled in seconds.',
  'app.version': 'Version {version}',

  'language.label': 'Language',

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

  'trip.back': 'Your trips',
  'trip.participants': 'Who is travelling',
  'trip.you': 'you',

  'error.name_required': 'A name is needed.',
  'error.trip_name_required': 'The trip needs a name.',
  'error.trip_dates_out_of_order': 'A trip cannot end before it starts.',
  'error.needs_an_account':
    'Opening a trip needs an allowed account. Joining one through an invitation does not.',
  'error.not_allowed': 'You are not allowed to do that.',
  'error.unexpected': 'Something went wrong. Try again.',
}
