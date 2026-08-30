## Purpose

Permite que la aplicación se use indistintamente en español y en inglés, para que un grupo de viaje con personas de distinta lengua pueda compartir el mismo viaje viendo cada una la interfaz en su idioma.

## ADDED Requirements

### Requirement: Idiomas admitidos e idioma por defecto
El sistema SHALL ofrecer la interfaz completa en español e inglés. El español SHALL ser el idioma por defecto: cuando no pueda determinarse una preferencia aplicable, la interfaz SHALL mostrarse en español.

#### Scenario: Idioma no determinable
- **WHEN** un usuario abre la aplicación sin preferencia guardada y su navegador declara un idioma que no es ni español ni inglés
- **THEN** el sistema muestra la interfaz en español

#### Scenario: Cobertura de la traducción
- **WHEN** se muestra cualquier pantalla de la aplicación en inglés
- **THEN** todos sus textos visibles aparecen en inglés, sin literales sin traducir

### Requirement: Detección del idioma del dispositivo
En ausencia de una preferencia explícita del usuario, el sistema SHALL seleccionar el idioma a partir del idioma declarado por el navegador, si este corresponde a uno de los idiomas admitidos.

#### Scenario: Navegador en inglés
- **WHEN** un usuario sin preferencia guardada abre la aplicación en un navegador configurado en inglés
- **THEN** el sistema muestra la interfaz en inglés

#### Scenario: Navegador en español
- **WHEN** un usuario sin preferencia guardada abre la aplicación en un navegador configurado en español
- **THEN** el sistema muestra la interfaz en español

### Requirement: Cambio manual de idioma
El sistema SHALL permitir al usuario cambiar el idioma de la interfaz en cualquier momento. La preferencia elegida SHALL conservarse en el dispositivo y SHALL prevalecer sobre el idioma declarado por el navegador en las visitas posteriores.

#### Scenario: Cambio de idioma
- **WHEN** un usuario cambia el idioma de español a inglés
- **THEN** la interfaz pasa a mostrarse en inglés sin perder el contexto en el que estaba

#### Scenario: Persistencia de la preferencia
- **WHEN** un usuario que eligió inglés vuelve a abrir la aplicación en el mismo dispositivo, con el navegador configurado en español
- **THEN** el sistema muestra la interfaz en inglés

### Requirement: Idioma independiente entre participantes
El idioma SHALL ser una preferencia de cada dispositivo y NO SHALL afectar a lo que ven los demás participantes del viaje. Los datos introducidos por los usuarios —nombres de viaje, conceptos de gasto, nombres de participantes— SHALL mostrarse siempre tal cual se escribieron, sin traducir.

#### Scenario: Dos participantes con idiomas distintos
- **WHEN** un participante usa la aplicación en inglés y otro del mismo viaje la usa en español
- **THEN** cada uno ve la interfaz en su idioma
- **AND** ambos ven los mismos conceptos de gasto e importes, con el texto introducido sin alterar

#### Scenario: Concepto de gasto en otro idioma
- **WHEN** un participante registra un gasto con el concepto "Dinner" y otro consulta el viaje en español
- **THEN** el segundo ve el concepto "Dinner" tal cual se escribió

### Requirement: Formato de importes y fechas según el idioma
El sistema SHALL formatear importes monetarios y fechas conforme a las convenciones del idioma activo, manteniendo el euro como divisa en ambos idiomas.

#### Scenario: Importe en español
- **WHEN** se muestra un importe de 1055 céntimos con la interfaz en español
- **THEN** el sistema lo presenta como "10,55 €"

#### Scenario: Importe en inglés
- **WHEN** se muestra ese mismo importe con la interfaz en inglés
- **THEN** el sistema lo presenta con las convenciones del inglés, con el separador decimal correspondiente y el símbolo del euro

#### Scenario: Fechas
- **WHEN** se muestra la fecha de un gasto
- **THEN** el sistema la formatea según las convenciones del idioma activo
