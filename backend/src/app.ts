import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import 'express-async-errors';
import { setupSwagger } from './config/swagger';
import { errorMiddleware } from './middleware/error.middleware';
import routes from './routes';
import { config } from './config';

export function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Cima-Desktop-Key'],
    })
  );

  app.use(helmet());

  if (config.desktopMode) {
    app.use((req, res, next) => {
      if (!config.desktopKey || req.get('X-Cima-Desktop-Key') !== config.desktopKey) {
        res.status(403).json({ error: 'Acceso exclusivo de la aplicación local' });
        return;
      }
      next();
    });
  }

  // Documentación Swagger
  setupSwagger(app);

  // API routes
  app.use('/api', routes);

  // Health check (bajo /api para consistencia)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 404 (debe ir después de todas las rutas definidas)
  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // Error handler (debe ir al final, después del 404)
  app.use(errorMiddleware);

  return app;
}
