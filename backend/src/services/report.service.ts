import prisma from '@/config/prisma';
import {
  SummaryIndicators,
  MonthlyMovement,
  CustomerLoan,
  Payment,
  Period,
} from '@/types';

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

function mapPeriodToFrontend(period: any): Period {
  return {
    id: period.id,
    loanId: period.loanId,
    customerName: period.customerName,
    periodNumber: period.periodNumber,
    dueDate: period.dueDate ? period.dueDate.toISOString() : null,
    modality: period.modality === 'Quincenal' ? 'Quincenal' : 'Mensual',
    capitalPendingEstimated: Number(period.capitalPendingEstimated),
    interestGenerated: Number(period.interestGenerated),
    interestPaid: Number(period.interestPaid),
    interestPending: Number(period.interestPending),
    status: period.status === 'PendienteVencido' ? 'Pendiente vencido'
      : period.status === 'ReditoPagado' ? 'Rédito pagado'
      : period.status === 'CapitalPagado' ? 'Capital pagado'
      : 'Por pagar',
  };
}

function mapLoanToFrontend(loan: any): CustomerLoan {
  return {
    id: loan.id,
    customerName: loan.customerName,
    loanDate: loan.loanDate.toISOString(),
    principal: Number(loan.principal),
    modality: loan.modality === 'Quincenal' ? 'Quincenal' : 'Mensual',
    ratePerPeriod: Number(loan.ratePerPeriod),
    interestPerPeriod: Number(loan.interestPerPeriod),
    firstInterestPaymentDate: loan.firstInterestPaymentDate ? loan.firstInterestPaymentDate.toISOString() : null,
    capitalPaid: Number(loan.capitalPaid),
    capitalPending: Number(loan.capitalPending),
    interestReceived: Number(loan.interestReceived),
    status: loan.status === 'EnSeguimiento' ? 'En seguimiento'
      : loan.status === 'FaltaFecha' ? 'Falta fecha'
      : loan.status === 'CapitalPagado' ? 'Capital pagado'
      : 'Activo',
    nextCollection: loan.nextCollection ? loan.nextCollection.toISOString() : null,
    interestOverdue: Number(loan.interestOverdue),
    daysOverdue: loan.daysOverdue,
  };
}

export class ReportService {
  static async getSummary(): Promise<SummaryIndicators> {
    const [loans, payments, periods] = await Promise.all([
      prisma.loan.findMany(),
      prisma.payment.findMany(),
      prisma.period.findMany(),
    ]);

    const loansFrontend: CustomerLoan[] = loans.map(mapLoanToFrontend);
    const paymentsFrontend: Payment[] = payments.map(mapPaymentToFrontend);
    const periodsFrontend: Period[] = periods.map(mapPeriodToFrontend);

    const totalLent = loansFrontend.reduce((sum, l) => sum + l.principal, 0);
    const capitalPending = loansFrontend.reduce((sum, l) => sum + l.capitalPending, 0);
    const capitalRecovered = totalLent - capitalPending;
    const capitalRecoveredPct = totalLent === 0 ? 0 : capitalRecovered / totalLent;
    const interestCollected = loansFrontend.reduce((sum, l) => sum + l.interestReceived, 0);
    const profitabilityPct = totalLent === 0 ? 0 : interestCollected / totalLent;
    const interestOverdueUncollected = loansFrontend.reduce((sum, l) => sum + l.interestOverdue, 0);
    const interestPendingCalendar = periodsFrontend.reduce((sum, p) => sum + p.interestPending, 0);
    const totalReceived = paymentsFrontend.reduce((sum, p) => sum + p.amount, 0);
    const activeLoans = loansFrontend.filter((l) => l.status === 'Activo').length;
    const loansInFollowUp = loansFrontend.filter((l) => l.status === 'En seguimiento').length;
    const capitalInFollowUp = loansFrontend
      .filter((l) => l.status === 'En seguimiento')
      .reduce((sum, l) => sum + l.capitalPending, 0);
    const loansMissingDate = loansFrontend.filter((l) => l.status === 'Falta fecha').length;
    const loansCapitalPaid = loansFrontend.filter((l) => l.status === 'Capital pagado').length;
    const paymentsToReview = paymentsFrontend.filter((p) => (p.review ?? '').startsWith('⚠')).length;

    return {
      totalLent,
      capitalPending,
      capitalRecovered,
      capitalRecoveredPct,
      interestCollected,
      profitabilityPct,
      interestOverdueUncollected,
      interestPendingCalendar,
      totalReceived,
      activeLoans,
      loansInFollowUp,
      capitalInFollowUp,
      loansMissingDate,
      loansCapitalPaid,
      paymentsToReview,
    };
  }

  static async getMonthlyMovement(year: number): Promise<MonthlyMovement[]> {
    const [loans, payments] = await Promise.all([
      prisma.loan.findMany(),
      prisma.payment.findMany(),
    ]);

    const loansFrontend: CustomerLoan[] = loans.map(mapLoanToFrontend);
    const paymentsFrontend: Payment[] = payments.map(mapPaymentToFrontend);

    const months: MonthlyMovement[] = [];
    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);

      const interestCollected = paymentsFrontend
        .filter((p) => p.type === 'Rédito')
        .filter((p) => {
          const d = new Date(p.paymentDate);
          return d >= start && d < end;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const capitalRecovered = paymentsFrontend
        .filter((p) => p.type === 'Capital')
        .filter((p) => {
          const d = new Date(p.paymentDate);
          return d >= start && d < end;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const capitalLent = loansFrontend
        .filter((l) => {
          const d = new Date(l.loanDate);
          return d >= start && d < end;
        })
        .reduce((sum, l) => sum + l.principal, 0);

      months.push({
        month: start.toLocaleDateString('es-CO', { month: 'short' }),
        interestCollected,
        capitalRecovered,
        capitalLent,
      });
    }
    return months;
  }
}
