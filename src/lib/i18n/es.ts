/**
 * The Spanish catalogue is the source of truth: its keys define the type every other language has
 * to satisfy, so a phrase added here and forgotten in English does not compile.
 */
export const es = {
  'app.name': 'Splitrip',
  'app.tagline': 'Gastos de viaje compartidos, cuadrados en un momento.',
  'app.version': 'Versión {version}',

  'identity.known': 'Este dispositivo ya tiene identidad.',
  'identity.unknown': 'Este dispositivo aún no tiene identidad.',

  'language.label': 'Idioma',
  'language.es': 'Español',
  'language.en': 'English',
} as const
