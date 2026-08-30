## Purpose

Registra el dinero que se gasta durante un viaje: quién lo pagó, cuánto, en qué, y entre quiénes se reparte. Es la fuente de verdad a partir de la cual se calculan todos los saldos y liquidaciones del grupo.

## ADDED Requirements

### Requirement: Registro de un gasto compartido
El sistema SHALL permitir a cualquier participante de un viaje en estado `open` registrar un gasto de tipo `shared` indicando concepto, importe, fecha, pagador y el conjunto de participantes entre los que se reparte. Por defecto, el pagador SHALL ser quien registra el gasto y el reparto SHALL incluir a todos los participantes del viaje.

#### Scenario: Registro con los valores por defecto
- **WHEN** un participante registra un gasto "Cena" de 60,00 € sin modificar pagador ni reparto en un viaje con 4 participantes
- **THEN** el sistema guarda el gasto con tipo `shared`, con él mismo como pagador y con los 4 participantes en el reparto
- **AND** el gasto aparece de inmediato en el listado del viaje para todos los participantes

#### Scenario: Registro de un gasto pagado por otra persona
- **WHEN** un participante registra un gasto y selecciona a otro participante como pagador
- **THEN** el sistema atribuye el pago al participante seleccionado a efectos de saldos
- **AND** registra en la actividad del viaje que fue otra persona quien dio de alta el gasto

#### Scenario: Fecha del gasto
- **WHEN** un participante registra un gasto sin indicar fecha
- **THEN** el sistema le asigna la fecha actual
- **AND** si indica una fecha, el sistema guarda la indicada

### Requirement: Registro de una contribución no repartida
El sistema SHALL permitir registrar un gasto de tipo `contribution`: lo paga un participante, suma al total gastado del viaje, y NO SHALL generar deuda alguna para el resto. Una contribución NO SHALL tener conjunto de reparto.

#### Scenario: Alta de una contribución
- **WHEN** un participante registra un gasto "Alquiler de la furgoneta" de 300,00 € de tipo `contribution`
- **THEN** el sistema lo guarda sin conjunto de reparto
- **AND** el importe se suma al total gastado del viaje
- **AND** ningún participante, incluido el pagador, ve alterado su saldo por causa de ese gasto

#### Scenario: Intento de asignar reparto a una contribución
- **WHEN** se intenta registrar un gasto de tipo `contribution` indicando un conjunto de participantes para el reparto
- **THEN** el sistema rechaza la operación e informa de que una contribución no se reparte

### Requirement: Reparto entre un subconjunto de participantes
El sistema SHALL permitir que un gasto de tipo `shared` se reparta solo entre un subconjunto de los participantes del viaje. El reparto SHALL ser siempre a partes iguales entre los participantes incluidos. El conjunto de reparto SHALL contener al menos un participante, y todos sus miembros SHALL pertenecer al viaje.

#### Scenario: Cena a la que van tres de cinco
- **WHEN** un participante de un viaje de 5 registra un gasto "Cena" de 45,00 € seleccionando únicamente a tres participantes en el reparto
- **THEN** el sistema imputa 15,00 € a cada uno de esos tres participantes
- **AND** los otros dos participantes no ven alterado su saldo por ese gasto

#### Scenario: Reparto vacío
- **WHEN** se intenta registrar un gasto de tipo `shared` sin ningún participante en el reparto
- **THEN** el sistema rechaza la operación e informa de que debe repartirse al menos entre una persona

#### Scenario: Reparto que incluye a alguien ajeno al viaje
- **WHEN** se intenta registrar un gasto cuyo conjunto de reparto incluye a alguien que no participa en el viaje
- **THEN** el sistema rechaza la operación

#### Scenario: El pagador puede quedar fuera del reparto
- **WHEN** un participante registra un gasto de 30,00 € que paga él pero cuyo reparto incluye solo a otras dos personas
- **THEN** el sistema imputa 15,00 € a cada una de esas dos personas
- **AND** el pagador queda con un saldo a su favor de 30,00 € por ese gasto

### Requirement: Validación del importe
El sistema SHALL aceptar únicamente importes estrictamente mayores que cero, con un máximo de dos decimales, y SHALL almacenarlos como un número entero de céntimos para evitar errores de redondeo en coma flotante.

#### Scenario: Importe cero o negativo
- **WHEN** se intenta registrar un gasto con importe 0 o con un importe negativo
- **THEN** el sistema rechaza la operación e informa de que el importe debe ser mayor que cero

#### Scenario: Importe con más de dos decimales
- **WHEN** se intenta registrar un gasto con importe 10,555
- **THEN** el sistema rechaza la operación e informa del formato admitido

#### Scenario: Importe válido
- **WHEN** se registra un gasto de 10,55 €
- **THEN** el sistema lo almacena como 1055 céntimos y lo muestra como 10,55 €

### Requirement: Divisa del gasto
Cada gasto SHALL almacenar la divisa en la que se expresa su importe. En esta versión el sistema SHALL admitir exclusivamente `EUR`, y SHALL rechazar cualquier otra divisa, de forma que el modelo de datos quede preparado para admitir varias divisas más adelante sin migrar los gastos ya registrados.

#### Scenario: Gasto en la divisa admitida
- **WHEN** se registra un gasto sin indicar divisa
- **THEN** el sistema lo almacena con divisa `EUR`

#### Scenario: Divisa no admitida
- **WHEN** se intenta registrar un gasto con divisa `USD`
- **THEN** el sistema rechaza la operación e informa de que esta versión solo opera en euros

### Requirement: Edición y borrado de gastos
El sistema SHALL permitir editar y borrar gastos de un viaje en estado `open`. Un participante con rol `participant` SHALL poder modificar o borrar únicamente los gastos que él mismo registró; un `admin` SHALL poder modificar o borrar cualquier gasto del viaje. Toda edición o borrado SHALL recalcular los saldos afectados y quedar reflejado en la actividad del viaje.

#### Scenario: Corrección del importe de un gasto propio
- **WHEN** un participante corrige el importe de un gasto que él registró, de 60,00 € a 65,00 €
- **THEN** el sistema guarda el nuevo importe y los saldos de los implicados se recalculan
- **AND** el cambio aparece en la actividad del viaje

#### Scenario: Borrado de un gasto por su autor
- **WHEN** un participante borra un gasto que él registró
- **THEN** el sistema lo elimina del viaje y los saldos vuelven a calcularse sin él

#### Scenario: Borrado de un gasto ajeno por un participante
- **WHEN** un participante con rol `participant` intenta borrar un gasto registrado por otra persona
- **THEN** el sistema rechaza la operación

#### Scenario: Edición en un viaje cerrado
- **WHEN** cualquier participante intenta editar o borrar un gasto de un viaje en estado `closed`
- **THEN** el sistema rechaza la operación e informa de que el viaje está cerrado

### Requirement: Consulta de los gastos del viaje
El sistema SHALL mostrar a cualquier participante del viaje la lista completa de gastos, ordenada por fecha de forma descendente, indicando para cada uno el concepto, el importe, el pagador, el tipo y entre cuántas personas se reparte.

#### Scenario: Listado del viaje
- **WHEN** un participante abre la pantalla de gastos del viaje
- **THEN** el sistema muestra todos los gastos del viaje, el más reciente primero, con concepto, importe, pagador, tipo y número de personas en el reparto

#### Scenario: Detalle de un gasto
- **WHEN** un participante abre un gasto concreto
- **THEN** el sistema muestra el detalle completo, incluidos los participantes entre los que se reparte y el importe que corresponde a cada uno

#### Scenario: Viaje sin gastos
- **WHEN** un participante abre un viaje que aún no tiene gastos
- **THEN** el sistema muestra un estado vacío que invita a registrar el primer gasto
