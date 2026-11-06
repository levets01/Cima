import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/prisma';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string };
}

/** A restored database may no longer contain the account which issued a token. */
async function currentUser(req: AuthRequest): Promise<AuthRequest['user']> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(header.slice(7), config.jwtSecret);
  } catch { return undefined; }
  if (typeof decoded === 'string' || !Number.isSafeInteger(decoded.id)
    || decoded.id <= 0 || typeof decoded.email !== 'string') return undefined;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id }, select: { id: true, email: true, name: true },
  });
  if (!user || user.email !== decoded.email) return undefined;
  return user;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return;
  }
  req.user = user;
  next();
};

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  req.user = await currentUser(req);
  next();
};
