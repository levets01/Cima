import { Request, Response } from 'express';
import { PeriodService } from '@/services/loan.service';
import { AuthRequest } from '@/middleware/auth.middleware';

export class PeriodController {
  static async list(req: Request, res: Response): Promise<void> {
    const periods = await PeriodService.getAll();
    res.json(periods);
  }

  static async getByLoan(req: Request, res: Response): Promise<void> {
    const loanId = parseInt(req.params.loanId, 10);
    const periods = await PeriodService.getByLoan(loanId);
    res.json(periods);
  }

  static async regenerate(req: Request, res: Response): Promise<void> {
    const loanId = parseInt(req.params.loanId, 10);
    const periods = await PeriodService.regenerateForLoan(loanId);
    res.json(periods);
  }
}
