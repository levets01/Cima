import dotenv from 'dotenv';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET ?? 'cambia_este_secreto_en_produccion';
if (process.env.NODE_ENV === 'production' && (jwtSecret === 'cambia_este_secreto_en_produccion' || jwtSecret.length < 32)) {
  throw new Error('Configura JWT_SECRET con al menos 32 caracteres antes de iniciar en producción.');
}

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  host: process.env.HOST ?? '127.0.0.1',
  desktopMode: process.env.CIMA_DESKTOP === 'true',
  desktopKey: process.env.CIMA_DESKTOP_KEY ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
};
