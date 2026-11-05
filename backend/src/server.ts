import { createApp } from '@/app';
import { config } from '@/config';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${config.port}`);
  console.log(`📚 Documentación Swagger en http://localhost:${config.port}/api-docs`);
  console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Rechazo no controlado:', err);
  process.exit(1);
});

export default server;
