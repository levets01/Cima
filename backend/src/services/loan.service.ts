import { Prisma, Modality as PrismaModality, LoanStatus as PrismaLoanStatus } from '@prisma/client';
import prisma from '@/config/prisma';
import {
  CustomerLoan,
  Payment,
  Period,
  BusinessConfig,
  DEFAULT_CONFIG,
  computeLoanStatus,
  computePeriodStatus,
  computeCapitalPending,
  computeNextDueDate,
  addMonths,
  endOfMonth,
  Modality,
  LoanStatus,
  PeriodStatus,
} from '@/types';

function toModality(modality: PrismaModality): Modality {
  return modality === 'Quincenal' ? 'Quincenal' : 'Mensual';
}

function toPrismaModality(modality: Modality): PrismaModality {
  return modality === 'Quincenal' ? 'Quincenal' : 'Mensual';
}

function toLoanStatus(status: PrismaLoanStatus): LoanStatus {
  const map: Record<PrismaLoanStatus, LoanStatus> = {
    Activo: 'Activo',
    EnSeguimiento: 'En seguimiento',
    FaltaFecha: 'Falta fecha',
    CapitalPagado: 'Capital pagado',
  };
  return map[status];
}

function toPrismaLoanStatus(status: LoanStatus): PrismaLoanStatus {
  const map: Record<LoanStatus, PrismaLoanStatus> = {
    'Activo': 'Activo',
    'En seguimiento': 'EnSeguimiento',
    'Falta fecha': 'FaltaFecha',
    'Capital pagado': 'CapitalPagado',
  };
  return map[status];
}

function toPeriodStatus(status: string): PeriodStatus {
  const map: Record<string, PeriodStatus> = {
    'PorPagar': 'Por pagar',
    'PendienteVencido': 'Pendiente vencido',
    'ReditoPagado': 'Rédito pagado',
    'CapitalPagado': 'Capital pagado',
  };
  return map[status] ?? 'Por pagar';
}

function mapLoanToFrontend(loan: any): CustomerLoan {
  return {
    id: loan.id,
    customerName: loan.customerName,
    loanDate: loan.loanDate.toISOString(),
    principal: Number(loan.principal),
    modality: toModality(loan.modality),
    ratePerPeriod: Number(loan.ratePerPeriod),
    interestPerPeriod: Number(loan.interestPerPeriod),
    firstInterestPaymentDate: loan.firstInterestPaymentDate ? loan.firstInterestPaymentDate.toISOString() : null,
    capitalPaid: Number(loan.capitalPaid),
    capitalPending: Number(loan.capitalPending),
    interestReceived: Number(loan.interestReceived),
    status: toLoanStatus(loan.status),
    nextCollection: loan.nextCollection ? loan.nextCollection.toISOString() : null,
    interestOverdue: Number(loan.interestOverdue),
    daysOverdue: loan.daysOverdue,
  };
}

function mapPeriodToFrontend(period: any): Period {
  return {
    id: period.id,
    loanId: period.loanId,
    customerName: period.customerName,
    periodNumber: period.periodNumber,
    dueDate: period.dueDate ? period.dueDate.toISOString() : null,
    modality: toModality(period.modality),
    capitalPendingEstimated: Number(period.capitalPendingEstimated),
    interestGenerated: Number(period.interestGenerated),
    interestPaid: Number(period.interestPaid),
    interestPending: Number(period.interestPending),
    status: toPeriodStatus(period.status),
  };
}

export function generatePeriodsForLoan(
  loan: Omit<CustomerLoan, 'id'> & { id?: number },
  existingPayments: Payment[] = [],
  startPeriodId: number = 1
): Omit<Period, 'id'>[] {
  const config = DEFAULT_CONFIG;
  const rate = loan.ratePerPeriod;
  const firstDue = loan.firstInterestPaymentDate ? new Date(loan.firstInterestPaymentDate) : null;
  const periods: Omit<Period, 'id'>[] = [];

  for (let n = 1; n <= config.periodsPerLoan; n++) {
    let previousDueDate: Date | null = null;
    if (n > 1 && periods[n - 2].dueDate) {
      previousDueDate = new Date(periods[n - 2].dueDate as string);
    }

    const dueDate = computeNextDueDate(previousDueDate, n, loan.modality, firstDue);
    const dueDateStr = dueDate ? dueDate.toISOString() : null;

    const capitalPaidUpToDate = existingPayments
      .filter((p) => p.loanId === (loan.id ?? 0) && p.type === 'Capital' && p.paymentDate <= (dueDateStr || ''))
      .reduce((sum, p) => sum + p.amount, 0);

    const capitalPendingEstimated = Math.max(0, loan.principal - capitalPaidUpToDate);
    const interestGenerated = capitalPendingEstimated * rate;

    const interestPaid = existingPayments
      .filter((p) => p.loanId === (loan.id ?? 0) && p.type === 'Rédito' && p.periodNumber === n)
      .reduce((sum, p) => sum + p.amount, 0);

    const interestPending = Math.max(0, interestGenerated - interestPaid);
    const status = computePeriodStatus(capitalPendingEstimated, interestPending, dueDateStr);

    periods.push({
      loanId: loan.id ?? 0,
      customerName: loan.customerName,
      periodNumber: n,
      dueDate: dueDateStr,
      modality: loan.modality,
      capitalPendingEstimated,
      interestGenerated,
      interestPaid,
      interestPending,
      status,
    });
  }

  return periods;
}

export function recomputeLoanFromPayments(
  loan: CustomerLoan,
  payments: Payment[],
  allPeriods: Period[]
): CustomerLoan {
  const capitalPaid = payments
    .filter((p) => p.loanId === loan.id && p.type === 'Capital')
    .reduce((sum, p) => sum + p.amount, 0);

  const interestReceived = payments
    .filter((p) => p.loanId === loan.id && p.type === 'Rédito')
    .reduce((sum, p) => sum + p.amount, 0);

  const capitalPending = computeCapitalPending(loan.principal, capitalPaid);

  const loanPeriods = allPeriods.filter((p) => p.loanId === loan.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextCollection: string | null = null;
  let interestOverdue = 0;
  let daysOverdue = 0;

  for (const p of loanPeriods) {
    if (p.interestPending > 0 && p.dueDate) {
      const due = new Date(p.dueDate);
      due.setHours(0, 0, 0, 0);
      if (!nextCollection || due < new Date(nextCollection)) {
        nextCollection = p.dueDate;
      }
      if (due < today) {
        interestOverdue += p.interestPending;
        const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > daysOverdue) daysOverdue = diffDays;
      }
    }
  }

  const status = computeLoanStatus(
    loan.principal,
    capitalPaid,
    loan.firstInterestPaymentDate,
    daysOverdue
  );

  return {
    ...loan,
    capitalPaid,
    capitalPending,
    interestReceived,
    status,
    nextCollection,
    interestOverdue,
    daysOverdue,
  };
}

export class LoanService {
  static async getAll(): Promise<CustomerLoan[]> {
    const [loans, payments, periods] = await Promise.all([
      prisma.loan.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.payment.findMany(),
      prisma.period.findMany(),
    ]);

    const paymentsFrontend: Payment[] = payments.map((p) => ({
      id: p.id,
      loanId: p.loanId,
      paymentDate: p.paymentDate.toISOString(),
      amount: Number(p.amount),
      type: p.type === 'Redito' ? 'Rédito' : 'Capital',
      periodNumber: p.periodNumber ?? null,
      note: p.note ?? '',
      customerName: p.customerName,
      review: p.review,
    }));

    const periodsFrontend: Period[] = periods.map(mapPeriodToFrontend);

    const loansWithPayments = loans.map((l) => {
      const loanFrontend = mapLoanToFrontend(l);
      return recomputeLoanFromPayments(loanFrontend, paymentsFrontend, periodsFrontend);
    });

    return loansWithPayments;
  }

  static async getById(id: number): Promise<CustomerLoan | null> {
    const [loan, payments, periods] = await Promise.all([
      prisma.loan.findUnique({ where: { id } }),
      prisma.payment.findMany({ where: { loanId: id } }),
      prisma.period.findMany({ where: { loanId: id } }),
    ]);

    if (!loan) return null;

    const loanFrontend = mapLoanToFrontend(loan);
    const paymentsFrontend: Payment[] = payments.map((p) => ({
      id: p.id,
      loanId: p.loanId,
      paymentDate: p.paymentDate.toISOString(),
      amount: Number(p.amount),
      type: p.type === 'Redito' ? 'Rédito' : 'Capital',
      periodNumber: p.periodNumber ?? null,
      note: p.note ?? '',
      customerName: p.customerName,
      review: p.review,
    }));
    const periodsFrontend: Period[] = periods.map(mapPeriodToFrontend);

    return recomputeLoanFromPayments(loanFrontend, paymentsFrontend, periodsFrontend);
  }

  static async create(data: any, userId?: number): Promise<CustomerLoan> {
    const loan = await prisma.loan.create({
      data: {
        customerName: data.customerName,
        loanDate: new Date(data.loanDate),
        principal: data.principal,
        modality: toPrismaModality(data.modality),
        ratePerPeriod: data.ratePerPeriod,
        interestPerPeriod: data.interestPerPeriod,
        firstInterestPaymentDate: data.firstInterestPaymentDate ? new Date(data.firstInterestPaymentDate) : null,
        capitalPaid: data.capitalPaid ?? 0,
        capitalPending: data.capitalPending ?? 0,
        interestReceived: data.interestReceived ?? 0,
        status: toPrismaLoanStatus(data.status ?? 'Activo'),
        nextCollection: data.nextCollection ? new Date(data.nextCollection) : null,
        interestOverdue: data.interestOverdue ?? 0,
        daysOverdue: data.daysOverdue ?? 0,
        ...(userId ? { userId } : {}),
      },
    });

    const loanFrontend = mapLoanToFrontend(loan);
    const periods = generatePeriodsForLoan(loanFrontend);

    await prisma.period.createMany({
      data: periods.map((p) => ({
        loanId: p.loanId,
        customerName: p.customerName,
        periodNumber: p.periodNumber,
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
        modality: toPrismaModality(p.modality),
        capitalPendingEstimated: p.capitalPendingEstimated,
        interestGenerated: p.interestGenerated,
        interestPaid: p.interestPaid,
        interestPending: p.interestPending,
        status: p.status === 'Pendiente vencido' ? 'PendienteVencido'
          : p.status === 'Rédito pagado' ? 'ReditoPagado'
          : p.status === 'Capital pagado' ? 'CapitalPagado'
          : 'PorPagar',
      })),
    });

    return loanFrontend;
  }

  static async update(id: number, updates: Partial<any>, userId?: number): Promise<CustomerLoan | null> {
    const existing = await prisma.loan.findUnique({ where: { id } });
    if (!existing) return null;

    const data: any = {};
    if (updates.customerName !== undefined) data.customerName = updates.customerName;
    if (updates.loanDate !== undefined) data.loanDate = new Date(updates.loanDate);
    if (updates.principal !== undefined) data.principal = updates.principal;
    if (updates.modality !== undefined) data.modality = toPrismaModality(updates.modality);
    if (updates.ratePerPeriod !== undefined) data.ratePerPeriod = updates.ratePerPeriod;
    if (updates.interestPerPeriod !== undefined) data.interestPerPeriod = updates.interestPerPeriod;
    if (updates.firstInterestPaymentDate !== undefined) {
      data.firstInterestPaymentDate = updates.firstInterestPaymentDate ? new Date(updates.firstInterestPaymentDate) : null;
    }
    if (updates.capitalPaid !== undefined) data.capitalPaid = updates.capitalPaid;
    if (updates.capitalPending !== undefined) data.capitalPending = updates.capitalPending;
    if (updates.interestReceived !== undefined) data.interestReceived = updates.interestReceived;
    if (updates.status !== undefined) data.status = toPrismaLoanStatus(updates.status);
    if (updates.nextCollection !== undefined) {
      data.nextCollection = updates.nextCollection ? new Date(updates.nextCollection) : null;
    }
    if (updates.interestOverdue !== undefined) data.interestOverdue = updates.interestOverdue;
    if (updates.daysOverdue !== undefined) data.daysOverdue = updates.daysOverdue;

    const loan = await prisma.loan.update({ where: { id }, data });
    return mapLoanToFrontend(loan);
  }

  static async delete(id: number): Promise<boolean> {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) return false;
    await prisma.loan.delete({ where: { id } });
    return true;
  }
}

export class PeriodService {
  static async getAll(): Promise<Period[]> {
    const periods = await prisma.period.findMany({ orderBy: [{ loanId: 'asc' }, { periodNumber: 'asc' }] });
    return periods.map(mapPeriodToFrontend);
  }

  static async getByLoan(loanId: number): Promise<Period[]> {
    const periods = await prisma.period.findMany({
      where: { loanId },
      orderBy: { periodNumber: 'asc' },
    });
    return periods.map(mapPeriodToFrontend);
  }

  static async regenerateForLoan(loanId: number): Promise<Period[]> {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error('Préstamo no encontrado');

    await prisma.period.deleteMany({ where: { loanId } });

    const loanFrontend = mapLoanToFrontend(loan);
    const periods = generatePeriodsForLoan(loanFrontend);

    await prisma.period.createMany({
      data: periods.map((p) => ({
        loanId: p.loanId,
        customerName: p.customerName,
        periodNumber: p.periodNumber,
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
        modality: toPrismaModality(p.modality),
        capitalPendingEstimated: p.capitalPendingEstimated,
        interestGenerated: p.interestGenerated,
        interestPaid: p.interestPaid,
        interestPending: p.interestPending,
        status: p.status === 'Pendiente vencido' ? 'PendienteVencido'
          : p.status === 'Rédito pagado' ? 'ReditoPagado'
          : p.status === 'Capital pagado' ? 'CapitalPagado'
          : 'PorPagar',
      })),
    });

    return this.getByLoan(loanId);
  }
}
