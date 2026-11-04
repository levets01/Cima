import type {
  CustomerLoan,
  Payment,
  Period,
  BusinessConfig,
  SummaryIndicators,
  MonthlyMovement,
  PaymentType,
} from '@/types';
import {
  DEFAULT_CONFIG,
  computeCapitalPending,
  computeLoanStatus,
  computePeriodStatus,
  computeNextDueDate,
  addMonths,
} from '@/types';
import {
  getStoredData,
  setStoredData,
  getStoredObject,
  setStoredObject,
  STORAGE_KEYS,
} from './storage';

const NOW = new Date();
const toDateStr = (date: Date) => date.toISOString().split('T')[0];

let nextLoanId = 1;
let nextPaymentId = 1;
let nextPeriodId = 1;

const DEFAULT_LOANS: CustomerLoan[] = [
  {
    id: 1,
    customerName: 'Carlos Rodríguez',
    loanDate: toDateStr(addMonths(NOW, -4)),
    principal: 5000000,
    modality: 'Mensual',
    ratePerPeriod: 0.2,
    interestPerPeriod: 1000000,
    firstInterestPaymentDate: toDateStr(addMonths(NOW, -3)),
    capitalPaid: 1000000,
    capitalPending: 4000000,
    interestReceived: 3000000,
    status: 'Activo',
    nextCollection: toDateStr(addMonths(NOW, 1)),
    interestOverdue: 0,
    daysOverdue: 0,
  },
  {
    id: 2,
    customerName: 'María Gómez',
    loanDate: toDateStr(addMonths(NOW, -2)),
    principal: 3000000,
    modality: 'Quincenal',
    ratePerPeriod: 0.1,
    interestPerPeriod: 300000,
    firstInterestPaymentDate: toDateStr(addDays(NOW, -15)),
    capitalPaid: 500000,
    capitalPending: 2500000,
    interestReceived: 600000,
    status: 'En seguimiento',
    nextCollection: toDateStr(addDays(NOW, -5)),
    interestOverdue: 300000,
    daysOverdue: 5,
  },
  {
    id: 3,
    customerName: 'Luis Fernández',
    loanDate: toDateStr(addMonths(NOW, -6)),
    principal: 8000000,
    modality: 'Mensual',
    ratePerPeriod: 0.2,
    interestPerPeriod: 1600000,
    firstInterestPaymentDate: null,
    capitalPaid: 0,
    capitalPending: 8000000,
    interestReceived: 0,
    status: 'Falta fecha',
    nextCollection: null,
    interestOverdue: 0,
    daysOverdue: 0,
  },
];

const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: 1,
    loanId: 1,
    paymentDate: toDateStr(addDays(NOW, -45)),
    amount: 500000,
    type: 'Capital',
    periodNumber: null,
    note: 'Abono a capital',
    customerName: 'Carlos Rodríguez',
    review: 'OK',
  },
  {
    id: 2,
    loanId: 1,
    paymentDate: toDateStr(addDays(NOW, -30)),
    amount: 1000000,
    type: 'Rédito',
    periodNumber: 1,
    note: 'Rédito período 1',
    customerName: 'Carlos Rodríguez',
    review: 'OK',
  },
  {
    id: 3,
    loanId: 2,
    paymentDate: toDateStr(addDays(NOW, -20)),
    amount: 300000,
    type: 'Rédito',
    periodNumber: 1,
    note: 'Rédito quincenal 1',
    customerName: 'María Gómez',
    review: 'OK',
  },
  {
    id: 4,
    loanId: 2,
    paymentDate: toDateStr(addDays(NOW, -10)),
    amount: 500000,
    type: 'Capital',
    periodNumber: null,
    note: 'Abono capital',
    customerName: 'María Gómez',
    review: 'OK',
  },
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function generatePeriodsForLoan(loan: CustomerLoan): Period[] {
  const periods: Period[] = [];
  const rate = loan.ratePerPeriod;
  const firstDue = loan.firstInterestPaymentDate ? new Date(loan.firstInterestPaymentDate) : null;

  for (let n = 1; n <= DEFAULT_CONFIG.periodsPerLoan; n++) {
    const dueDate = computeNextDueDate(
      n > 1 ? new Date(periods[n - 2].dueDate!) : null,
      n,
      loan.modality,
      firstDue
    );

    const dueDateStr = dueDate ? toDateStr(dueDate) : null;

    const capitalPaidUpToDate = DEFAULT_PAYMENTS.filter(
      (p) => p.loanId === loan.id && p.type === 'Capital' && p.paymentDate <= (dueDateStr || '')
    ).reduce((sum, p) => sum + p.amount, 0);

    const capitalPendingEstimated = Math.max(0, loan.principal - capitalPaidUpToDate);
    const interestGenerated = capitalPendingEstimated * rate;

    const interestPaid = DEFAULT_PAYMENTS.filter(
      (p) => p.loanId === loan.id && p.type === 'Rédito' && p.periodNumber === n
    ).reduce((sum, p) => sum + p.amount, 0);

    const interestPending = Math.max(0, interestGenerated - interestPaid);
    const status = computePeriodStatus(capitalPendingEstimated, interestPending, dueDateStr);

    periods.push({
      id: nextPeriodId++,
      loanId: loan.id,
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

export class MockStorageService {
  static init(): void {
    if (getStoredData(STORAGE_KEYS.loans, []).length === 0) {
      setStoredData(STORAGE_KEYS.loans, DEFAULT_LOANS);
    }
    if (getStoredData(STORAGE_KEYS.payments, []).length === 0) {
      setStoredData(STORAGE_KEYS.payments, DEFAULT_PAYMENTS);
    }
    if (!getStoredObject(STORAGE_KEYS.config, DEFAULT_CONFIG)) {
      setStoredObject(STORAGE_KEYS.config, DEFAULT_CONFIG);
    }
    nextLoanId = DEFAULT_LOANS.length + 1;
    nextPaymentId = DEFAULT_PAYMENTS.length + 1;
    nextPeriodId = DEFAULT_LOANS.length * DEFAULT_CONFIG.periodsPerLoan + 1;
  }

  static getConfig(): BusinessConfig {
    return getStoredObject(STORAGE_KEYS.config, DEFAULT_CONFIG);
  }

  static updateConfig(updates: Partial<BusinessConfig>): BusinessConfig {
    const current = this.getConfig();
    const updated = { ...current, ...updates };
    setStoredObject(STORAGE_KEYS.config, updated);
    return updated;
  }

  static getLoans(): CustomerLoan[] {
    return getStoredData(STORAGE_KEYS.loans, []);
  }

  static getLoansWithPayments(payments: Payment[], periods: Period[]): CustomerLoan[] {
    const loans = this.getLoans();
    return loans.map((l) => recomputeLoanFromPayments(l, payments, periods));
  }

  static createLoan(loan: Omit<CustomerLoan, 'id'>): CustomerLoan {
    const loans = this.getLoans();
    const newLoan: CustomerLoan = {
      ...loan,
      id: nextLoanId++,
    };
    setStoredData(STORAGE_KEYS.loans, [...loans, newLoan]);
    return newLoan;
  }

  static updateLoan(id: number, updates: Partial<CustomerLoan>): CustomerLoan | null {
    const loans = this.getLoans();
    const idx = loans.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    loans[idx] = { ...loans[idx], ...updates };
    setStoredData(STORAGE_KEYS.loans, loans);
    return loans[idx];
  }

  static deleteLoan(id: number): boolean {
    const loans = this.getLoans();
    const filtered = loans.filter((l) => l.id !== id);
    if (filtered.length === loans.length) return false;
    setStoredData(STORAGE_KEYS.loans, filtered);
    return true;
  }

  static getPayments(): Payment[] {
    // Normaliza registros antiguos de localStorage que no traían 'review'.
    return getStoredData<Payment>(STORAGE_KEYS.payments, []).map((p) => ({ ...p, review: p.review ?? 'OK' }));
  }

  static getPaymentsByLoan(loanId: number): Payment[] {
    return this.getPayments().filter((p) => p.loanId === loanId);
  }

  static validatePayment(
    loanId: number,
    paymentDate: string,
    amount: number,
    type: PaymentType,
    periodNumber: number | null,
    loans: CustomerLoan[]
  ): string {
    if (!loanId || !paymentDate || !amount || !type) return '⚠ Datos incompletos';
    if (!loans.some((l) => l.id === loanId)) return '⚠ ID no existe';
    if (type === 'Rédito' && (!periodNumber || periodNumber <= 0))
      return '⚠ Falta N.º período';
    return 'OK';
  }

  static createPayment(
    payment: Omit<Payment, 'id' | 'customerName' | 'review'>,
    loans: CustomerLoan[]
  ): Payment {
    const loan = loans.find((l) => l.id === payment.loanId);
    const customerName = loan?.customerName || '';
    const review = this.validatePayment(
      payment.loanId,
      payment.paymentDate,
      payment.amount,
      payment.type,
      payment.periodNumber,
      loans
    );

    const newPayment: Payment = {
      ...payment,
      id: nextPaymentId++,
      customerName,
      review,
    };

    const payments = this.getPayments();
    setStoredData(STORAGE_KEYS.payments, [...payments, newPayment]);
    return newPayment;
  }

  static getPeriods(): Period[] {
    const loans = this.getLoans();
    const allPeriods: Period[] = [];
    for (const loan of loans) {
      allPeriods.push(...generatePeriodsForLoan(loan));
    }
    return allPeriods;
  }

  static getPeriodsByLoan(loanId: number): Period[] {
    return this.getPeriods().filter((p) => p.loanId === loanId);
  }

  static computeSummary(
    loans: CustomerLoan[],
    payments: Payment[],
    periods: Period[]
  ): SummaryIndicators {
    const totalLent = loans.reduce((sum, l) => sum + l.principal, 0);
    const capitalPending = loans.reduce((sum, l) => sum + l.capitalPending, 0);
    const capitalRecovered = totalLent - capitalPending;
    const capitalRecoveredPct = totalLent === 0 ? 0 : capitalRecovered / totalLent;
    const interestCollected = loans.reduce((sum, l) => sum + l.interestReceived, 0);
    const profitabilityPct = totalLent === 0 ? 0 : interestCollected / totalLent;
    const interestOverdueUncollected = loans.reduce((sum, l) => sum + l.interestOverdue, 0);
    const interestPendingCalendar = periods.reduce((sum, p) => sum + p.interestPending, 0);
    const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
    const activeLoans = loans.filter((l) => l.status === 'Activo').length;
    const loansInFollowUp = loans.filter((l) => l.status === 'En seguimiento').length;
    const capitalInFollowUp = loans
      .filter((l) => l.status === 'En seguimiento')
      .reduce((sum, l) => sum + l.capitalPending, 0);
    const loansMissingDate = loans.filter((l) => l.status === 'Falta fecha').length;
    const loansCapitalPaid = loans.filter((l) => l.status === 'Capital pagado').length;
    const paymentsToReview = payments.filter((p) => (p.review ?? '').startsWith('⚠')).length;

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

  static computeMonthlyMovement(
    loans: CustomerLoan[],
    payments: Payment[],
    year: number
  ): MonthlyMovement[] {
    const months: MonthlyMovement[] = [];
    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);

      const interestCollected = payments
        .filter((p) => p.type === 'Rédito') // B25:B36 - only Rédito type
        .filter((p) => {
          const d = new Date(p.paymentDate);
          return d >= start && d < end;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const capitalRecovered = payments
        .filter((p) => p.type === 'Capital')
        .filter((p) => {
          const d = new Date(p.paymentDate);
          return d >= start && d < end;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const capitalLent = loans
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

export default MockStorageService;
