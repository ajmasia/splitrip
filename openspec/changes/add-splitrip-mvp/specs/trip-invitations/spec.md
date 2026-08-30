## Purpose

Permite incorporar viajeros a un viaje con la menor fricción posible: el organizador comparte un enlace o un código QR, y quien lo abre entra escribiendo únicamente su nombre, sin crear cuenta ni recordar contraseñas. Cubre también la retirada de ese acceso.

## ADDED Requirements

### Requirement: Generación de invitaciones
El sistema SHALL permitir a un `admin` de un viaje en estado `open` generar una invitación. Cada invitación SHALL llevar asociado el rol (`admin` o `participant`) con el que entrará quien la use, SHALL tener una URL única e imposible de adivinar, y SHALL poder mostrarse como código QR además de como enlace copiable.

#### Scenario: Generación de una invitación de participante
- **WHEN** un `admin` genera una invitación con rol `participant`
- **THEN** el sistema devuelve una URL única y su representación en código QR
- **AND** la invitación queda registrada como activa y asociada a ese viaje y a ese rol

#### Scenario: Generación de una invitación de organizador
- **WHEN** un `admin` genera una invitación con rol `admin`
- **THEN** quien use esa invitación se incorporará al viaje con rol `admin`

#### Scenario: Invitación con rol de organizador solicitada por un participante
- **WHEN** un participante con rol `participant` intenta generar una invitación
- **THEN** el sistema rechaza la operación e informa de que requiere permisos de organizador

#### Scenario: Enlace no adivinable
- **WHEN** el sistema genera el identificador de una invitación
- **THEN** ese identificador tiene al menos 128 bits de entropía y se genera con un generador criptográficamente seguro

### Requirement: Incorporación al viaje sin cuenta
El sistema SHALL permitir a cualquier persona que abra una invitación activa incorporarse al viaje indicando únicamente un nombre visible. El sistema NO SHALL exigir contraseña, correo electrónico ni verificación externa para completar la incorporación.

#### Scenario: Incorporación correcta
- **WHEN** una persona abre una invitación activa e introduce el nombre "Ana"
- **THEN** el sistema la registra como participante del viaje con el rol que llevaba la invitación
- **AND** la lleva a la pantalla del viaje, donde ya puede consultar y registrar gastos

#### Scenario: Nombre vacío
- **WHEN** una persona intenta incorporarse sin indicar nombre
- **THEN** el sistema rechaza la incorporación e informa de que el nombre es obligatorio

#### Scenario: Nombre ya usado en el mismo viaje
- **WHEN** una persona intenta incorporarse con un nombre que ya usa otro participante del mismo viaje, ignorando mayúsculas y espacios sobrantes
- **THEN** el sistema rechaza la incorporación e informa de que ese nombre ya está en uso en este viaje

#### Scenario: Invitación inexistente o mal formada
- **WHEN** una persona abre una URL de invitación que no corresponde a ninguna invitación
- **THEN** el sistema muestra un mensaje indicando que la invitación no es válida, y no revela ninguna información del viaje

### Requirement: Persistencia de la identidad en el dispositivo
Tras incorporarse a un viaje, el sistema SHALL emitir al participante una credencial de sesión que se conserva en su dispositivo, de forma que en visitas posteriores acceda al viaje sin volver a identificarse. Esa credencial SHALL dar acceso únicamente a los viajes en los que la persona participa.

#### Scenario: Regreso al viaje desde el mismo dispositivo
- **WHEN** un participante que ya se incorporó vuelve a abrir la aplicación en el mismo dispositivo
- **THEN** el sistema lo reconoce y le muestra directamente sus viajes, sin pedirle el nombre de nuevo

#### Scenario: Acceso desde un dispositivo sin credencial
- **WHEN** una persona abre la URL de un viaje en un dispositivo que no tiene credencial para ese viaje
- **THEN** el sistema no muestra los datos del viaje y ofrece la vía de incorporación mediante invitación

#### Scenario: Reutilización de la invitación desde un segundo dispositivo
- **WHEN** un participante ya incorporado abre de nuevo la misma invitación desde otro dispositivo e introduce exactamente el nombre con el que ya figura en el viaje
- **THEN** el sistema le ofrece continuar como ese participante existente en lugar de crear uno duplicado
- **AND** al confirmarlo, emite una credencial para ese participante en el nuevo dispositivo

### Requirement: Revocación y caducidad de invitaciones
El sistema SHALL permitir a un `admin` revocar una invitación activa. Una invitación revocada o caducada NO SHALL permitir nuevas incorporaciones, y SHALL dejar intactos a los participantes que ya se incorporaron con ella.

#### Scenario: Revocación de una invitación
- **WHEN** un `admin` revoca una invitación
- **THEN** cualquier intento posterior de usar esa URL es rechazado con un mensaje de invitación no válida
- **AND** los participantes que ya se habían incorporado con ella conservan su acceso

#### Scenario: Invitación caducada
- **WHEN** una persona abre una invitación cuya fecha de caducidad ya ha pasado
- **THEN** el sistema rechaza la incorporación e indica que la invitación ha caducado

#### Scenario: Invitación sobre un viaje cerrado
- **WHEN** una persona abre una invitación de un viaje en estado `closed`
- **THEN** el sistema rechaza la incorporación e informa de que el viaje está cerrado

### Requirement: Expulsión de participantes
El sistema SHALL permitir a un `admin` retirar a un participante de un viaje en estado `open`. Si ese participante tiene gastos, pagos o participaciones en el reparto asociados, el sistema NO SHALL borrarlo: SHALL rechazar la expulsión e indicar qué le impide salir del viaje, para no dejar los saldos incoherentes.

#### Scenario: Expulsión de un participante sin actividad económica
- **WHEN** un `admin` expulsa a un participante que no ha pagado ningún gasto ni figura en el reparto de ninguno
- **THEN** el sistema lo retira del viaje y su credencial deja de dar acceso a él

#### Scenario: Expulsión de un participante con gastos
- **WHEN** un `admin` intenta expulsar a un participante que ha pagado al menos un gasto o participa en el reparto de alguno
- **THEN** el sistema rechaza la expulsión e informa de cuántos gastos lo implican
