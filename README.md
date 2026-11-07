# Cima · Escritorio para Windows

Cima permite llevar una cartera de préstamos en pesos colombianos: registrar clientes y préstamos, recibir abonos a capital y réditos, consultar vencimientos e indicadores e importar registros desde Excel o CSV.

La aplicación de escritorio incluye la interfaz, el servicio local y una base SQLite. Después de instalarla puedes trabajar sin conexión a Internet, sin instalar Node.js, PostgreSQL ni Docker. Los datos quedan en el perfil de Windows de ese equipo.

**Paquetes Windows en regeneración:** el ejecutable Linux empaquetado ya pasó el recorrido completo, incluida copia y persistencia después de reiniciar. Se corrigió la inclusión de dependencias y se están generando los nuevos ZIP y EXE para Windows; los archivos Windows anteriores no están listos para entregar. La prueba en un equipo Windows real sigue pendiente.

## Comenzar en tres pasos

1. **Instala y abre Cima.** En Windows 10 u 11 de 64 bits, ejecuta `Cima-1.0.0-Setup.exe` y abre Cima desde su acceso directo. Como alternativa, extrae **todo** el contenido de `Cima-1.0.0-win-x64.zip` y abre `Cima.exe` desde esa carpeta.
2. **Crea tu acceso.** En el primer inicio escribe tu nombre, correo y una contraseña de al menos ocho caracteres. No hay una cuenta ni contraseña predeterminadas en la aplicación instalada. Después puedes registrar el primer préstamo.
3. **Guarda una copia.** En **Configuración → Crear copia de seguridad**, elige una carpeta y guarda el archivo `.db`. Repite la copia después de cargar pagos o realizar cambios importantes; guarda también una copia fuera del equipo.

El instalador y el ZIP son dos formas de ejecutar la misma aplicación. El ZIP no incluye tu cartera y los datos tampoco se guardan junto al ejecutable.

## Dónde se guardan los datos

La carpeta de Cima se encuentra en `%LOCALAPPDATA%\Cima`, normalmente `C:\Users\TU_USUARIO\AppData\Local\Cima`. El botón **Configuración → Abrir carpeta de datos** abre directamente su subcarpeta `data`.

| Archivo | Contenido |
| --- | --- |
| `data/cima.db` | Préstamos, pagos, usuarios y configuración del negocio |
| `data/runtime.json` | Clave local generada para las sesiones de la aplicación |
| `logs/backend.log` | Registro del servicio local para diagnosticar fallos |

El archivo de la cartera se guarda fuera de la instalación para conservarlo al actualizar. No borres la carpeta de datos al reinstalar. El instalador está configurado para conservarla al desinstalar; una copia externa sigue siendo necesaria para recuperar los datos si se pierde el equipo o se borra el perfil de Windows.

Cada perfil de Windows tiene su propia carpeta. Dentro de una instalación, los usuarios de Cima comparten una sola cartera; las referencias de usuario identifican al creador de un registro y no separan negocios independientes.

## Copias y restauración

El botón **Crear copia de seguridad** guarda una copia consistente de la base en la ubicación elegida. Incluye los usuarios y sus contraseñas protegidas, además de la cartera y los parámetros. Las copias contienen información del negocio: guárdalas en una ubicación que controles.

La restauración es manual en esta versión:

1. Cierra Cima por completo. No reemplaces la base mientras la aplicación esté abierta.
2. Conserva una copia del archivo actual `%LOCALAPPDATA%\Cima\data\cima.db` para poder volver atrás.
3. Copia el respaldo en esa carpeta con el nombre `cima.db`, reemplazando el archivo actual.
4. Abre Cima y comprueba clientes, saldos y últimos pagos. Inicia sesión con un usuario que exista en la copia restaurada.

No necesitas reemplazar `runtime.json` para restaurar una cartera. Las bases de versiones anteriores que usaban PostgreSQL requieren una conversión de datos; no pueden restaurarse renombrándolas como `.db`.

## Comportamiento del negocio

Las tasas iniciales son 10 % quincenal y 20 % mensual, con un calendario de 36 períodos por préstamo. En Configuración se escriben como porcentajes; la API las representa como fracciones (`0.10` = 10 %).

- Capital pendiente = principal menos abonos a capital, con mínimo cero.
- Cada período genera rédito sobre el capital pendiente a su fecha de vencimiento. Un abono a capital afecta los períodos que vencen ese mismo día o después.
- Cada pago de rédito se asigna a un período. El sistema rechaza abonos mayores que el capital pendiente, réditos mayores que el saldo del período, pagos futuros y pagos anteriores al préstamo.
- El calendario mensual conserva el día del primer vencimiento, limitado al último día del mes cuando es necesario. El quincenal alterna fin de mes y día 15 a partir del primer vencimiento.
- Un período se considera vencido desde el día siguiente a su fecha, usando `America/Bogota`. Los cálculos monetarios se redondean a dos decimales.
- Rentabilidad = réditos cobrados / capital prestado. Recuperación = capital recuperado / capital prestado.
- Cambiar una tasa en Configuración la aplica también a los préstamos existentes de esa modalidad y recalcula el calendario. Cambiar únicamente límites o número de períodos conserva las tasas propias de los préstamos.
- Un préstamo con el capital pagado puede conservar réditos históricos pendientes. Esos réditos siguen admitiendo pagos mientras exista saldo del período.

El Excel citado por el proyecto, `Control_Prestamos_Rosita_Mejorado (1).xlsx`, no está incluido en el repositorio. Las reglas anteriores necesitan aceptación con el archivo y ejemplos reales antes de dar por reconciliada una cartera.

## Importar desde Excel o CSV

La importación usa la primera hoja y muestra una vista previa. Columnas mínimas:

| Dato | Cabeceras admitidas |
| --- | --- |
| Nombre | `Cliente`, `Nombre`, `customerName` |
| Fecha del préstamo | `Fecha`, `loanDate` |
| Capital | `Capital`, `Monto`, `principal` |
| Modalidad, opcional | `Modalidad`, `modality`: `Mensual` o `Quincenal`; si falta usa Mensual |
| Primer vencimiento, opcional | `firstInterestPaymentDate`, `Primer Pago` |
| Tasa, opcional | `ratePerPeriod`: fracción o porcentaje numérico; sin ella usa la configuración |

Las fechas pueden ser celdas de fecha de Excel, `AAAA-MM-DD` o `DD/MM/AAAA`. Usa importes numéricos sin símbolos de moneda ni separadores de miles en celdas de texto. La API valida el lote completo antes de guardarlo.

La API admite además saldos iniciales históricos de capital y rédito. Esos agregados se convierten en pagos marcados para revisión porque no contienen las fechas y períodos reales; no reconstruyen por sí solos el historial original.

## Desarrollo desde el código

Esta sección es para modificar o compilar el programa; no es necesaria para usar el instalador.

Requisitos: Node.js 22.18 o superior, npm y conexión durante la instalación de dependencias y descarga de motores. Desde la raíz:

```sh
npm ci
npm --prefix backend ci
npm run desktop:install
npm run desktop
```

`npm run desktop:install` descarga el ejecutable de Electron para tu equipo; se ejecuta explícitamente porque instalar el paquete npm no garantiza esa descarga. `npm run desktop` compila frontend y backend y abre Electron. El proceso de escritorio prepara su base local y ofrece crear el primer acceso. También utiliza la carpeta de datos de Cima: crea una copia antes de hacer pruebas con la cartera de uso diario.

Para ejecutar la versión web durante el desarrollo, crea `.env` y `backend/.env` desde sus respectivos ejemplos si no existen. En PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Conserva los valores propios si esos archivos ya existen. En una terminal, desde `backend`:

```sh
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

En otra terminal, desde la raíz:

```sh
npm run dev
```

La API web usa `http://localhost:4000/api`; la interfaz, `http://localhost:5173`. `DATABASE_URL="file:./dev.db"` crea `backend/prisma/dev.db`, una base de desarrollo independiente de la carpeta de datos de Electron. El seed web crea el usuario definido en `SEED_EMAIL` y `SEED_PASSWORD` de `backend/.env`; los valores del ejemplo son exclusivamente de desarrollo. No son credenciales de la aplicación instalada.

`VITE_API_URL` y `FRONTEND_URL` configuran esta ejecución web. En el escritorio, Electron define la dirección de su servicio local, un puerto automático y una clave generada para esa ejecución. El servicio escucha únicamente en `127.0.0.1`.

## Comprobaciones

Desde la raíz:

```sh
npm run check
npm --prefix backend run build
npm --prefix backend test
npm --prefix backend run test:integration
npm run test:desktop
```

`check` ejecuta pruebas del frontend, linter y compilación con TypeScript. La integración crea una base SQLite temporal propia, aplica migraciones y prueba préstamos, pagos, reportes y transacciones; no necesita PostgreSQL ni `TEST_DATABASE_URL` y no abre la cartera del usuario.

`test:desktop` abre Electron dos veces contra un directorio temporal propio definido por `CIMA_TEST_DATA_DIR`. Prueba el primer acceso y los formularios, después comprueba sesión y datos tras reiniciar. Conserva los archivos de prueba y capturas en la ruta que muestra al terminar. En Linux se ejecuta sin ventana visible; en Windows puede abrir las ventanas de prueba.

Verificación realizada en Linux: 14 pruebas unitarias del backend y 31 resultados de integración aprobados, contando sus suites. La prueba de interfaz Electron también pasó: creó el acceso, creó y editó un préstamo de $1.000.000, registró $100.000 de capital y $200.000 de rédito, guardó una tasa mensual de 0 %, consultó reportes, creó una copia mediante el puente local y verificó los mismos datos y sesión después de reiniciar, sin duplicados. El mismo recorrido pasó además desde el ejecutable Linux empaquetado en `release/linux-unpacked/cima`, comprobando el código dentro de ASAR y el backend en recursos externos. Esto no constituye una prueba del paquete en Windows real.

## Generar los archivos para Windows

En Windows, ejecuta cualquiera de estas opciones:

```powershell
npm run dist:win
# o
npm run dist:win:setup
# o
npm run windows:installer
```

El script compila ambas aplicaciones, prepara los recursos y genera los paquetes Windows x64 en `release/`:

- `Cima-1.0.0-Setup.exe`: instalador NSIS con acceso directo del menú Inicio y escritorio.
- `Cima-1.0.0-win-x64.zip`: paquete portable del mismo programa sin instalador.
- `Cima-1.0.0-Setup.exe.blockmap`: metadatos del empaquetador; no se necesitan para instalar manualmente.

Los números de versión cambian con la versión del paquete. `npm run desktop:prepare` prepara los recursos sin producir por sí solo el instalador. `npm run dist:win:zip` genera únicamente el ZIP. La configuración incluye el logo y el icono de Cima y omite la firma digital. El paso `afterPack` comprueba que el paquete contenga ASAR, backend, migración, cliente Prisma, motor Windows y dependencias locales antes de generar los artefactos.

En GitHub Actions, el flujo `.github/workflows/windows-installer.yml` compila el instalador en un runner Windows y sube `Cima-*.exe` como artefacto. Esto evita depender de un entorno local con Wine ni de herramientas de desarrollo. La generación del `.exe` no sustituye la validación de instalación y primer uso en Windows real; consulta también [docs/ESTADO_PROYECTO.md](docs/ESTADO_PROYECTO.md).
