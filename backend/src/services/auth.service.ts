import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { config } from '../config';
import { SessionUser, AuthResponse } from '../types';
import { HttpError } from '../middleware/error.middleware';
import { inTransaction } from './transaction';
import { z } from 'zod';

const setupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Escribe un correo válido'),
  name: z.string().trim().min(2, 'Escribe tu nombre').max(100),
  password: z.string().min(8, 'Usa al menos 8 caracteres').max(200),
});

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export class AuthService {
  static async setupStatus(): Promise<{ needsSetup: boolean }> {
    if (!config.desktopMode) throw new HttpError('Ruta no disponible', 404);
    return { needsSetup: await prisma.user.count() === 0 };
  }

  static async setup(input: unknown): Promise<AuthResponse> {
    if (!config.desktopMode) throw new HttpError('Ruta no disponible', 404);
    const data = setupSchema.parse(input);
    const hashedPassword = await bcrypt.hash(data.password, 12);
    await inTransaction(async (db) => {
      if (await db.user.count() > 0) throw new HttpError('El acceso local ya está configurado. Inicia sesión.', 409);
      await db.user.create({ data: { email: data.email, name: data.name, password: hashedPassword, role: 'ADMIN' } });
    });
    return (await AuthService.login(data))!;
  }

  static async login(input: LoginInput): Promise<AuthResponse | null> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!user) return null;

    const isValid = await bcrypt.compare(input.password, user.password);
    if (!isValid) return null;

    const sessionUser: SessionUser = {
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    return { user: sessionUser, token };
  }

  static async createUser(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name,
      },
    });
  }
}
