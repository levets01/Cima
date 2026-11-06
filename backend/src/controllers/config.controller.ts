import { Response } from 'express';
import { ConfigService } from '../services/config.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class ConfigController {
  static async get(_req: AuthRequest, res: Response): Promise<void> {
    const config = await ConfigService.get();
    res.json(config);
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    const config = await ConfigService.update(req.body);
    res.json(config);
  }
}
