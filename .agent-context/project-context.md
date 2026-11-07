# Proyecto Cima — contexto técnico

## Resumen
Cima es una aplicación desktop de gestión de préstamos y cartera. Organiza clientes, préstamos, pagos de capital y rédito, vencimientos, indicadores, importación desde Excel/CSV y configuración local.

## Stack actual
- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Base: SQLite local (archivo de base de datos)
- Desktop: Electron + electron-builder
- Autenticación: sesión local con JWT generado en runtime local
- BD/ORM: Prisma + @prisma/client

## Ubicaciones clave
- Frontend raíz: `src/`
- Backend: `backend/src/`
- Base de datos Prisma: `backend/prisma/`
- Desktop package: `desktop/`
- Paquetes y artifacts: `release/`
- Configuración de empaquetado: `electron-builder.yml`

## Datos y persistencia
- Datos del usuario: `%LOCALAPPDATA%\Cima`
- Base: `%LOCALAPPDATA%\Cima\data\cima.db`
- Runtime: `%LOCALAPPDATA%\Cima\data\runtime.json`
- Logs: `%LOCALAPPDATA%\Cima\logs\backend.log`

## Reglas para futuras mejoras
1. Los datos no deben ir junto al ejecutable instalado.
2. La aplicación no debe depender de un servidor externo.
3. El backend debe iniciar solo desde la app desktop, sin abrir consola al usuario.
4. No se debe requerir Node.js ni terminal para el uso final.
5. La app debe mantener la misma UX visual del frontend actual.
6. Las credenciales y secretos deben quedar en el entorno local y no en el repositorio.
7. Si se requiere una herramienta adicional (por ejemplo, Inno Setup), debe quedar documentado el motivo y el flujo reproducible.

## Estado de la entrega
- El proyecto ya tiene un enfoque serio de desktop local para Windows.
- El empaquetado se prepara para distribuye con Electron y la salida de instalador.
- La validación real en Windows no está concluida en este entorno; cualquier mejora debe mantener ese criterio de evidencia.
