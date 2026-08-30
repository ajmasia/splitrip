## Why

Repartir los gastos de un viaje en grupo se sigue haciendo con notas en el móvil, mensajes de chat y una hoja de cálculo que alguien mantiene al volver. El resultado es que nadie sabe cuánto lleva gastado el grupo mientras el viaje ocurre, y la liquidación se pospone semanas.

Splitrip resuelve exactamente eso: durante el viaje, cualquier participante apunta un gasto en segundos desde el móvil y todos ven al instante el total del viaje y quién debe cuánto a quién. Es una PWA desplegable en Vercel, sin fricción de registro: se entra por un QR o un enlace.

## What Changes

Esta es la primera versión del producto. No hay código previo: el change introduce la aplicación completa en su alcance mínimo viable.

- **Gestión de viajes**: crear un viaje (nombre, fechas opcionales, divisa base), ver la lista de viajes en los que participas, y cerrar un viaje cuando termina.
- **Roles**: cada viaje tiene al menos un organizador (admin) y N participantes. El organizador puede invitar, expulsar, editar cualquier gasto y cerrar el viaje. El participante gestiona sus propios gastos.
- **Invitación sin cuenta**: el organizador genera un enlace de invitación (y su QR). Quien lo abre escribe su nombre y queda dentro del viaje con el rol que llevaba la invitación. La sesión persiste en el dispositivo; no hay contraseñas ni email en esta versión.
- **Registro de gastos**: importe, concepto, fecha, quién pagó y entre quiénes se reparte. Dos tipos de gasto:
  - `shared`: se reparte a partes iguales entre los participantes seleccionados (por defecto, todos).
  - `contribution`: lo paga una persona, suma al total del viaje y **no genera deuda** — cubre el caso "esto lo pongo yo".
- **Reparto parcial**: un gasto puede repartirse solo entre un subconjunto de participantes (la cena a la que fueron 3 de 5), siempre a partes iguales entre los elegidos.
- **Dashboard de estado**: total gastado en el viaje, desglose por participante (cuánto ha pagado cada uno frente a cuánto le corresponde) y saldo neto de cada persona.
- **Liquidación**: cálculo del conjunto mínimo de transferencias que salda todas las deudas del grupo, y registro de pagos ("ya le he pagado 40 € a Ana") que actualiza los saldos.
- **Vistas de administración**: el organizador dispone de una vista de control del viaje con el total gastado, el desglose por participante (pagado frente a lo que le corresponde), el reparto por tipo de gasto (`shared` frente a `contribution`), la evolución del gasto por día y el detalle completo de todos los gastos del viaje con filtros. Es la vista que responde a "¿cómo vamos?" sin tener que abrir gasto por gasto.
- **Resumen de cierre**: al cerrar el viaje se congela un resumen que **todos los participantes** pueden consultar: total del viaje, coste por persona, lo que aportó cada uno, las contribuciones no repartidas y la liquidación final con el estado de cada pago. El viaje cerrado pasa a ser de solo lectura y su resumen queda disponible de forma permanente.
- **Tiempo real y actividad**: los cambios de cualquier participante se reflejan al instante en las pantallas abiertas del resto, y el viaje mantiene un feed de actividad reciente que deja rastro de quién hizo qué.
- **Bilingüe (español / inglés)**: toda la interfaz está traducida a español e inglés. El idioma por defecto es el español; la aplicación detecta el idioma del dispositivo y el usuario puede cambiarlo manualmente en cualquier momento.
- **PWA instalable**: interfaz mobile-first, instalable en la pantalla de inicio de iOS y Android, con shell cacheado para que abra rápido.

### Fuera de alcance en esta versión

Decisiones tomadas de forma explícita, para acotar la v1:

- **Web Push** (notificaciones con la app cerrada). La sincronización en tiempo real y el feed de actividad cubren el caso de uso dominante — el grupo está de viaje junto y con la app a mano — mientras que push en iOS exige que la PWA esté instalada y sigue siendo frágil. Queda como fase 2.
- **Multi-divisa en la interfaz**. La v1 opera solo en euros, pero el modelo de datos guarda divisa e importe desde el primer día para que añadir conversión más adelante no obligue a migrar los gastos ya registrados.
- **Foto del ticket** como justificante adjunto al gasto.
- **Reparto por porcentajes o partes desiguales** (más allá de excluir participantes de un gasto).
- **Recuperación de acceso entre dispositivos** vía email. Si un participante pierde su dispositivo, el organizador le regenera una invitación.
- **Escritura sin conexión**. La PWA cachea el shell para arrancar rápido, pero registrar un gasto requiere conexión.

## Capabilities

### New Capabilities

- `trip-management`: ciclo de vida de un viaje (creación, datos básicos, participantes, roles admin/participante, cierre) y la lista de viajes de una persona.
- `trip-invitations`: generación de enlaces y códigos QR de invitación, incorporación de un viajero sin cuenta mediante nombre, identidad ligada al dispositivo, revocación de invitaciones y expulsión de participantes.
- `expense-tracking`: alta, edición y borrado de gastos de un viaje, con pagador, tipo (`shared` / `contribution`), conjunto de participantes entre los que se reparte, e importe con divisa.
- `balance-settlement`: cálculo de saldos por participante a partir de los gastos, propuesta de liquidación con el mínimo de transferencias, y registro de pagos que saldan deuda.
- `trip-reporting`: vistas agregadas del viaje — panel de control del organizador con totales y desgloses, y resumen de cierre congelado y consultable por todos los participantes.
- `realtime-activity`: propagación en tiempo real de los cambios del viaje a los clientes conectados y feed de actividad reciente.
- `localization`: soporte bilingüe español/inglés de la interfaz, con español por defecto, detección del idioma del dispositivo, cambio manual persistente y formateo de importes y fechas según el idioma activo.
- `pwa-shell`: instalabilidad de la aplicación en el móvil, manifiesto, service worker de shell y comportamiento de la interfaz mobile-first.

### Modified Capabilities

Ninguna. El proyecto no tiene specs previas.

## Impact

- **Repositorio**: proyecto nuevo. Se introduce toda la base de código: Next.js (App Router) desplegado en Vercel, con TypeScript.
- **Datos y backend**: Supabase — Postgres para el modelo de datos, Realtime para la propagación de cambios y Row Level Security para el aislamiento entre viajes. Se crean las tablas de viajes, participantes, invitaciones, gastos, participaciones en gasto, pagos y actividad.
- **Autenticación**: no se usa un proveedor de identidad. La sesión es un token de participante emitido al aceptar la invitación y guardado en el dispositivo; la autorización se apoya en ese token frente a las políticas RLS.
- **Dependencias nuevas**: framework web y cliente de Supabase, biblioteca de generación de QR, y utilidad de aritmética decimal para importes monetarios (los importes se guardan en céntimos como entero para evitar errores de coma flotante).
- **Desarrollo local**: todo el entorno corre en Docker. El stack de Supabase (Postgres, Realtime, Studio, API) se levanta en contenedores con la CLI de Supabase, y la aplicación web se ejecuta en su propio contenedor, orquestado con `docker compose`. Un desarrollador clona el repositorio y arranca con un solo comando, sin depender de un proyecto remoto.
- **Operativa**: despliegue en Vercel, proyecto de Supabase gestionado para producción, y variables de entorno para ambos. Las migraciones de base de datos viven en el repositorio y se aplican tanto al entorno local en Docker como al remoto. Sin coste en los planes gratuitos al volumen esperado.
- **Riesgo principal**: el modelo "sin cuenta" implica que quien tenga el enlace de invitación puede entrar en el viaje. Se mitiga con invitaciones revocables y caducables, y expulsión de participantes, pero es una decisión de producto consciente a favor de la ausencia de fricción.
