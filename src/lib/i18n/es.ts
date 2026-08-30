/**
 * The Spanish catalogue is the source of truth: its keys define the type every other language has
 * to satisfy, so a phrase added here and forgotten in English does not compile.
 */
export const es = {
  'app.name': 'Splitrip',
  'app.tagline': 'Gastos de viaje compartidos, cuadrados en un momento.',
  'app.version': 'Versión {version}',

  'language.label': 'Idioma',

  'connection.offline': 'Sin conexión. Ves lo último que se cargó, y no se puede apuntar nada.',
  'update.available': 'Hay una versión nueva.',
  'update.apply': 'Actualizar',

  'offline.heading': 'Sin conexión',
  'offline.body':
    'No hemos podido cargar esta pantalla. En cuanto vuelva la conexión, vuelve a intentarlo.',

  'error.page.heading': 'Algo se ha torcido',
  'error.page.body': 'No hemos podido cargar esto. Suele arreglarse volviéndolo a intentar.',
  'error.page.retry': 'Reintentar',
  'error.page.home': 'Ir al principio',

  'notFound.heading': 'Aquí no hay nada',
  'notFound.body': 'El enlace no lleva a ningún sitio, o lleva a un viaje del que no formas parte.',

  'landing.heading': 'Cuadrad las cuentas del viaje sobre la marcha.',
  'landing.body':
    'Abre un viaje con tu cuenta, o entra en uno con la invitación que te hayan pasado.',

  'account.signIn': 'Entrar',
  'account.signOut': 'Salir',

  'signIn.heading': 'Entrar',
  'signIn.email.label': 'Correo',
  'signIn.password.label': 'Contraseña',
  'signIn.submit': 'Entrar',
  'signIn.pending': 'Entrando…',
  'signIn.note':
    'La cuenta solo hace falta para abrir viajes. Para entrar en uno, te basta la invitación.',

  'trips.heading': 'Tus viajes',
  'trips.subtitle': 'Los viajes en los que participas.',
  'trips.create': 'Crear un viaje',
  'trips.empty.title': 'Todavía no viajas con nadie',
  'trips.empty.body':
    'Crea un viaje y comparte el enlace, o entra con la invitación que te hayan pasado.',
  'trips.column.name': 'Viaje',
  'trips.column.dates': 'Fechas',
  'trips.column.people': 'Personas',
  'trips.column.role': 'Tu papel',
  'trips.column.status': 'Estado',
  'trips.column.spent': 'Gastado',
  'trips.status.open': 'En marcha',
  'trips.status.closed': 'Cerrado',
  'trips.role.admin': 'Organizas',
  'trips.role.participant': 'Participas',
  'trips.people.one': '1 persona',
  'trips.people.other': '{count} personas',
  'trips.expenses.none': 'Sin gastos',
  'trips.expenses.one': '1 gasto',
  'trips.expenses.other': '{count} gastos',
  'trips.dates.none': 'Sin fechas',

  'newTrip.heading': 'Crear un viaje',
  'newTrip.name.label': 'Nombre del viaje',
  'newTrip.name.placeholder': 'Viaje a la Alsacia',
  'newTrip.you.label': '¿Cómo te llamas?',
  'newTrip.you.placeholder': 'Sonia',
  'newTrip.you.hint': 'Así te verá el resto del grupo en este viaje.',
  'newTrip.start.label': 'Empieza',
  'newTrip.end.label': 'Termina',
  'newTrip.dates.hint': 'Las fechas son opcionales.',
  'newTrip.submit': 'Crear el viaje',
  'newTrip.pending': 'Creando…',
  'newTrip.cancel': 'Cancelar',

  'expenses.heading': 'Gastos',
  'expenses.empty.title': 'Todavía no hay gastos',
  'expenses.empty.body': 'Apunta el primero y el reparto se calcula solo.',
  'expenses.column.date': 'Fecha',
  'expenses.column.description': 'Concepto',
  'expenses.column.payer': 'Quién pagó',
  'expenses.column.type': 'Tipo',
  'expenses.column.split': 'Reparto',
  'expenses.column.amount': 'Importe',
  'expenses.type.shared': 'Compartido',
  'expenses.type.contribution': 'Aporte',
  'expenses.split.none': 'Sin reparto',

  'trip.back': 'Tus viajes',
  'trip.participants': 'Quién viaja',
  'trip.you': 'tú',

  'trip.invite': 'Invitar',
  'trip.role.promote': 'Hacer organizador',
  'trip.role.promote.label': 'Hacer a {name} organizador del viaje',
  'trip.role.demote': 'Pasar a participante',
  'trip.role.demote.label': 'Pasar a {name} a participante',
  'trip.role.changing': 'Cambiando…',
  'trip.remove': 'Quitar',
  'trip.removing': 'Quitando…',
  'trip.remove.label': 'Quitar a {name} del viaje',

  'invite.heading': 'Invitar al viaje',
  'invite.body':
    'Comparte el enlace o enseña el QR. Quien lo abra entra escribiendo solo su nombre, sin cuenta ni contraseña.',
  'invite.role.label': '¿Con qué papel entra?',
  'invite.role.participant': 'Participa',
  'invite.role.admin': 'Organiza',
  'invite.role.hint':
    'Quien organiza puede invitar, corregir cualquier gasto y cerrar el viaje. Quien participa, apunta los suyos.',
  'invite.create': 'Crear una invitación',
  'invite.pending': 'Creando…',
  'invite.live': 'Invitaciones activas',
  'invite.empty.title': 'Todavía no hay invitaciones',
  'invite.empty.body': 'Crea una y pásasela a quien viaje contigo.',
  'invite.expires': 'Caduca el {date}',
  'invite.link.label': 'Enlace de invitación',
  'invite.qr.label': 'Código QR de la invitación',
  'invite.copy': 'Copiar',
  'invite.copied': 'Copiado',
  'invite.revoke': 'Revocar',
  'invite.revoking': 'Revocando…',
  'invite.closed': 'El viaje está cerrado: ya no entra nadie más.',

  'join.heading': 'Entrar en el viaje',
  'join.body':
    'Te han pasado una invitación. Escribe tu nombre y ya estás dentro: sin cuenta y sin contraseña.',
  'join.dead.heading': 'Esta invitación ya no sirve',
  'join.name.label': '¿Cómo te llamas?',
  'join.name.placeholder': 'Ana',
  'join.name.hint': 'Así te verá el resto del grupo en este viaje.',
  'join.submit': 'Entrar en el viaje',
  'join.pending': 'Entrando…',
  'join.taken.body':
    'Ya hay alguien en este viaje que se llama {name}. Si eres tú desde otro móvil, continúa como esa persona; si no, entra con otro nombre.',
  'join.taken.confirm': 'Soy yo, desde otro móvil',

  'error.credentials': 'El correo o la contraseña no coinciden.',
  'error.name_required': 'Hace falta un nombre.',
  'error.name_taken': 'Ese nombre ya está cogido en este viaje.',
  'error.invitation_invalid':
    'Esa invitación no vale. Pídele al organizador que te pase una nueva.',
  'error.invitation_expired':
    'Esa invitación ha caducado. Pídele al organizador que te pase una nueva.',
  'error.trip_name_required': 'El viaje necesita un nombre.',
  'error.trip_dates_out_of_order': 'Un viaje no puede terminar antes de empezar.',
  'error.needs_an_account':
    'Para abrir un viaje hace falta una cuenta autorizada. Entrar en uno por invitación no.',
  'error.participant_has_expenses.one':
    'No puedes quitar a esta persona: tiene 1 gasto a su nombre.',
  'error.participant_has_expenses.other':
    'No puedes quitar a esta persona: tiene {count} gastos a su nombre.',
  'error.participant_has_payments.one':
    'No puedes quitar a esta persona: tiene 1 pago a su nombre.',
  'error.participant_has_payments.other':
    'No puedes quitar a esta persona: tiene {count} pagos a su nombre.',
  'error.trip_needs_an_admin': 'El viaje tiene que quedarse con alguien organizando.',
  'error.not_allowed': 'No tienes permiso para hacer eso.',
  'error.needs_admin': 'Para eso hay que organizar el viaje.',
  'error.trip_closed': 'El viaje está cerrado.',
  'error.unexpected': 'Algo ha fallado. Inténtalo otra vez.',
} as const
