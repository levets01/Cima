import { type SummaryIndicators, type MonthlyMovement, businessDate, roundMoney } from '../types';
import { HttpError } from '../middleware/error.middleware';
import { readLoanViews } from './loan.service';

export class ReportService {
  static async getSummary(): Promise<SummaryIndicators> {
    const views = await readLoanViews();
    const loans = views.map((view) => view.loan);
    const payments = views.flatMap((view) => view.payments);
    const periods = views.flatMap((view) => view.periods);
    const totalLent = roundMoney(loans.reduce((sum, loan) => sum + loan.principal, 0));
    const capitalPending = roundMoney(loans.reduce((sum, loan) => sum + loan.capitalPending, 0));
    const capitalRecovered = roundMoney(totalLent - capitalPending);
    const interestCollected = roundMoney(loans.reduce((sum, loan) => sum + loan.interestReceived, 0));
    return {
      totalLent, capitalPending, capitalRecovered,
      capitalRecoveredPct: totalLent === 0 ? 0 : capitalRecovered / totalLent,
      interestCollected, profitabilityPct: totalLent === 0 ? 0 : interestCollected / totalLent,
      interestOverdueUncollected: roundMoney(loans.reduce((sum, loan) => sum + loan.interestOverdue, 0)),
      interestPendingCalendar: roundMoney(periods.reduce((sum, period) => sum + period.interestPending, 0)),
      totalReceived: roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0)),
      activeLoans: loans.filter((loan) => loan.status === 'Activo').length,
      loansInFollowUp: loans.filter((loan) => loan.status === 'En seguimiento').length,
      capitalInFollowUp: roundMoney(loans.filter((loan) => loan.status === 'En seguimiento').reduce((sum, loan) => sum + loan.capitalPending, 0)),
      loansMissingDate: loans.filter((loan) => loan.status === 'Falta fecha').length,
      loansCapitalPaid: loans.filter((loan) => loan.status === 'Capital pagado').length,
      paymentsToReview: payments.filter((payment) => payment.review.startsWith('⚠')).length,
    };
  }

  static async getMonthlyMovement(year: number): Promise<MonthlyMovement[]> {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) throw new HttpError('Año inválido', 400);
    const views = await readLoanViews();
    const payments = views.flatMap((view) => view.payments);
    const loans = views.map((view) => view.loan);
    return Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, '0')}`;
      const monthlyPayments = payments.filter((payment) => businessDate(payment.paymentDate).startsWith(month));
      return {
        month: new Date(Date.UTC(year, index, 15)).toLocaleDateString('es-CO', { month: 'short', timeZone: 'UTC' }),
        interestCollected: roundMoney(monthlyPayments.filter((payment) => payment.type === 'Rédito').reduce((sum, payment) => sum + payment.amount, 0)),
        capitalRecovered: roundMoney(monthlyPayments.filter((payment) => payment.type === 'Capital').reduce((sum, payment) => sum + payment.amount, 0)),
        capitalLent: roundMoney(loans.filter((loan) => businessDate(loan.loanDate).startsWith(month)).reduce((sum, loan) => sum + loan.principal, 0)),
      };
    });
  }
}
