# Requerimientos para mejoras del proyecto

## Funcionalidad requerida
- Instalar un único Setup.exe para Windows.
- Mostrar asistente tradicional español con bienvenida, carpeta, resumen e instalación.
- Crear acceso directo del programa en escritorio y Menú Inicio.
- Abrir la app sin que el usuario necesite Node.js, Git o comandos manuales.
- Mantener frontend y backend funcionando como antes.

## Arquitectura y runtime
- El backend debe iniciarse automáticamente desde la app.
- Debe escucharse solo en localhost.
- Debe gestionarse cierre limpio y evitar procesos huérfanos.
- Debe evitarse la ejecución duplicada de la app.
- Debe cumplirse aislamiento y seguridad de la ventana Electron.

## Identidad visual
- Usar `Cima` como nombre de la aplicación.
- Usar el logo oficial del proyecto para iconos de Windows, accesos directos y desinstalación.
- Generar `.ico` con varias resoluciones, incluyendo 256x256.
- Mantener un estilo visual consistente con el frontend actual.

## Distribución
- El cliente final debe recibir un único Setup.exe.
- Los datos del usuario deben quedar fuera de la instalación.
- El instalador debe conservar datos al actualizar y al reinstalar.
- La desinstalación debe aparecer en Configuración de Windows y no borrar datos del usuario silenciados.

## Verificación exigida
- Probar compilación del frontend y backend.
- Probar generación del artefacto Windows.
- Verificar en máquina Windows real la instalación y primer uso cuando sea posible.
- No afirmar que la instalación funciona en Windows si no se ha verificado en Windows real.

## Restricciones
- No publicar Releases sin autorización.
- No incluir credenciales ni secretos.
- No depender de servicios externos para uso normal.
- No requerir permisos de administrador si no son necesarios.
- No inventar logo, nombre o licencias.
