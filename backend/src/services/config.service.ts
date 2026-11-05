import prisma from '@/config/prisma';
import { BusinessConfig, DEFAULT_CONFIG } from '@/types';

export class ConfigService {
  static async get(): Promise<BusinessConfig> {
    let config = await prisma.config.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.config.create({ data: DEFAULT_CONFIG });
    }
    return {
      quincenalRate: config.quincenalRate,
      monthlyRate: config.monthlyRate,
      periodsPerLoan: config.periodsPerLoan,
      maxLoans: config.maxLoans,
      maxPayments: config.maxPayments,
    };
  }

  static async update(updates: Partial<BusinessConfig>): Promise<BusinessConfig> {
    const current = await this.get();
    const updated = await prisma.config.update({
      where: { id: 1 },
      data: {
        ...(updates.quincenalRate !== undefined && { quincenalRate: updates.quincenalRate }),
        ...(updates.monthlyRate !== undefined && { monthlyRate: updates.monthlyRate }),
        ...(updates.periodsPerLoan !== undefined && { periodsPerLoan: updates.periodsPerLoan }),
        ...(updates.maxLoans !== undefined && { maxLoans: updates.maxLoans }),
        ...(updates.maxPayments !== undefined && { maxPayments: updates.maxPayments }),
      },
    });
    return {
      quincenalRate: updated.quincenalRate,
      monthlyRate: updated.monthlyRate,
      periodsPerLoan: updated.periodsPerLoan,
      maxLoans: updated.maxLoans,
      maxPayments: updated.maxPayments,
    };
  }
}
