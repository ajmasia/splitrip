## Purpose

Convierte la lista de gastos de un viaje en una respuesta accionable: cuánto ha puesto cada persona, cuánto le corresponde, y qué transferencias concretas hay que hacer para que nadie deba nada a nadie. Incluye el registro de los pagos con los que el grupo salda esas deudas.

## ADDED Requirements

### Requirement: Reparto exacto de un gasto en céntimos
El sistema SHALL repartir el importe de un gasto de tipo `shared` a partes iguales entre los participantes de su reparto, operando en céntimos enteros. Cuando el importe no sea divisible de forma exacta, SHALL distribuir los céntimos sobrantes de uno en uno siguiendo un orden estable y reproducible, de modo que la suma de las partes SHALL ser siempre exactamente igual al importe del gasto.

#### Scenario: Importe divisible de forma exacta
- **WHEN** un gasto de 60,00 € se reparte entre 4 participantes
- **THEN** el sistema imputa 15,00 € a cada uno
- **AND** la suma de las cuatro partes es exactamente 60,00 €

#### Scenario: Importe con resto de céntimos
- **WHEN** un gasto de 10,00 € se reparte entre 3 participantes
- **THEN** el sistema imputa 3,34 € a un participante y 3,33 € a cada uno de los otros dos
- **AND** la suma de las tres partes es exactamente 10,00 €

#### Scenario: Reparto reproducible
- **WHEN** se calculan dos veces las partes del mismo gasto sin que este haya cambiado
- **THEN** el sistema asigna los céntimos sobrantes a los mismos participantes en ambos cálculos

### Requirement: Saldo de cada participante
El sistema SHALL calcular, para cada participante del viaje, el total que ha pagado, el total que le corresponde según los repartos en los que figura, y su saldo neto como la diferencia entre ambos. Un saldo positivo SHALL significar que el grupo le debe dinero; uno negativo, que él debe dinero al grupo. La suma de los saldos netos de todos los participantes SHALL ser siempre exactamente cero.

#### Scenario: Saldo de quien ha adelantado dinero
- **WHEN** un participante ha pagado 100,00 € en gastos y le corresponden 40,00 € según los repartos
- **THEN** el sistema le muestra un saldo neto de +60,00 €, indicando que el grupo le debe esa cantidad

#### Scenario: Saldo de quien no ha pagado nada
- **WHEN** un participante no ha pagado ningún gasto y le corresponden 40,00 € según los repartos
- **THEN** el sistema le muestra un saldo neto de -40,00 €, indicando que debe esa cantidad al grupo

#### Scenario: Los saldos siempre cuadran
- **WHEN** el sistema calcula los saldos de un viaje con cualquier combinación de gastos, contribuciones y pagos
- **THEN** la suma de los saldos netos de todos los participantes es exactamente cero

### Requirement: Las contribuciones no generan deuda
El sistema NO SHALL incluir los gastos de tipo `contribution` en el cálculo de los saldos de ningún participante, ni siquiera el de su pagador. Estos gastos SHALL contar únicamente en el total gastado del viaje.

#### Scenario: Contribución de un participante
- **WHEN** un participante paga una contribución de 300,00 € y ningún otro gasto
- **THEN** su saldo neto por causa de ese gasto es 0,00 €
- **AND** el total gastado del viaje incluye esos 300,00 €

### Requirement: Propuesta de liquidación
El sistema SHALL proponer, a partir de los saldos vigentes, un conjunto de transferencias concretas de la forma "X paga N € a Y" que lleve todos los saldos a cero. El número de transferencias propuestas SHALL ser como máximo el número de participantes con saldo distinto de cero menos uno.

#### Scenario: Liquidación de un viaje con saldos abiertos
- **WHEN** un participante consulta la liquidación de un viaje en el que Ana tiene +60,00 €, Beto -40,00 € y Carla -20,00 €
- **THEN** el sistema propone que Beto pague 40,00 € a Ana y que Carla pague 20,00 € a Ana
- **AND** aplicar esas transferencias dejaría todos los saldos a cero

#### Scenario: Viaje ya saldado
- **WHEN** un participante consulta la liquidación de un viaje en el que todos los saldos son cero
- **THEN** el sistema indica que no hay nada pendiente de saldar y no propone ninguna transferencia

#### Scenario: Consulta en cualquier momento del viaje
- **WHEN** un participante consulta la liquidación con el viaje aún en curso
- **THEN** el sistema calcula la propuesta con los gastos registrados hasta ese instante, sin exigir que el viaje esté cerrado

### Requirement: Registro de pagos entre participantes
El sistema SHALL permitir registrar un pago de un participante a otro por un importe determinado. Un pago registrado SHALL modificar los saldos de ambos implicados, y por tanto la propuesta de liquidación. El pagador y el receptor SHALL ser participantes distintos del mismo viaje, y el importe SHALL ser mayor que cero.

#### Scenario: Registro de un pago que salda una deuda
- **WHEN** Beto, con saldo -40,00 €, registra un pago de 40,00 € a Ana, que tenía +40,00 €
- **THEN** el saldo de ambos pasa a 0,00 €
- **AND** la liquidación deja de proponer esa transferencia

#### Scenario: Pago parcial
- **WHEN** Beto, con saldo -40,00 €, registra un pago de 25,00 € a Ana
- **THEN** el saldo de Beto pasa a -15,00 € y el de Ana se reduce en la misma cantidad
- **AND** la liquidación propone la transferencia restante de 15,00 €

#### Scenario: Pago a uno mismo
- **WHEN** se intenta registrar un pago cuyo pagador y receptor son la misma persona
- **THEN** el sistema rechaza la operación

#### Scenario: Anulación de un pago mal registrado
- **WHEN** un participante anula un pago que había registrado, o un `admin` anula cualquier pago del viaje
- **THEN** el sistema revierte su efecto sobre los saldos de ambos implicados
- **AND** deja constancia de la anulación en la actividad del viaje

### Requirement: Consulta del estado de deudas
El sistema SHALL mostrar a cualquier participante del viaje una vista con el saldo neto de todas las personas y las transferencias pendientes, destacando de forma explícita lo que a él le toca pagar o cobrar.

#### Scenario: Un participante consulta su situación
- **WHEN** un participante con saldo -40,00 € abre la vista de saldos
- **THEN** el sistema le muestra de forma destacada a quién debe pagar y cuánto
- **AND** muestra además el saldo del resto de participantes

#### Scenario: Historial de pagos
- **WHEN** un participante abre el historial de pagos del viaje
- **THEN** el sistema lista los pagos registrados con pagador, receptor, importe y fecha
