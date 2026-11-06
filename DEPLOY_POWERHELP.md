# Distribución local de Cima para Windows

La guía actual está en [README.md](README.md). La entrega prioritaria es una aplicación de escritorio con Electron y SQLite local.

Los archivos Windows finales se están regenerando tras corregir la inclusión de dependencias. El ejecutable Linux empaquetado ya pasó el recorrido completo de préstamos, pagos, copia y persistencia; los archivos Windows anteriores no están listos para entrega. Consulta el estado vigente en [docs/ESTADO_PROYECTO.md](docs/ESTADO_PROYECTO.md).

El flujo previsto es instalar Cima o extraer todo el ZIP, crear el acceso en el primer inicio y guardar copias desde Configuración. No requiere PostgreSQL, Docker ni un servidor externo. La prueba de instalación y ejecución en Windows real sigue pendiente.

Para desarrolladores: `npm run desktop` abre la aplicación desde el código; `npm run dist:win` genera el instalador y el ZIP en `release/`. Consulta los requisitos y rutas de datos en el README.

Las instrucciones antiguas de publicación web y PostgreSQL no corresponden a este modo de escritorio. Los criterios de aceptación y límites de la entrega están en [docs/ESTADO_PROYECTO.md](docs/ESTADO_PROYECTO.md).
