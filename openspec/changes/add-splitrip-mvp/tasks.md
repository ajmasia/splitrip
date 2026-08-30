## 1. Andamiaje del proyecto y entorno local en Docker

- [ ] 1.1 Inicializar el repositorio con Next.js (App Router) y TypeScript en modo estricto; verificar que `npm run build` compila sin errores y que la página inicial se sirve en local
- [ ] 1.2 Configurar ESLint, Prettier y el script de comprobación de tipos; verificar que `npm run lint` y `npm run typecheck` pasan en limpio
- [ ] 1.3 Añadir la configuración de Conventional Commits (commitlint y hook de commit) y el fichero de versión SemVer; verificar que un mensaje que no cumple el formato es rechazado y que uno válido pasa
- [ ] 1.4 Inicializar el proyecto de Supabase local con la CLI; verificar que `supabase start` levanta los contenedores y que Studio responde en su puerto
- [ ] 1.5 Añadir el `Dockerfile` de la aplicación y el `docker compose` que orquesta app y stack de Supabase; verificar que desde un clon limpio un único comando levanta todo y la aplicación conecta con la base de datos local
- [ ] 1.6 Documentar en el README el arranque local, las variables de entorno necesarias y los comandos de uso diario; verificar siguiendo el README desde cero en un directorio limpio

## 2. Esquema de datos y autorización

- [ ] 2.1 Crear la migración con las tablas `trips`, `participants` e `invitations`, con sus claves, restricciones de unicidad y el `CHECK` de rol; verificar que la migración se aplica en la base local y que las restricciones rechazan los casos inválidos
- [ ] 2.2 Crear la migración con las tablas `expenses`, `expense_shares` y `payments`, con importes en `BIGINT` de céntimos, columna `currency` con `CHECK (currency = 'EUR')`, `CHECK` de importe positivo y la restricción que impide que una `contribution` tenga participaciones; verificar con inserciones que cada restricción actúa
- [ ] 2.3 Crear la migración de la tabla `activity` y de los triggers que la alimentan desde `expenses`, `payments`, `participants` y `trips`; verificar que cada tipo de operación deja su entrada con autor, acción y momento
- [ ] 2.4 Activar RLS en todas las tablas y escribir las políticas de lectura basadas en la pertenencia al viaje a través de `auth.uid()`; verificar con pruebas de integración que un participante lee su viaje y que un usuario ajeno no obtiene ninguna fila
- [ ] 2.5 Escribir las políticas de escritura que distinguen `admin` de `participant` según lo especificado en `trip-management`; verificar con pruebas que un `participant` no puede modificar un gasto ajeno y que un `admin` sí
- [ ] 2.6 Crear la vista de saldos que agrega pagado, imputado y liquidado por participante; verificar con un conjunto de datos de prueba que los saldos coinciden con los calculados a mano y que suman exactamente cero

## 3. Aritmética del dinero

- [ ] 3.1 Implementar la función pura de reparto en céntimos con asignación determinista del resto; verificar con pruebas unitarias que 60,00 € entre 4 da partes iguales, que 10,00 € entre 3 da 3,34/3,33/3,33, y que la suma de partes siempre iguala el importe
- [ ] 3.2 Implementar la función pura de liquidación voraz a partir de los saldos; verificar con pruebas unitarias que resuelve el caso de la spec, que nunca propone más de `n-1` transferencias y que aplicarlas deja todos los saldos a cero
- [ ] 3.3 Añadir una prueba basada en propiedades sobre conjuntos aleatorios de gastos y pagos; verificar que para cualquier entrada la suma de saldos es cero y que la liquidación los anula
- [ ] 3.4 Implementar el formateo y el parseo de importes de la interfaz; verificar con pruebas que rechaza importes de más de dos decimales, cero y negativos, y que redondea correctamente al convertir a céntimos

## 4. Funciones de escritura en base de datos

- [ ] 4.1 Implementar la función RPC de creación de gasto que inserta el gasto y sus participaciones de forma atómica aplicando la regla de reparto; verificar con pruebas de integración el caso de reparto total, el de subgrupo y el de contribución sin participaciones
- [ ] 4.2 Implementar las funciones RPC de edición y borrado de gasto que regeneran las participaciones y respetan los permisos por rol; verificar con pruebas que los saldos quedan correctos tras editar el importe y tras cambiar el conjunto de reparto
- [ ] 4.3 Implementar las funciones RPC de registro y anulación de pagos con sus validaciones; verificar con pruebas que rechaza pagos a uno mismo, importes no positivos y participantes de otro viaje
- [ ] 4.4 Implementar la función RPC de incorporación por invitación, incluyendo la comprobación de nombre duplicado y la reincorporación desde un segundo dispositivo; verificar con pruebas los casos de invitación válida, revocada, caducada y de viaje cerrado
- [ ] 4.5 Implementar las funciones RPC de cierre y reapertura de viaje, con generación del snapshot JSONB del resumen al cerrar; verificar con pruebas que el resumen no varía entre dos consultas y que se regenera al reabrir y volver a cerrar
- [ ] 4.6 Añadir la comprobación de viaje cerrado a todas las funciones de escritura; verificar con pruebas que toda escritura sobre un viaje `closed` es rechazada

## 5. Identidad y acceso

- [ ] 5.1 Integrar el cliente de Supabase con sesión anónima automática en la primera visita y refresco de token; verificar que un navegador nuevo obtiene un `auth.uid()` estable que persiste entre recargas
- [ ] 5.2 Implementar la creación de viaje y la lista de viajes del participante; verificar en la aplicación que quien crea un viaje aparece como `admin` y que solo ve los viajes en los que participa
- [ ] 5.3 Implementar la generación de invitaciones con identificador de 128 bits, rol asociado y caducidad; verificar que el identificador se genera con un generador criptográficamente seguro y que la invitación queda registrada como activa
- [ ] 5.4 Implementar la pantalla de invitación con enlace copiable y código QR; verificar escaneando el QR con un móvil que lleva a la pantalla de incorporación del viaje correcto
- [ ] 5.5 Implementar la pantalla de incorporación con introducción de nombre y sus validaciones; verificar los casos de nombre vacío, nombre duplicado e invitación no válida
- [ ] 5.6 Implementar la revocación de invitaciones y la expulsión de participantes con su comprobación de actividad económica; verificar que expulsar a alguien con gastos es rechazado con el mensaje correspondiente
- [ ] 5.7 Implementar la gestión de roles con la garantía de que siempre queda un `admin`; verificar que el único organizador no puede degradarse y que sí puede hacerlo si hay otro

## 6. Base de la interfaz: PWA e idiomas

- [ ] 6.1 Implementar el sistema de catálogos de textos en español e inglés con tipado de claves; verificar que el compilador falla si una clave existe en español y falta en inglés
- [ ] 6.2 Implementar la resolución de idioma (preferencia guardada, cabecera del navegador, español por defecto) y el selector de idioma persistente; verificar los tres caminos de resolución y que la preferencia sobrevive a recargar
- [ ] 6.3 Implementar el formateo de importes y fechas con `Intl` según el idioma activo; verificar que 1055 céntimos se muestran como "10,55 €" en español y con las convenciones inglesas en inglés
- [ ] 6.4 Implementar el diseño base mobile-first con navegación alcanzable con el pulgar y zonas táctiles de al menos 44 píxeles; verificar en una pantalla de 360 píxeles de ancho que no hay desplazamiento horizontal
- [ ] 6.5 Añadir el manifiesto de la PWA con iconos para iOS y Android, color de tema y modo independiente; verificar instalando la aplicación en un dispositivo Android y en uno iOS que abre sin la interfaz del navegador
- [ ] 6.6 Añadir el service worker de cacheado del shell, el aviso de falta de conexión y la detección de versión nueva; verificar que la segunda apertura no espera a la red, que sin conexión aparece el aviso en lugar del error del navegador, y que una versión nueva se aplica sin reinstalar

## 7. Gastos

- [ ] 7.1 Implementar la pantalla principal del viaje con el listado de gastos ordenado por fecha descendente y el estado vacío; verificar que muestra concepto, importe, pagador, tipo y número de personas del reparto
- [ ] 7.2 Implementar el formulario de alta de gasto con los valores por defecto (pagador es quien registra, reparto entre todos, fecha de hoy); verificar que se puede registrar un gasto indicando solo concepto e importe
- [ ] 7.3 Añadir al formulario la selección de otro pagador y del subconjunto de reparto; verificar que un gasto de 45,00 € repartido entre tres de cinco imputa 15,00 € a cada uno y no altera a los otros dos
- [ ] 7.4 Añadir el tipo de gasto `contribution` al formulario, ocultando el reparto al seleccionarlo; verificar que una contribución de 300,00 € suma al total del viaje y no altera ningún saldo
- [ ] 7.5 Implementar el detalle, la edición y el borrado de un gasto con los permisos por rol; verificar que un `participant` no puede editar un gasto ajeno y que un `admin` sí, y que el teclado numérico aparece al tocar el campo de importe

## 8. Saldos y liquidación

- [ ] 8.1 Implementar la pantalla de saldos con el neto de cada participante y lo que al usuario actual le toca pagar o cobrar destacado; verificar contra un viaje de prueba con saldos conocidos
- [ ] 8.2 Implementar la propuesta de liquidación y el estado "todo saldado"; verificar que reproduce el caso de la spec y que no propone transferencias cuando todos los saldos son cero
- [ ] 8.3 Implementar el registro de un pago desde la propuesta de liquidación, incluido el pago parcial; verificar que un pago de 25,00 € sobre una deuda de 40,00 € deja el saldo en -15,00 € y actualiza la propuesta
- [ ] 8.4 Implementar el historial de pagos y la anulación de un pago con sus permisos; verificar que anular revierte los saldos de ambos implicados y deja constancia en la actividad

## 9. Tiempo real y actividad

- [ ] 9.1 Implementar la suscripción por canal de viaje a los cambios de las tablas relevantes, invalidando las consultas afectadas; verificar con dos navegadores que un gasto añadido en uno aparece en el otro sin recargar y que los totales se actualizan
- [ ] 9.2 Implementar el indicador de conexión perdida y la resincronización al recuperarla; verificar cortando la red que aparece el aviso y que al restablecerla la pantalla refleja los cambios ocurridos durante la desconexión
- [ ] 9.3 Implementar el feed de actividad del viaje con autor, acción y momento; verificar que un gasto nuevo genera la entrada correspondiente y que una edición hecha por un `admin` lo identifica a él como autor
- [ ] 9.4 Implementar el indicador de actividad nueva cuando el usuario está en otra pantalla; verificar que aparece sin interrumpir lo que está haciendo
- [ ] 9.5 Verificar el aislamiento en tiempo real: comprobar con pruebas que un cliente suscrito al viaje A no recibe ningún evento del viaje B y que un participante expulsado deja de recibirlos

## 10. Panel del organizador, cierre y exportación

- [ ] 10.1 Implementar el panel de control del organizador con total gastado, desglose entre repartido y contribuciones, número de gastos, coste medio por persona y tabla por participante; verificar contra un viaje de prueba con cifras conocidas y comprobar el estado vacío sin errores
- [ ] 10.2 Añadir al panel la evolución del gasto por día; verificar con un viaje con gastos en varias fechas que los importes diarios cuadran con el total
- [ ] 10.3 Implementar el detalle de gastos con filtros por pagador y por tipo, mostrando el total filtrado; verificar los tres casos: filtro por pagador, filtro por tipo y filtro sin resultados con total 0,00 €
- [ ] 10.4 Restringir el panel al rol `admin` ofreciendo al `participant` la vista de saldos; verificar que un `participant` no accede al panel y sí a los saldos
- [ ] 10.5 Implementar el cierre del viaje desde la interfaz y la pantalla de resumen de cierre accesible a todos los participantes; verificar que tras cerrar, un `participant` ve el resumen completo y que el viaje queda en solo lectura
- [ ] 10.6 Implementar la exportación del resumen como texto compartible y la exportación de los gastos en CSV; verificar que el texto incluye total, coste por persona, saldos y liquidación, y que el CSV tiene una fila por gasto con fecha, concepto, importe, pagador, tipo y participantes

## 11. Verificación de extremo a extremo y despliegue

- [ ] 11.1 Escribir el recorrido de extremo a extremo con Playwright: crear viaje, invitar, unirse, añadir gastos de los dos tipos, consultar liquidación, registrar un pago, cerrar y ver el resumen; verificar que pasa contra el entorno local en Docker
- [ ] 11.2 Añadir la integración continua que ejecuta lint, tipos, pruebas unitarias, pruebas de integración contra Postgres y el recorrido de extremo a extremo; verificar que la ejecución completa pasa en una rama limpia
- [ ] 11.3 Crear el proyecto de Supabase de producción y aplicarle las migraciones del repositorio; verificar que el esquema desplegado coincide con el local y que RLS está activo en todas las tablas
- [ ] 11.4 Desplegar en Vercel con sus variables de entorno; verificar el recorrido completo desde un móvil real, incluida la instalación como PWA en iOS y en Android
- [ ] 11.5 Verificar el comportamiento con un grupo de cinco participantes en dispositivos distintos: comprobar que los importes cuadran al céntimo, que el tiempo real llega a todos y que la liquidación final es correcta
