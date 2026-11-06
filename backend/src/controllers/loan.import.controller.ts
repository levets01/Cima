import { Response } from 'express';
import { LoanService } from '../services/loan.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class LoanImportController {
  static async import(req: AuthRequest, res: Response): Promise<void> {
    const { loans } = req.body;
    if (!Array.isArray(loans) || loans.length === 0) {
      res.status(400).json({ error: 'Se requiere un array de préstamos' });
      return;
    }
    const created = await LoanService.createMany(loans, req.user?.id);
    res.status(201).json({ created: created.length, loans: created });
  }
}
