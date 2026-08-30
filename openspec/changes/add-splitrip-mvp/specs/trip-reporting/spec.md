## Purpose

Da respuesta a las dos preguntas agregadas que el grupo se hace sobre un viaje: "¿cómo vamos?" mientras el viaje ocurre, desde el panel del organizador, y "¿en qué quedó todo?" cuando termina, mediante un resumen de cierre que cualquier participante puede consultar.

## ADDED Requirements

### Requirement: Panel de control del organizador
El sistema SHALL ofrecer a los participantes con rol `admin` una vista de control del viaje que presente, como mínimo: el total gastado, el desglose entre gasto repartido y contribuciones, el número de gastos registrados, el coste medio por persona, y una tabla por participante con lo que ha pagado, lo que le corresponde y su saldo neto.

#### Scenario: Organizador consulta el estado del viaje
- **WHEN** un `admin` abre el panel de control de un viaje con 12 gastos
- **THEN** el sistema muestra el total gastado, cuánto de ese total es repartido y cuánto son contribuciones, el número de gastos, el coste medio por persona y la tabla por participante

#### Scenario: Evolución del gasto por día
- **WHEN** un `admin` abre el panel de control de un viaje con gastos en varias fechas
- **THEN** el sistema muestra el gasto agregado por día

#### Scenario: Participante intenta acceder al panel
- **WHEN** un participante con rol `participant` intenta abrir el panel de control del organizador
- **THEN** el sistema no le da acceso e indica que es una vista de organizador
- **AND** le ofrece la vista de saldos y liquidación, que sí puede consultar

#### Scenario: Panel de un viaje sin gastos
- **WHEN** un `admin` abre el panel de control de un viaje sin gastos
- **THEN** el sistema muestra los totales a cero y un estado vacío, sin errores

### Requirement: Detalle filtrable de los gastos del viaje
El sistema SHALL permitir a un `admin` consultar el detalle completo de los gastos del viaje pudiendo filtrarlos al menos por pagador y por tipo de gasto, y SHALL mostrar el total correspondiente a los gastos filtrados.

#### Scenario: Filtro por pagador
- **WHEN** un `admin` filtra los gastos por el pagador "Ana"
- **THEN** el sistema muestra únicamente los gastos pagados por Ana y su importe total

#### Scenario: Filtro por tipo de gasto
- **WHEN** un `admin` filtra los gastos por tipo `contribution`
- **THEN** el sistema muestra únicamente las contribuciones y su importe total

#### Scenario: Filtro sin resultados
- **WHEN** un `admin` aplica una combinación de filtros que no casa con ningún gasto
- **THEN** el sistema muestra un estado vacío con un total de 0,00 €

### Requirement: Resumen de cierre del viaje
Al cerrar un viaje, el sistema SHALL generar un resumen que incluya: el total gastado, el coste por persona, lo aportado por cada participante, las contribuciones no repartidas con su autor, el saldo final de cada participante y la liquidación con el estado de cada transferencia. El resumen SHALL reflejar el estado del viaje en el instante del cierre y NO SHALL variar mientras el viaje permanezca cerrado.

#### Scenario: Generación del resumen al cerrar
- **WHEN** un `admin` cierra el viaje
- **THEN** el sistema genera el resumen de cierre con los datos del viaje en ese instante
- **AND** lo deja disponible en la pantalla del viaje

#### Scenario: El resumen no cambia mientras el viaje está cerrado
- **WHEN** se consulta el resumen de cierre de un viaje `closed` en dos momentos distintos
- **THEN** el sistema devuelve exactamente las mismas cifras en ambas consultas

#### Scenario: Regeneración tras reabrir y volver a cerrar
- **WHEN** un `admin` reabre un viaje cerrado, se registran cambios y vuelve a cerrarlo
- **THEN** el sistema genera un nuevo resumen de cierre que refleja esos cambios

### Requirement: Acceso de todos los participantes al resumen de cierre
El sistema SHALL permitir a cualquier participante del viaje, con independencia de su rol, consultar el resumen de cierre una vez el viaje está en estado `closed`.

#### Scenario: Participante consulta el resumen
- **WHEN** un participante con rol `participant` abre un viaje en estado `closed`
- **THEN** el sistema le muestra el resumen de cierre completo, incluidos los saldos y la liquidación de todos los participantes

#### Scenario: Resumen solicitado sobre un viaje abierto
- **WHEN** un participante intenta consultar el resumen de cierre de un viaje en estado `open`
- **THEN** el sistema indica que el viaje aún no está cerrado y le ofrece la vista de saldos en curso

#### Scenario: Persona ajena al viaje
- **WHEN** alguien que no participa en el viaje intenta acceder a su resumen de cierre
- **THEN** el sistema deniega el acceso y no revela ningún dato del viaje

### Requirement: Exportación del resumen
El sistema SHALL permitir a cualquier participante exportar el resumen del viaje en un formato de texto compartible fuera de la aplicación, que incluya el total, el coste por persona, los saldos y la liquidación pendiente.

#### Scenario: Compartir el resumen
- **WHEN** un participante elige compartir el resumen de un viaje
- **THEN** el sistema produce un texto legible con el total, el coste por persona, los saldos de cada participante y las transferencias de la liquidación
- **AND** ofrece copiarlo o compartirlo mediante los mecanismos del dispositivo

#### Scenario: Exportación del detalle de gastos
- **WHEN** un `admin` exporta los gastos del viaje
- **THEN** el sistema genera un fichero CSV con una fila por gasto que incluye fecha, concepto, importe, pagador, tipo y participantes del reparto
