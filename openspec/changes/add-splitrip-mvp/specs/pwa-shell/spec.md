## Purpose

Hace que la aplicación se comporte como una app de móvil y no como una página web: se instala en la pantalla de inicio, arranca rápido, y su interfaz está pensada para usarse con una mano y en marcha, que es como se apuntan los gastos durante un viaje.

## ADDED Requirements

### Requirement: Aplicación instalable
El sistema SHALL publicar un manifiesto de aplicación web con nombre, iconos en los tamaños que exigen iOS y Android, color de tema y modo de visualización independiente, de forma que el navegador ofrezca instalarla en la pantalla de inicio.

#### Scenario: Instalación en Android
- **WHEN** un usuario abre la aplicación en un navegador Android compatible
- **THEN** el navegador ofrece añadirla a la pantalla de inicio
- **AND** al abrirla desde ahí, se muestra sin la barra de direcciones del navegador

#### Scenario: Instalación en iOS
- **WHEN** un usuario usa "Añadir a pantalla de inicio" en Safari sobre iOS
- **THEN** la aplicación aparece con su icono y su nombre
- **AND** al abrirla, se muestra a pantalla completa sin la interfaz del navegador

#### Scenario: Uso desde un navegador de escritorio
- **WHEN** un usuario abre la aplicación en un navegador de escritorio
- **THEN** la aplicación funciona con normalidad, adaptando el ancho de la interfaz

### Requirement: Arranque rápido y comportamiento sin conexión
El sistema SHALL cachear los recursos estáticos de la interfaz mediante un service worker, de modo que la aplicación abra sin esperar a la red. Cuando no haya conexión, el sistema SHALL mostrar un mensaje claro en lugar de un error del navegador, y SHALL impedir el registro de gastos hasta que la conexión se restablezca.

#### Scenario: Segunda apertura de la aplicación
- **WHEN** un usuario que ya ha visitado la aplicación la vuelve a abrir
- **THEN** la interfaz se muestra desde la caché sin esperar a la descarga de los recursos estáticos

#### Scenario: Apertura sin conexión
- **WHEN** un usuario abre la aplicación instalada sin conexión a internet
- **THEN** el sistema muestra la interfaz y un aviso de que no hay conexión, en lugar de una página de error del navegador

#### Scenario: Intento de registrar un gasto sin conexión
- **WHEN** un usuario intenta registrar un gasto sin conexión
- **THEN** el sistema le informa de que necesita conexión y no da el gasto por registrado

### Requirement: Interfaz mobile-first
La interfaz SHALL estar diseñada para pantallas de móvil como caso principal: navegación alcanzable con el pulgar, zonas táctiles de al menos 44 píxeles de lado, formularios que no requieran zoom, y la acción de registrar un gasto accesible desde la pantalla principal del viaje.

#### Scenario: Registro de un gasto en pocos toques
- **WHEN** un participante con el viaje abierto quiere registrar un gasto
- **THEN** dispone de una acción de añadir gasto visible en la pantalla principal del viaje
- **AND** puede completar el registro indicando solo concepto e importe, aceptando el resto de valores por defecto

#### Scenario: Interfaz en una pantalla estrecha
- **WHEN** la aplicación se muestra en una pantalla de 360 píxeles de ancho
- **THEN** todo el contenido es legible y utilizable sin desplazamiento horizontal

#### Scenario: Entrada de importes
- **WHEN** un participante toca el campo de importe
- **THEN** el dispositivo muestra un teclado numérico

### Requirement: Actualización de la aplicación instalada
El sistema SHALL detectar cuándo hay una versión nueva publicada y SHALL aplicarla sin que el usuario tenga que desinstalar y reinstalar la aplicación.

#### Scenario: Nueva versión disponible
- **WHEN** se publica una versión nueva y el usuario abre la aplicación instalada
- **THEN** el sistema carga la versión nueva, avisando al usuario si es necesario recargar para completarla
