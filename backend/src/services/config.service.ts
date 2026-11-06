import { type BusinessConfig, getRateForModality, roundMoney } from '../types';
import { HttpError } from '../middleware/error.middleware';
import { configSchema } from '../validators';
import { readBusinessConfig, refreshLoan } from './loan.service';
import { inTransaction } from './transaction';

export class ConfigService {
  static async get(): Promise<BusinessConfig> {
    return readBusinessConfig();
  }

  static async update(input: Partial<BusinessConfig>): Promise<BusinessConfig> {
    const updates = configSchema.parse(input);
    return inTransaction(async (db) => {
      const current = await readBusinessConfig(db);
      const next = { ...current, ...updates };
      const [loanCount, paymentCount, lastPaidPeriod] = await Promise.all([
        db.loan.count(), db.payment.count(), db.payment.aggregate({ _max: { periodNumber: true } }),
      ]);
      if (next.maxLoans < loanCount) throw new HttpError('El límite no puede ser menor al número actual de préstamos', 400);
      if (next.maxPayments < paymentCount) throw new HttpError('El límite no puede ser menor al número actual de pagos', 400);
      if (next.periodsPerLoan < (lastPaidPeriod._max.periodNumber ?? 0)) {
        throw new HttpError('No se pueden quitar períodos que ya tienen pagos registrados', 400);
      }
      await db.config.update({ where: { id: 1 }, data: updates });
      if (updates.monthlyRate !== undefined || updates.quincenalRate !== undefined || updates.periodsPerLoan !== undefined) {
        const loans = await db.loan.findMany();
        for (const loan of loans) {
          const rateChanged = loan.modality === 'Mensual' ? updates.monthlyRate !== undefined : updates.quincenalRate !== undefined;
          const rate = rateChanged ? getRateForModality(loan.modality, next) : loan.ratePerPeriod;
          await db.loan.update({ where: { id: loan.id }, data: {
            ratePerPeriod: rate, interestPerPeriod: roundMoney(loan.principal * rate),
          } });
          await refreshLoan(db, loan.id, next);
        }
      }
      return next;
    });
  }
}
