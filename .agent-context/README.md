# Contexto del proyecto para agentes

## Propósito
Este repositorio contiene la aplicación Cima, una app de escritorio local para gestión de préstamos y cartera con frontend React y backend Express ejecutado localmente.

## Nombre oficial y versión
- Nombre: Cima
- Versión del paquete: 1.0.0
- Producto: aplicación desktop local para Windows

## Arquitectura real del proyecto
- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Base de datos: SQLite local en la carpeta del usuario
- Empaquetado de escritorio: Electron + electron-builder
- Instalador Windows: NSIS/Electron Builder + Inno Setup como alternativa reproducible

## Repositorio y estructura relevante
- `package.json`: scripts principales del frontend y del empaquetado desktop
- `backend/package.json`: scripts del backend y Prisma
- `desktop/main.cjs`: ventana Electron, backend local, almacenamiento en %LOCALAPPDATA%\Cima
- `desktop/prepare.mjs`: preparación de recursos para packaging
- `desktop/after-pack.cjs`: validación de dependencias y recursos antes del artefacto
- `electron-builder.yml`: configuración de salida y instalador Windows
- `public/favicon.svg`: logo principal del proyecto
- `desktop/resources/`: iconos y art assets para Windows
- `.github/workflows/windows-installer.yml`: workflow para generar Setup.exe en GitHub Actions

## Reglas de negocio y entrega
- La aplicación debe funcionar sin Node.js instalado en el equipo final.
- La app debe arrancar el backend local por sí misma.
- Los datos deben vivir en `%LOCALAPPDATA%\Cima`, fuera de la instalación.
- El almacenamiento debe sobrevivir actualizaciones y reinstalaciones del producto.
- El backend debe quedar limitado a localhost (127.0.0.1) cuando no requiere acceso externo.
- El frontend no debe tener acceso directo a Node.js ni capacidades de ejecución del sistema.
- Debe evitarse la apertura duplicada de la app y conflictos de puerto.
- La ventana debe arrastrarse con seguridad: contextIsolation + preload + sin nodeIntegration.

## Identidad visual
- Nombre visible: Cima
- Logo de referencia: `public/favicon.svg`
- Iconos de Windows: `desktop/resources/icon.png` y `desktop/resources/icon.ico`
- El instalador debe usar el nombre y el icono de Cima, no inventar una marca distinta.

## Requerimientos de distribución Windows
- El usuario final debe instalar un único `Setup.exe`.
- El instalador debe incluir el frontend compilado, backend local, runtime y dependencias.
- Debe crear accesos directos en escritorio y menú Inicio.
- Debe abrir una ventana propia que muestre la app y arranque el backend automáticamente.
- Debe conservar los datos del usuario y no eliminar la base de datos al desinstalar.
- Debe usarse el modo local del usuario (current user / per-user install) salvo necesidad real de admin.

## Verificación y estado actual
- Se comprobó compilación del frontend y backend con las rutas de proyecto existentes.
- La validación final real en Windows no se ha ejecutado desde este entorno, así que no se puede afirmar que la instalación y ejecución en Windows real hayan sido verificadas completamente.
- La generación reproducible del artefacto Windows está preparada con workflow y scripts, pero la verificación del instalador en Windows real queda pendiente en un runner/maquina Windows real.

## Comandos principales
```bash
npm run build
npm --prefix backend run build
npm run dist:win
npm run dist:win:setup
npm run windows:installer
```

## No inventar ni improvisar
Cuando trabajes sobre este proyecto:
- Reutiliza el frontend y backend actuales.
- Mantén el nombre y la identidad visual reales del producto.
- No cambies el diseño ni la arquitectura general salvo que haya un bloqueo técnico real y documentado.
- Si se necesita un cambio de enfoque, explica por qué y documenta la consecuencia.
- No publiques Releases ni subas artefactos sin autorización del usuario.
