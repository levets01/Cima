import { positiveInteger } from './params';
import { Request, Response } from 'express';
import { LoanService } from '../services/loan.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class LoanController {
  static async list(req: AuthRequest, res: Response): Promise<void> {
    const loans = await LoanService.getAll();
    res.json(loans);
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const id = positiveInteger(req.params.id, 'ID');
    const loan = await LoanService.getById(id);
    if (!loan) {
      res.status(404).json({ error: 'Préstamo no encontrado' });
      return;
    }
    res.json(loan);
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    const loan = await LoanService.create(req.body, req.user?.id);
    res.status(201).json(loan);
  }

  static async update(req: Request, res: Response): Promise<void> {
    const id = positiveInteger(req.params.id, 'ID');
    const loan = await LoanService.update(id, req.body, (req as AuthRequest).user?.id);
    if (!loan) {
      res.status(404).json({ error: 'Préstamo no encontrado' });
      return;
    }
    res.json(loan);
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const id = positiveInteger(req.params.id, 'ID');
    const ok = await LoanService.delete(id);
    if (!ok) {
      res.status(404).json({ error: 'Préstamo no encontrado' });
      return;
    }
    res.status(204).send();
  }
}
