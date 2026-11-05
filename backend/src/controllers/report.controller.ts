import { Request, Response } from 'express';
import { ReportService } from '@/services/report.service';

export class ReportController {
  static async summary(_req: Request, res: Response): Promise<void> {
    const summary = await ReportService.getSummary();
    res.json(summary);
  }

  static async monthlyMovement(req: Request, res: Response): Promise<void> {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const movement = await ReportService.getMonthlyMovement(year);
    res.json(movement);
  }
}
