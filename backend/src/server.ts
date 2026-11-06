import { createApp } from './app';
import { config } from './config';
import prisma from './config/prisma';

const app = createApp();
let shuttingDown = false;

const server = app.listen(config.port, config.host, () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : config.port;
  console.log(`Cima API: http://${config.host}:${port}`);
  process.send?.({ type: 'ready', port });
});

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('disconnect', () => { if (config.desktopMode) void shutdown(); });
process.on('message', async (message: { type?: string; id?: number; destination?: string }) => {
  if (!config.desktopMode) return;
  if (message.type === 'shutdown') { void shutdown(); return; }
  if (message.type === 'backup' && message.destination && message.id !== undefined) {
    try {
      const { backupDesktopDatabase } = await import('./config/desktop-database.js');
      await backupDesktopDatabase(message.destination);
      process.send?.({ type: 'response', id: message.id, result: message.destination });
    } catch (error) {
      process.send?.({ type: 'response', id: message.id, error: error instanceof Error ? error.message : 'No se pudo crear la copia' });
    }
  }
});
process.on('uncaughtException', (error) => { console.error(error); process.exit(1); });
process.on('unhandledRejection', (error) => { console.error(error); process.exit(1); });

export default server;
