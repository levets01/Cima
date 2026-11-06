import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorMiddleware = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', details: err.errors.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) });
    return;
  }
  const statusCode = err.statusCode ?? 500;
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor' : err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}
