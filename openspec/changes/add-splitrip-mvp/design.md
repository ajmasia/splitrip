## Context

Proyecto nuevo, sin código previo. La motivación y el alcance están en `proposal.md`; los requisitos de comportamiento, en `specs/`.

Las restricciones que condicionan el diseño son cuatro:

1. **Sin cuentas.** Un viajero entra por QR y escribe su nombre. No hay contraseña ni email, pero sí hace falta una identidad estable por dispositivo sobre la que apoyar la autorización.
2. **Tiempo real.** Varios móviles con la misma pantalla abierta deben ver los mismos números en segundos.
3. **Dinero.** Los importes tienen que cuadrar al céntimo, siempre, y de forma reproducible.
4. **Operación mínima.** Un desarrollador, planes gratuitos, desarrollo local completo en Docker y despliegue en Vercel.

## Goals / Non-Goals

**Goals:**

- Un modelo de datos en el que los saldos son derivables y verificables, no un contador que se va actualizando y puede desincronizarse.
- Autorización centrada en la base de datos (Row Level Security), de manera que ninguna ruta de la aplicación pueda saltarse el aislamiento entre viajes por descuido.
- Aritmética monetaria exacta y determinista, aislada en funciones puras que se puedan probar sin base de datos.
- Entorno local reproducible en Docker, idéntico en esquema al de producción.

**Non-Goals:**

- Escalabilidad más allá de decenas de viajes concurrentes con grupos pequeños. Las consultas se diseñan para claridad, no para volumen.
- Escritura sin conexión con resolución de conflictos.
- Un sistema de tipos compartido con clientes nativos: la única interfaz de usuario es la PWA.

## Decisions

### Stack: Next.js (App Router) + Supabase

**Elegido:** Next.js 15 con App Router y TypeScript, desplegado en Vercel; Supabase como Postgres gestionado con Auth, Realtime y RLS.

**Por qué:** el reparto de gastos es un problema relacional puro (participantes, gastos, participaciones, pagos) donde SQL y las restricciones de integridad hacen la mitad del trabajo. Supabase aporta además, sin código propio, las dos piezas que más costarían: propagación en tiempo real sobre los cambios de tablas y un modelo de autorización que vive junto a los datos.

**Alternativas consideradas:** *Convex*, que da reactividad por defecto y habría simplificado el tiempo real, pero con un modelo de datos propietario y sin SQL, justo donde este problema es más fuerte. *Postgres directo (Neon) con Drizzle*, que obligaba a construir a mano tanto la autenticación como el tiempo real, trabajo desproporcionado para una v1.

### Identidad: sesiones anónimas de Supabase Auth

**Elegido:** cada dispositivo obtiene un usuario anónimo de Supabase Auth (`signInAnonymously`) en su primera visita. La fila de `participants` de un viaje se vincula a ese `auth.uid()`. Las políticas RLS se escriben contra `auth.uid()`, exactamente igual que si hubiera login real.

**Por qué:** convierte "sin cuenta" en un problema resuelto por la plataforma. Hay un JWT auténtico, refresco de token, y RLS puede razonar sobre la identidad sin trucos. Y deja la puerta abierta: cuando se quiera añadir email o OAuth, Supabase permite promover un usuario anónimo a permanente conservando su `uid` y, por tanto, todo su historial de viajes.

**Alternativas consideradas:** un token opaco propio guardado en `localStorage` y validado en cada ruta de servidor — funciona, pero deja RLS sin identidad y obliga a que toda la autorización viva en código de aplicación, que es justo lo que se quiere evitar. Cookie firmada por el servidor: mismo problema, más ceremonia.

**Consecuencia asumida:** borrar los datos del navegador equivale a perder el acceso. La mitigación es organizativa (el organizador regenera una invitación) y está declarada como riesgo.

### Escrituras por RPC, lecturas por RLS

**Elegido:** las lecturas van directas a las tablas y vistas desde el cliente, protegidas por RLS. Las escrituras que tocan más de una fila —crear un gasto con sus participaciones, cerrar un viaje generando su resumen, incorporarse mediante invitación— se hacen con funciones de Postgres invocadas por RPC.

**Por qué:** crear un gasto y repartirlo son una sola operación atómica. Hacerlo desde el cliente en dos escrituras abre la puerta a gastos sin reparto si falla la segunda. Además, el reparto en céntimos debe calcularlo una única autoridad para ser reproducible, y esa autoridad natural es la base de datos.

**Alternativas consideradas:** Server Actions de Next.js con la `service_role` key. Rechazado: esa clave salta RLS por completo, de modo que un fallo de autorización en el código de aplicación se convierte en una fuga de datos entre viajes. Las funciones RPC corren con los permisos del usuario y validan pertenencia explícitamente.

### Participaciones materializadas en lugar de calculadas

**Elegido:** cada gasto de tipo `shared` genera N filas en `expense_shares`, una por participante del reparto, con el importe en céntimos que le corresponde. El reparto se calcula en el momento del alta y se persiste.

**Por qué:** el requisito de reparto reproducible (`balance-settlement`) exige que los céntimos sobrantes recaigan siempre sobre las mismas personas. Persistir el reparto lo garantiza por construcción y hace auditables los números: la fila dice literalmente cuánto le tocó a cada uno. También reduce los saldos a una suma trivial en SQL.

**Regla de reparto:** cociente entero de céntimos entre el número de participantes, y los `r` céntimos sobrantes se asignan de uno en uno a los `r` primeros participantes ordenados por su identificador. Al depender de un orden estable y no del azar, es determinista y verificable.

**Alternativa considerada:** calcular el reparto al vuelo en cada consulta. Más limpio en apariencia, pero deja el destino de los céntimos sobrantes a merced del orden que devuelva la consulta, que no está garantizado.

### Saldos como vista, liquidación como función pura

**Elegido:** los saldos se exponen en una vista de Postgres que suma, por participante, lo pagado menos lo imputado, más lo cobrado menos lo pagado en liquidaciones. El algoritmo que convierte saldos en transferencias vive en TypeScript, como función pura compartida entre servidor y cliente.

**Por qué:** los saldos son una agregación y Postgres los calcula mejor y siempre coherentes con los datos. La liquidación, en cambio, es un algoritmo (voraz: emparejar repetidamente el mayor acreedor con el mayor deudor) sobre un puñado de números que ya están en memoria; como función pura se prueba de forma exhaustiva sin base de datos, incluidos los casos límite. El resultado tiene como máximo `n-1` transferencias, que es lo que exige la spec.

**Nota:** el voraz no siempre da el mínimo absoluto de transferencias —el problema óptimo es NP-difícil—, pero sí cumple la cota `n-1` y da resultados óptimos o casi para grupos de este tamaño. Buscar el óptimo exacto no aporta nada perceptible con 5 personas.

### Dinero: enteros de céntimos y divisa explícita desde el día uno

**Elegido:** los importes se almacenan como `BIGINT` de céntimos. Cada gasto y cada pago llevan una columna `currency` con `CHECK (currency = 'EUR')` en esta versión. El formateo a texto ocurre solo en el borde de la interfaz.

**Por qué:** ningún tipo de coma flotante debe tocar dinero. Y llevar la columna de divisa desde el principio, aunque solo admita un valor, evita la migración más cara del futuro: añadir multidivisa después obliga a decidir retroactivamente en qué divisa estaba cada gasto histórico. Ampliar es entonces relajar el `CHECK` y añadir una tabla de tasas.

### Feed de actividad por triggers

**Elegido:** las entradas de `activity` las escriben triggers de Postgres sobre `expenses`, `payments`, `participants` y `trips`.

**Por qué:** el feed es un registro de auditoría, y un registro que depende de que el código de aplicación se acuerde de escribirlo acaba con huecos. En triggers es imposible modificar un gasto sin dejar rastro. Como efecto secundario, el feed viaja por el mismo canal de tiempo real que el resto de tablas, sin código adicional.

### Tiempo real: un canal por viaje

**Elegido:** suscripción a los cambios de Postgres (`postgres_changes`) filtrada por `trip_id`, un canal por viaje. Cada evento recibido invalida la consulta correspondiente del cliente en lugar de aplicar el cambio a mano sobre el estado local.

**Por qué:** invalidar y volver a leer es mucho más difícil de estropear que fusionar mensajes en el estado local, y con este volumen de datos el coste de recargar la pantalla de un viaje es despreciable. Además, resuelve gratis la reconexión: al recuperar la conexión se invalida todo y la pantalla vuelve a ser correcta, que es justo lo que pide `realtime-activity`.

**Aislamiento:** el filtro por `trip_id` es una comodidad, no la garantía. La garantía es RLS: Supabase Realtime aplica las políticas de la tabla antes de entregar un evento, de modo que un cliente no puede recibir datos de un viaje ajeno ni suscribiéndose a propósito.

### Resumen de cierre congelado como snapshot

**Elegido:** al cerrar un viaje, la función RPC de cierre calcula el resumen completo y lo guarda como JSONB en una columna del viaje. Las consultas de un viaje `closed` leen ese snapshot, no las tablas vivas.

**Por qué:** la spec exige que el resumen no varíe mientras el viaje esté cerrado. Un resumen recalculado cada vez cambiaría si alguien corrigiese algo, y además obligaría a repetir toda la agregación en cada consulta. El snapshot es la lectura más barata y la única que cumple literalmente el requisito.

### Desarrollo local íntegramente en Docker

**Elegido:** `supabase start` levanta el stack completo de Supabase en contenedores (Postgres, GoTrue, Realtime, Studio, API). La aplicación Next.js corre en su propio contenedor, y un `docker compose` en la raíz orquesta ambos para que arrancar sea un único comando. El esquema vive como migraciones SQL versionadas en el repositorio y se aplica igual en local que en producción.

**Por qué:** el valor real de Docker aquí no es aislar Node, es tener el mismo Postgres, con las mismas políticas RLS y los mismos triggers, en el portátil. Las políticas RLS son la clase de cosa que solo se puede probar de verdad contra la base de datos, y probarlas contra el proyecto remoto compartido es lento y destructivo.

### Internacionalización: catálogos estáticos, español por defecto

**Elegido:** los textos viven en catálogos JSON por idioma (`es`, `en`) cargados en el servidor según el idioma resuelto, sin biblioteca pesada de i18n. La resolución sigue este orden: preferencia guardada del usuario → cabecera `Accept-Language` del navegador → español. Los importes y las fechas se formatean con las APIs `Intl` nativas del navegador usando el idioma activo.

**Por qué:** con dos idiomas y una interfaz pequeña, una biblioteca completa de i18n aporta más peso y configuración que valor. Los catálogos estáticos con un tipo TypeScript derivado de las claves del catálogo español dan lo que de verdad importa aquí: que el compilador avise si una clave falta en inglés. `Intl` ya está en todos los navegadores objetivo y evita añadir una dependencia de formateo.

**Consecuencia de diseño:** ningún texto visible se escribe literal en un componente; todos pasan por el catálogo desde la primera pantalla. Retraducir una interfaz ya construida cuesta mucho más que construirla ya traducida, y es un error que solo se detecta cuando ya está por todas partes.

### Estrategia de pruebas

Tres niveles, elegidos por lo que puede romperse:

- **Unitarias sobre funciones puras**: reparto en céntimos y algoritmo de liquidación. Aquí es donde vive el riesgo de que el dinero no cuadre, y son gratis de probar de forma exhaustiva. Incluyen una prueba basada en propiedades: para cualquier conjunto de gastos, la suma de saldos es exactamente cero.
- **Integración contra el Postgres local en Docker**: políticas RLS y funciones RPC. Cada prueba comprueba tanto que el participante legítimo puede como que el ajeno no puede.
- **Un recorrido de extremo a extremo** con Playwright: crear viaje → invitar → unirse → añadir gasto → ver liquidación → cerrar y ver resumen. Uno solo, el camino feliz, como red de seguridad antes de desplegar.

### Convenciones del repositorio

**Elegido:** versionado semántico (SemVer) para las versiones publicadas y Conventional Commits para el historial, con commits atómicos —un commit por cambio lógico— y sin ninguna referencia a herramientas de IA en los mensajes. El fichero de versión de la aplicación es la fuente de la versión que la PWA muestra al usuario.

**Por qué:** con commits convencionales y atómicos, el historial es la fuente del changelog y permite deducir el salto de versión sin decidirlo a mano. Es además lo que hace útil el rollback de Vercel: revertir una versión concreta solo es seguro si cada commit es una unidad coherente.

**Consecuencia para las tareas:** la lista de tareas está agrupada de modo que cada tarea sea un commit razonable por sí sola.

## Risks / Trade-offs

- **Quien tenga el enlace de invitación entra en el viaje** → Identificadores de 128 bits generados criptográficamente (no adivinables), invitaciones revocables y con caducidad, y expulsión de participantes. Es una decisión de producto consciente: la ausencia de fricción es el motivo por el que la app se usará durante el viaje en lugar de después.
- **Perder el dispositivo o borrar los datos del navegador es perder el acceso** → La reincorporación con el mismo nombre desde la misma invitación permite recuperar la identidad de participante, y el organizador puede regenerar invitaciones. La solución de fondo, asociar un email, está declarada fuera de alcance.
- **Un error en las políticas RLS filtra datos entre viajes** → Es el riesgo más grave del diseño. Se mitiga con RLS activo por defecto en todas las tablas, sin uso de `service_role` en el camino de las peticiones de usuario, y pruebas de integración que verifican explícitamente los accesos denegados.
- **Alguien corrige un gasto mientras otro lo está editando** → El último en escribir gana, sin bloqueos. Con grupos de cinco personas la colisión es rara y el tiempo real la hace visible de inmediato. Detectarla explícitamente no compensa en la v1.
- **Sin push, un participante puede no enterarse de un cambio hasta abrir la app** → Aceptado y declarado en el proposal. El feed de actividad deja el rastro completo, de modo que al abrir se ve qué ha pasado.
- **La fecha del gasto depende de la zona horaria del dispositivo** → Se guarda como fecha civil (`DATE`), sin hora ni zona, porque lo que importa es "el día del viaje" y no el instante exacto. Evita que un gasto de la cena aparezca al día siguiente por la diferencia horaria del destino.
- **Los planes gratuitos tienen límites** → Con grupos pequeños el volumen es trivial; el límite que primero se alcanzaría es el de pausa por inactividad del proyecto de Supabase, que afecta a la disponibilidad, no a los datos.

## Migration Plan

No hay migración: es un proyecto nuevo, sin usuarios ni datos previos. La puesta en marcha es:

1. Crear el proyecto de Supabase de producción y aplicarle las migraciones del repositorio.
2. Desplegar en Vercel con las variables de entorno apuntando a ese proyecto.
3. Verificar el recorrido completo en el entorno desplegado desde un móvil real, incluida la instalación como PWA en iOS y en Android.

**Reversión:** el despliegue se revierte con el rollback de Vercel a la versión anterior. Las migraciones de base de datos son aditivas dentro de esta versión, así que una reversión de la aplicación no deja el esquema incompatible.

## Open Questions

- **Caducidad por defecto de las invitaciones.** El comportamiento está especificado; el plazo concreto (¿la duración del viaje, 30 días?) se puede fijar al implementar sin afectar a specs ni a tareas.
- **Identidad visual.** El nombre está fijado: **Splitrip**, repositorio `github.com/ajmasia/splitrip`. Queda por definir el icono y la paleta, que afectan solo al manifiesto y a los recursos estáticos.
