import prisma from '../config/prisma';
import { type Payment, businessDate, roundMoney } from '../types';
import { HttpError } from '../middleware/error.middleware';
import { paymentSchema } from '../validators';
import { calculateLoanView, mapPaymentToFrontend, readBusinessConfig, refreshLoan, validateId } from './loan.service';
import { inTransaction } from './transaction';

export class PaymentService {
  static async getAll(loanId?: number): Promise<Payment[]> {
    if (loanId !== undefined) validateId(loanId);
    const payments = await prisma.payment.findMany({
      where: loanId !== undefined ? { loanId } : {}, orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
    });
    return payments.map(mapPaymentToFrontend);
  }

  static async getByLoan(loanId: number): Promise<Payment[]> {
    validateId(loanId);
    if (!await prisma.loan.findUnique({ where: { id: loanId } })) throw new HttpError('Préstamo no encontrado', 404);
    return this.getAll(loanId);
  }

  static async create(input: unknown, userId?: number): Promise<Payment> {
    const data = paymentSchema.parse(input);
    return inTransaction(async (db) => {
      const row = await db.loan.findUnique({ where: { id: data.loanId }, include: { payments: true, periods: true } });
      if (!row) throw new HttpError('Préstamo no encontrado', 404);
      const config = await readBusinessConfig(db);
      if (await db.payment.count() >= config.maxPayments) throw new HttpError('Se alcanzó el límite de pagos configurado', 400);
      const paymentDay = businessDate(data.paymentDate);
      if (paymentDay < businessDate(row.loanDate)) throw new HttpError('El pago no puede ser anterior al préstamo', 400);
      if (paymentDay > businessDate(new Date())) throw new HttpError('El pago no puede tener una fecha futura', 400);
      const { loan, periods } = calculateLoanView(row, config);
      const amount = roundMoney(data.amount);
      if (data.type === 'Capital' && amount > loan.capitalPending) {
        throw new HttpError('El abono supera el capital pendiente', 400);
      }
      if (data.type === 'Rédito') {
        const period = periods.find((period) => period.periodNumber === data.periodNumber);
        if (!period || !period.dueDate) throw new HttpError('El período de rédito no existe o no tiene fecha', 400);
        if (amount > period.interestPending) throw new HttpError('El pago supera el rédito pendiente del período', 400);
      }
      const payment = await db.payment.create({ data: {
        loanId: data.loanId, paymentDate: new Date(data.paymentDate), amount,
        type: data.type === 'Rédito' ? 'Redito' : 'Capital', periodNumber: data.type === 'Rédito' ? data.periodNumber : null,
        note: data.note ?? '', customerName: loan.customerName, review: 'OK', ...(userId ? { userId } : {}),
      } });
      await refreshLoan(db, data.loanId, config);
      return mapPaymentToFrontend(payment);
    });
  }
}
