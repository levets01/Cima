import { positiveInteger } from './params';
import { HttpError } from '../middleware/error.middleware';
import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';

export class ReportController {
  static async summary(_req: Request, res: Response): Promise<void> {
    const summary = await ReportService.getSummary();
    res.json(summary);
  }

  static async monthlyMovement(req: Request, res: Response): Promise<void> {
    const year = req.query.year !== undefined ? positiveInteger(req.query.year, 'Año') : new Date().getFullYear();
    if (year < 1900 || year > 9999) throw new HttpError('El año debe estar entre 1900 y 9999', 400);
    const movement = await ReportService.getMonthlyMovement(year);
    res.json(movement);
  }
}
