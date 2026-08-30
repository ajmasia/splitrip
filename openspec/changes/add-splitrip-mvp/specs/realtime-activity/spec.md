## Purpose

Mantiene a todo el grupo mirando la misma realidad: cuando alguien registra o corrige un gasto, el resto lo ve al instante sin recargar, y el viaje conserva un rastro legible de quién hizo qué. Es lo que evita el "¿ya has apuntado tú la cena?" durante el viaje.

## ADDED Requirements

### Requirement: Propagación en tiempo real de los cambios del viaje
El sistema SHALL propagar a todos los clientes conectados a un viaje, sin intervención del usuario y en un plazo de pocos segundos, las altas, ediciones y bajas de gastos y pagos, así como las incorporaciones de participantes. Los totales, saldos y liquidación mostrados SHALL actualizarse en consecuencia.

#### Scenario: Un gasto registrado por otra persona aparece al instante
- **WHEN** un participante tiene abierta la pantalla del viaje y otro participante registra un gasto desde su móvil
- **THEN** el gasto aparece en la pantalla del primero sin que este recargue ni interactúe
- **AND** el total del viaje y los saldos se actualizan con ese gasto

#### Scenario: Corrección propagada
- **WHEN** un participante corrige el importe de un gasto mientras otros tienen la pantalla abierta
- **THEN** el importe corregido y los saldos recalculados se reflejan en las pantallas del resto

#### Scenario: Incorporación de un participante
- **WHEN** una persona se incorpora al viaje mediante una invitación
- **THEN** aparece en la lista de participantes de quienes tienen el viaje abierto

### Requirement: Aislamiento de los datos por viaje
El sistema SHALL entregar las actualizaciones en tiempo real únicamente a los participantes del viaje al que corresponden. Un cliente NO SHALL recibir datos de viajes en los que no participa.

#### Scenario: Cliente de otro viaje
- **WHEN** un cliente conectado al viaje A está activo mientras se registra un gasto en el viaje B
- **THEN** ese cliente no recibe ninguna información sobre el gasto del viaje B

#### Scenario: Participante expulsado
- **WHEN** un `admin` retira a un participante del viaje
- **THEN** ese participante deja de recibir actualizaciones en tiempo real de ese viaje

### Requirement: Recuperación tras pérdida de conexión
El sistema SHALL indicar al usuario cuándo la conexión en tiempo real no está activa, y SHALL restablecerla y sincronizar los datos pendientes al recuperar la conectividad, sin exigir que el usuario recargue la aplicación.

#### Scenario: Pérdida temporal de cobertura
- **WHEN** un participante pierde la conexión mientras tiene el viaje abierto
- **THEN** el sistema muestra un indicador de que los datos pueden no estar actualizados

#### Scenario: Recuperación de la conexión
- **WHEN** la conexión se restablece
- **THEN** el sistema vuelve a suscribirse, recarga los datos del viaje y retira el indicador
- **AND** la pantalla refleja los cambios ocurridos durante la desconexión

### Requirement: Feed de actividad del viaje
El sistema SHALL registrar y mostrar un feed cronológico de la actividad del viaje. Cada entrada SHALL indicar quién realizó la acción, qué acción fue y cuándo. SHALL registrarse al menos: alta, edición y borrado de gastos; alta y anulación de pagos; incorporación y salida de participantes; y cierre y reapertura del viaje.

#### Scenario: Consulta del feed
- **WHEN** un participante abre el feed de actividad del viaje
- **THEN** el sistema muestra las entradas más recientes primero, cada una con autor, acción y momento

#### Scenario: Entrada generada por un gasto nuevo
- **WHEN** Ana registra un gasto "Cena" de 60,00 €
- **THEN** el feed incorpora una entrada del tipo "Ana añadió Cena · 60,00 €" con su marca temporal

#### Scenario: Entrada generada por una edición
- **WHEN** un `admin` corrige un gasto registrado por otra persona
- **THEN** el feed incorpora una entrada que identifica al `admin` como autor de la corrección

#### Scenario: El feed llega en tiempo real
- **WHEN** se produce cualquier acción registrable mientras un participante tiene el viaje abierto
- **THEN** la entrada correspondiente aparece en su feed sin recargar

#### Scenario: Aviso de novedades
- **WHEN** se produce actividad en el viaje mientras el participante está en otra pantalla de la aplicación
- **THEN** el sistema le muestra un indicador de que hay actividad nueva sin interrumpir lo que está haciendo
