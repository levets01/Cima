import { initializeDesktopDatabase } from './config/desktop-database';
import path from 'node:path';

async function start() {
  if (process.env.CIMA_DESKTOP !== 'true') throw new Error('Este punto de entrada es exclusivo de la aplicación de escritorio.');
  const migrations = process.env.CIMA_MIGRATIONS_DIR ?? path.resolve(__dirname, '../prisma/migrations');
  await initializeDesktopDatabase(migrations);
  await import('./server.js');
}

start().catch((error) => {
  console.error('No se pudo iniciar Cima:', error);
  process.send?.({ type: 'startup-error', error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
