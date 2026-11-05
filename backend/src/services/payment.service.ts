import prisma from '@/config/prisma';
import {
  CustomerLoan,
  Payment,
  Period,
  PaymentType,
} from '@/types';
import {
  LoanService,
  PeriodService,
  recomputeLoanFromPayments,
} from '@/services/loan.service';
import {
  LoanStatus,
  computeLoanStatus,
  computeCapitalPending,
  DEFAULT_CONFIG,
} from '@/types';
import { HttpError } from '@/middleware/error.middleware';

function mapPaymentToFrontend(p: any): Payment {
  return {
    id: p.id,
    loanId: p.loanId,
    paymentDate: p.paymentDate.toISOString(),
    amount: Number(p.amount),
    type: p.type === 'Redito' ? 'Rédito' : 'Capital',
    periodNumber: p.periodNumber ?? null,
    note: p.note ?? '',
    customerName: p.customerName,
    review: p.review,
  };
}

function validatePayment(
  loanId: number,
  paymentDate: string,
  amount: number,
  type: PaymentType,
  periodNumber: number | null,
  loans: CustomerLoan[]
): string {
  if (!loanId || !paymentDate || !amount || !type) return '⚠ Datos incompletos';
  if (!loans.some((l: CustomerLoan) => l.id === loanId)) return '⚠ ID no existe';
  if (type === 'Rédito' && (!periodNumber || periodNumber <= 0))
    return '⚠ Falta N.º período';
  return 'OK';
}

export class PaymentService {
  static async getAll(loanId?: number): Promise<Payment[]> {
    const payments = await prisma.payment.findMany({
      where: loanId ? { loanId } : {},
      orderBy: { paymentDate: 'desc' },
    });
    return payments.map(mapPaymentToFrontend);
  }

  static async getByLoan(loanId: number): Promise<Payment[]> {
    return this.getAll(loanId);
  }

  static async create(data: any, userId?: number): Promise<Payment> {
    // Obtener préstamos para validación y recomputo
    const loans = await LoanService.getAll();
    const review = validatePayment(
      data.loanId,
      data.paymentDate,
      data.amount,
      data.type,
      data.periodNumber ?? null,
      loans
    );

    const loan = loans.find((l: CustomerLoan) => l.id === data.loanId);
    const customerName = loan?.customerName ?? '';

    const payment = await prisma.payment.create({
      data: {
        loanId: data.loanId,
        paymentDate: new Date(data.paymentDate),
        amount: data.amount,
        type: data.type === 'Rédito' ? 'Redito' : 'Capital',
        periodNumber: data.periodNumber ?? null,
        note: data.note ?? '',
        customerName,
        review,
        ...(userId ? { userId } : {}),
      },
    });

    // Recomputar el préstamo afectado y sus períodos
    const payments = await this.getAll(data.loanId);
    const periods = await PeriodService.getByLoan(data.loanId);
    const loanFrontend = loans.find((l: CustomerLoan) => l.id === data.loanId)!;
    const updatedLoan = recomputeLoanFromPayments(loanFrontend, payments, periods);

    await prisma.loan.update({
      where: { id: data.loanId },
      data: {
        capitalPaid: updatedLoan.capitalPaid,
        capitalPending: updatedLoan.capitalPending,
        interestReceived: updatedLoan.interestReceived,
        status: updatedLoan.status === 'Activo' ? 'Activo'
          : updatedLoan.status === 'En seguimiento' ? 'EnSeguimiento'
          : updatedLoan.status === 'Falta fecha' ? 'FaltaFecha'
          : 'CapitalPagado',
        nextCollection: updatedLoan.nextCollection ? new Date(updatedLoan.nextCollection) : null,
        interestOverdue: updatedLoan.interestOverdue,
        daysOverdue: updatedLoan.daysOverdue,
      },
    });

    // Regenerar períodos para reflejar nuevos pagos
    await PeriodService.regenerateForLoan(data.loanId);

    return mapPaymentToFrontend(payment);
  }
}
