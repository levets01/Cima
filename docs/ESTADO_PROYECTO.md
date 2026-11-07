# Estado del proyecto Cima

Actualizado el 6 de noviembre de 2026. La prioridad acordada es una aplicación de escritorio para Windows, con funcionamiento local y datos en SQLite.

## Alcance de la entrega

Cima incluye registro de préstamos y clientes por nombre, pagos de capital y rédito, calendario, indicadores, importación Excel/CSV y configuración. Electron integra la interfaz y el servicio local; SQLite guarda la cartera en el perfil del usuario de Windows.

El primer inicio permite crear nombre, correo y contraseña propios. La aplicación instalada no depende de credenciales de demostración, de un servidor externo ni de PostgreSQL. El servicio de escritorio escucha en `127.0.0.1`, usa puerto automático y una clave de ejecución generada localmente.

Una carpeta de datos representa una única cartera compartida por los usuarios de Cima que existen en esa base. No hay aislamiento por negocio ni permisos por rol. La pantalla de clientes representa préstamos por nombre; todavía no existe un catálogo independiente con documento, teléfono o identidad única del cliente.

## Correcciones e implementación

| Área | Problema detectado o necesidad | Cambio |
| --- | --- | --- |
| Nuevo y editar | Formularios no abrían o no cargaban el préstamo | Apertura y datos del formulario corregidos |
| Guardado | Se anunciaba éxito sin esperar al servidor | Espera, bloqueo durante envío y errores visibles |
| Autenticación | Login rechazado causaba redirecciones y sesiones podían mezclarse | Sesión coherente, manejo específico del fallo de login y comprobación del usuario vigente después de restaurar datos |
| Carga | API desconectada podía parecer una cartera vacía | Estados de carga y fallos visibles |
| Calendario | Fin de mes podía saltar febrero; regeneración ignoraba pagos y configuración | Fechas corregidas y cálculo con historial y parámetros vigentes |
| Saldos e indicadores | Préstamo, calendario y resumen podían discrepar | Cálculo consistente desde pagos y transacciones en escritura |
| Validación | Fechas de formularios incompatibles y resultados de Zod descartados | Normalización de fechas, aplicación de datos validados y controles de saldo/período |
| Importación | Endpoint fijo, fechas Excel incorrectas y fallos parciales poco claros | API central, vista previa normalizada y lote transaccional |
| Porcentajes | Representación diferente según pantalla | Fracciones de API convertidas de forma consistente |
| Configuración | Guardar límites podía enviar tasas sin cambios | Solo se envían campos modificados, conservando tasas propias cuando corresponde |
| Ejecución | Dependencia de PostgreSQL externo y backend compilado no resolvía imports | SQLite embebido, motores Windows incluidos e imports resolubles |
| Primera instalación | Dependencia de una cuenta de ejemplo | Creación del acceso personal desde la aplicación |
| Persistencia | Datos debían sobrevivir a reinstalaciones y actualizaciones | Base fuera de la instalación: `%LOCALAPPDATA%\Cima\data\cima.db` |
| Copias | Necesidad de recuperar una cartera local | Copia consistente desde Configuración y acceso a la carpeta de datos |
| Distribución | Necesidad de abrir en Windows sin entorno de desarrollo | Preparación de instalador NSIS y ZIP Windows x64 |
| Documentación | Guías de plantilla o de una fase web anterior | Instrucciones de uso local, desarrollo, empaquetado y restauración manual |

## Datos y respaldo

La carpeta estable es `%LOCALAPPDATA%\Cima`, con la base en `data/cima.db`, la clave de sesiones en `data/runtime.json` y el registro del servicio en `logs/backend.log`. El instalador conserva los datos por defecto; el ZIP utiliza también esa carpeta de usuario.

La interfaz permite crear una copia `.db`. La restauración todavía es manual: cerrar Cima, conservar la base actual, sustituir `data/cima.db` por una copia y abrir para comprobar saldos y últimos pagos. La copia contiene los usuarios de esa cartera. No se debe reemplazar el archivo mientras la aplicación esté abierta.

La versión SQLite no abre una base PostgreSQL anterior ni convierte automáticamente sus datos. Si existe una cartera en ese formato, hay que preparar y reconciliar una migración de datos separada.

## Comprobaciones

Los comandos están en [README.md](../README.md). Verificación realizada en Linux:

| Comprobación | Resultado y alcance |
| --- | --- |
| Backend unitario | 14 pruebas aprobadas sobre calendario, pagos y validación |
| Backend integrado | 31 resultados aprobados, incluidas suites; SQLite temporal, API local, migraciones, transacciones, sesiones y respaldos |
| Interfaz Electron real, ejecución headless | Primer acceso, alta y edición de un préstamo de $1.000.000, capital de $100.000, rédito de $200.000, tasa mensual de 0 %, reportes y copia mediante IPC aprobados |
| Segunda apertura de Electron | Sesión, préstamo, dos pagos y configuración conservados, sin duplicados |
| Paquete Linux con ASAR y recursos externos | Recorrido completo aprobado desde `release/linux-unpacked/cima`: primer acceso, préstamo, edición, pagos, configuración, reportes, copia mediante IPC y persistencia tras reiniciar |
| ZIP Windows x64 | Regeneración final en curso con dependencias corregidas; el archivo anterior no es válido para entrega |
| Instalador NSIS | Regeneración final en curso con dependencias corregidas; el archivo anterior no es válido para entrega |
| Windows real | Pendiente de prueba de instalación y ejecución |

`npm run test:desktop` crea un directorio temporal propio con `CIMA_TEST_DATA_DIR`, hace dos aperturas y conserva datos y capturas para diagnóstico. Las pruebas de integración también usan bases temporales propias. Ninguna de estas ejecuciones utiliza la cartera real del usuario.

El paquete incluye explícitamente las dependencias del backend, el cliente Prisma y los motores Windows/Linux en recursos externos; ASAR contiene la aplicación sin las dependencias de desarrollo innecesarias. Tras corregir la omisión de dependencias, el ejecutable Linux empaquetado pasó el mismo recorrido completo que la ejecución desde código. Un paso `afterPack` verifica la presencia de componentes y que las dependencias se resuelvan dentro del propio paquete antes de producir los artefactos. Los archivos Windows finales se están regenerando con esta configuración, que conserva el icono y omite la firma digital.

Las comprobaciones anteriores no acreditan el funcionamiento del paquete en Windows real. La creación y reapertura del respaldo se comprobaron a nivel de backend; queda validar la restauración manual siguiendo la guía del usuario en Windows.

## Pendientes de aceptación

1. **Windows real.** Instalar en un equipo Windows x64 limpio; crear el acceso; comprobar funcionamiento sin Internet, escritura en el perfil, reinicio y persistencia. Probar también una ruta de usuario con espacios o acentos.
2. **Recorrido completo en Windows.** Repetir los flujos ya comprobados en Electron Linux y ampliar a importación válida e inválida, pago completo, calendario, cierre de sesión y mensajes de error.
3. **Respaldo y recuperación en Windows.** Repetir la creación de copia y probar la restauración manual en un caso controlado, reconciliando saldos y usuarios. Elegir una frecuencia y una ubicación externa de respaldo.
4. **Excel original.** `Control_Prestamos_Rosita_Mejorado (1).xlsx` no está en el repositorio. Comparar fórmulas, columnas, tasas, abonos y resultados esperados con el archivo real.
5. **Reglas financieras.** Aceptar rédito sobre saldo al vencimiento, abonos del mismo día, calendario quincenal, capital pagado con réditos pendientes y efecto retroactivo de cambiar tasas.
6. **Historial existente.** Definir la importación de fechas y períodos de los pagos reales. Los saldos iniciales agregados se marcan para revisión; no reconstruyen por sí solos el historial.
7. **Datos del cliente.** Confirmar si basta el nombre por préstamo o si se necesita catálogo con documento, teléfono y contacto.
8. **Distribución posterior.** Decidir firma del ejecutable y procedimiento de entrega de actualizaciones. Conservar identificador de aplicación y carpeta de datos entre versiones; respaldar antes de actualizar.

La restauración desde un botón, sincronización entre equipos, cuentas de negocios independientes y publicación de un servicio remoto no forman parte del flujo actual.
