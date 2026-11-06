import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  static async setupStatus(_req: Request, res: Response): Promise<void> {
    res.json(await AuthService.setupStatus());
  }

  static async setup(req: Request, res: Response): Promise<void> {
    res.status(201).json(await AuthService.setup(req.body));
  }

  static async login(req: Request, res: Response): Promise<void> {
    const { email, password, remember } = req.body;
    const result = await AuthService.login({ email, password, remember });

    if (!result) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    res.json({ token: result.token, user: result.user });
  }

  static async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    res.json({ user: { email: req.user.email, name: req.user.name } });
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    res.json({ message: 'Sesión cerrada' });
  }
}
