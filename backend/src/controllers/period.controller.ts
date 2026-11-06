import { positiveInteger } from './params';
import { Request, Response } from 'express';
import { PeriodService } from '../services/loan.service';

export class PeriodController {
  static async list(req: Request, res: Response): Promise<void> {
    const periods = await PeriodService.getAll();
    res.json(periods);
  }

  static async getByLoan(req: Request, res: Response): Promise<void> {
    const loanId = positiveInteger(req.params.loanId, 'ID del préstamo');
    const periods = await PeriodService.getByLoan(loanId);
    res.json(periods);
  }

  static async regenerate(req: Request, res: Response): Promise<void> {
    const loanId = positiveInteger(req.params.loanId, 'ID del préstamo');
    const periods = await PeriodService.regenerateForLoan(loanId);
    res.json(periods);
  }
}
