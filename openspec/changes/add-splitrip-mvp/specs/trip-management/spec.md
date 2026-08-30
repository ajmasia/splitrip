## Purpose

Define el ciclo de vida de un viaje compartido: su creación, los datos que lo describen, quién participa y con qué rol, y su cierre cuando el viaje termina. Es la capacidad que delimita el ámbito dentro del cual existen los gastos y los saldos.

## ADDED Requirements

### Requirement: Creación de un viaje
El sistema SHALL permitir a cualquier persona crear un viaje indicando un nombre. La persona que lo crea SHALL quedar registrada como participante del viaje con rol `admin`. El viaje SHALL nacer en estado `open` y con divisa base `EUR`.

#### Scenario: Creación con los datos mínimos
- **WHEN** una persona crea un viaje indicando únicamente el nombre "Islandia 2026"
- **THEN** el sistema crea el viaje en estado `open`, con divisa base `EUR`, y registra a esa persona como participante con rol `admin`
- **AND** la redirige a la pantalla del viaje recién creado

#### Scenario: Nombre de viaje vacío
- **WHEN** una persona intenta crear un viaje sin nombre o con un nombre que solo contiene espacios
- **THEN** el sistema rechaza la creación e informa de que el nombre es obligatorio

#### Scenario: Fechas opcionales
- **WHEN** una persona crea un viaje indicando fecha de inicio y fecha de fin
- **THEN** el sistema guarda ambas fechas asociadas al viaje
- **AND** si la fecha de fin es anterior a la de inicio, rechaza la creación e informa del error

### Requirement: Lista de viajes de un participante
El sistema SHALL mostrar a cada persona la lista de viajes en los que participa, y SHALL excluir de esa lista los viajes en los que no participa.

#### Scenario: Participante con varios viajes
- **WHEN** un participante que pertenece a tres viajes abre la aplicación
- **THEN** el sistema lista esos tres viajes con su nombre, su estado (`open` o `closed`) y el total gastado en cada uno
- **AND** no muestra ningún viaje del que no sea participante

#### Scenario: Persona sin viajes
- **WHEN** una persona sin ningún viaje abre la aplicación
- **THEN** el sistema muestra un estado vacío que ofrece crear un viaje o unirse a uno mediante invitación

### Requirement: Roles y permisos dentro de un viaje
Cada participante de un viaje SHALL tener exactamente uno de dos roles: `admin` u `participant`. Un `admin` SHALL poder editar los datos del viaje, invitar y expulsar participantes, cambiar roles, editar o borrar cualquier gasto del viaje y cerrarlo. Un `participant` SHALL poder registrar gastos, y editar o borrar únicamente los gastos que él mismo ha registrado. Ambos roles SHALL poder consultar todos los gastos, los saldos y la liquidación del viaje.

#### Scenario: Participante edita un gasto ajeno
- **WHEN** un participante con rol `participant` intenta editar un gasto registrado por otra persona
- **THEN** el sistema rechaza la operación e informa de que solo puede modificar sus propios gastos

#### Scenario: Organizador edita un gasto ajeno
- **WHEN** un participante con rol `admin` edita un gasto registrado por otra persona
- **THEN** el sistema aplica el cambio y lo atribuye en el registro de actividad al `admin` que lo realizó

#### Scenario: Promoción de un participante a organizador
- **WHEN** un `admin` cambia el rol de otro participante a `admin`
- **THEN** ese participante pasa a disponer de todos los permisos de organizador

### Requirement: Garantía de al menos un organizador
Un viaje SHALL tener en todo momento al menos un participante con rol `admin`. El sistema SHALL rechazar cualquier operación que dejaría el viaje sin ningún organizador.

#### Scenario: El único organizador intenta degradarse
- **WHEN** el único participante con rol `admin` intenta cambiar su propio rol a `participant`
- **THEN** el sistema rechaza la operación e informa de que el viaje debe conservar al menos un organizador

#### Scenario: Degradación con otro organizador presente
- **WHEN** un `admin` cambia su rol a `participant` en un viaje que tiene otro `admin`
- **THEN** el sistema aplica el cambio

### Requirement: Edición de los datos del viaje
El sistema SHALL permitir a un `admin` modificar el nombre y las fechas de un viaje en estado `open`.

#### Scenario: Organizador renombra el viaje
- **WHEN** un `admin` cambia el nombre del viaje
- **THEN** el sistema guarda el nuevo nombre y lo refleja para todos los participantes

#### Scenario: Participante intenta editar el viaje
- **WHEN** un participante con rol `participant` intenta cambiar el nombre del viaje
- **THEN** el sistema rechaza la operación e informa de que requiere permisos de organizador

### Requirement: Cierre y reapertura de un viaje
El sistema SHALL permitir a un `admin` cerrar un viaje en estado `open`. Un viaje en estado `closed` SHALL ser de solo lectura: no se admiten altas, ediciones ni borrados de gastos, pagos o participantes. El sistema SHALL permitir a un `admin` reabrir un viaje cerrado, devolviéndolo al estado `open`.

#### Scenario: Cierre del viaje
- **WHEN** un `admin` cierra el viaje
- **THEN** el sistema marca el viaje como `closed`, genera su resumen de cierre y lo pone a disposición de todos los participantes

#### Scenario: Intento de registrar un gasto en un viaje cerrado
- **WHEN** cualquier participante intenta registrar un gasto en un viaje en estado `closed`
- **THEN** el sistema rechaza la operación e informa de que el viaje está cerrado

#### Scenario: Reapertura del viaje
- **WHEN** un `admin` reabre un viaje en estado `closed`
- **THEN** el sistema devuelve el viaje al estado `open` y vuelve a admitir cambios
- **AND** el resumen de cierre deja de estar congelado y se recalculará en el siguiente cierre

#### Scenario: Participante intenta cerrar el viaje
- **WHEN** un participante con rol `participant` intenta cerrar el viaje
- **THEN** el sistema rechaza la operación e informa de que requiere permisos de organizador
