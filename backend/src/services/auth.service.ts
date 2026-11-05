import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/config/prisma';
import { config } from '@/config';
import { SessionUser, AuthResponse } from '@/types';

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export class AuthService {
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
