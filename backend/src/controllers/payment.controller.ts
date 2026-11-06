import { positiveInteger } from './params';
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class PaymentController {
  static async list(req: Request, res: Response): Promise<void> {
    const loanId = req.query.loanId !== undefined ? positiveInteger(req.query.loanId, 'ID del préstamo') : undefined;
    const payments = await PaymentService.getAll(loanId);
    res.json(payments);
  }

  static async getByLoan(req: Request, res: Response): Promise<void> {
    const loanId = positiveInteger(req.params.loanId, 'ID del préstamo');
    const payments = await PaymentService.getByLoan(loanId);
    res.json(payments);
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    const payment = await PaymentService.create(req.body, req.user?.id);
    res.status(201).json(payment);
  }
}
