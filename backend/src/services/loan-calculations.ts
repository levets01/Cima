import {
  type CustomerLoan, type Payment, type Period, type BusinessConfig,
  DEFAULT_CONFIG, businessDate, computeLoanStatus, computeNextDueDate,
  computePeriodStatus, roundMoney,
} from '../types';

export function generatePeriodsForLoan(
  loan: Omit<CustomerLoan, 'id'> & { id?: number },
  existingPayments: Payment[] = [],
  config: BusinessConfig = DEFAULT_CONFIG,
  now: Date = new Date()
): Omit<Period, 'id'>[] {
  const payments = existingPayments.filter((payment) => payment.loanId === (loan.id ?? 0));
  const firstDue = loan.firstInterestPaymentDate ? new Date(loan.firstInterestPaymentDate) : null;
  const periods: Omit<Period, 'id'>[] = [];
  // Imported opening balances do not contain a period; distribute them oldest first.
  let historicalInterest = roundMoney(payments
    .filter((payment) => payment.type === 'Rédito' && payment.periodNumber === null)
    .reduce((total, payment) => total + payment.amount, 0));

  for (let number = 1; number <= config.periodsPerLoan; number++) {
    const previous = periods[number - 2]?.dueDate;
    const dueDate = computeNextDueDate(previous ? new Date(previous) : null, number, loan.modality, firstDue);
    const dueDateString = dueDate?.toISOString() ?? null;
    const capitalPaid = payments
      .filter((payment) => payment.type === 'Capital' && (dueDateString === null
        || businessDate(payment.paymentDate) <= businessDate(dueDateString)))
      .reduce((total, payment) => total + payment.amount, 0);
    const capitalPendingEstimated = roundMoney(Math.max(0, loan.principal - capitalPaid));
    const interestGenerated = roundMoney(capitalPendingEstimated * loan.ratePerPeriod);
    const assignedInterest = roundMoney(payments
      .filter((payment) => payment.type === 'Rédito' && payment.periodNumber === number)
      .reduce((total, payment) => total + payment.amount, 0));
    const historicalForPeriod = Math.min(historicalInterest, Math.max(0, interestGenerated - assignedInterest));
    historicalInterest = roundMoney(historicalInterest - historicalForPeriod);
    const interestPaid = roundMoney(assignedInterest + historicalForPeriod);
    const interestPending = roundMoney(Math.max(0, interestGenerated - interestPaid));
    periods.push({
      loanId: loan.id ?? 0, customerName: loan.customerName, periodNumber: number,
      dueDate: dueDateString, modality: loan.modality, capitalPendingEstimated,
      interestGenerated, interestPaid, interestPending,
      status: computePeriodStatus(capitalPendingEstimated, interestPending, dueDateString, now),
    });
  }
  return periods;
}

export function recomputeLoanFromPayments(
  loan: CustomerLoan,
  payments: Payment[],
  allPeriods: Omit<Period, 'id'>[],
  now: Date = new Date()
): CustomerLoan {
  const ownPayments = payments.filter((payment) => payment.loanId === loan.id);
  const capitalPaid = roundMoney(ownPayments.filter((payment) => payment.type === 'Capital')
    .reduce((total, payment) => total + payment.amount, 0));
  const interestReceived = roundMoney(ownPayments.filter((payment) => payment.type === 'Rédito')
    .reduce((total, payment) => total + payment.amount, 0));
  const today = businessDate(now);
  let nextCollection: string | null = null;
  let interestOverdue = 0;
  let daysOverdue = 0;
  for (const period of allPeriods.filter((period) => period.loanId === loan.id)) {
    if (period.interestPending <= 0 || !period.dueDate) continue;
    if (!nextCollection || period.dueDate < nextCollection) nextCollection = period.dueDate;
    const due = businessDate(period.dueDate);
    if (due < today) {
      interestOverdue += period.interestPending;
      daysOverdue = Math.max(daysOverdue, Math.round((Date.parse(today) - Date.parse(due)) / 86_400_000));
    }
  }
  return {
    ...loan, capitalPaid, interestReceived,
    capitalPending: roundMoney(Math.max(0, loan.principal - capitalPaid)),
    interestPerPeriod: roundMoney(loan.principal * loan.ratePerPeriod),
    status: computeLoanStatus(loan.principal, capitalPaid, loan.firstInterestPaymentDate, daysOverdue),
    nextCollection, interestOverdue: roundMoney(interestOverdue), daysOverdue,
  };
}
