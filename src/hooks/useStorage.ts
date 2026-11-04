import { useState, useEffect, useCallback } from 'react';
import MockStorageService from '@/services/mock/data';
import type {
  CustomerLoan,
  Payment,
  Period,
  BusinessConfig,
  SummaryIndicators,
  MonthlyMovement,
} from '@/types';

export function useLoans() {
  const [loans, setLoans] = useState<CustomerLoan[]>([]);

  useEffect(() => {
    MockStorageService.init();
    const p = MockStorageService.getPayments();
    const pe = MockStorageService.getPeriods();
    setLoans(MockStorageService.getLoansWithPayments(p, pe));
  }, []);

  const refetch = useCallback(() => {
    const p = MockStorageService.getPayments();
    const pe = MockStorageService.getPeriods();
    setLoans(MockStorageService.getLoansWithPayments(p, pe));
  }, []);

  const create = useCallback((loan: Omit<CustomerLoan, 'id'>) => {
    const created = MockStorageService.createLoan(loan);
    refetch();
    return created;
  }, [refetch]);

  const update = useCallback((id: number, updates: Partial<CustomerLoan>) => {
    const updated = MockStorageService.updateLoan(id, updates);
    if (updated) refetch();
    return updated;
  }, [refetch]);

  const remove = useCallback((id: number) => {
    const ok = MockStorageService.deleteLoan(id);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  return {
    data: loans,
    create,
    update,
    remove,
    refetch,
  };
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    setPayments(MockStorageService.getPayments());
  }, []);

  const refetch = useCallback(() => {
    setPayments(MockStorageService.getPayments());
  }, []);

  const create = useCallback(
    (payment: Omit<Payment, 'id' | 'customerName' | 'review'>) => {
      const currentLoans = MockStorageService.getLoans();
      const created = MockStorageService.createPayment(payment, currentLoans);
      refetch();
      return created;
    },
    [refetch]
  );

  return {
    data: payments,
    create,
    refetch,
  };
}

export function usePeriods() {
  const [periods, setPeriods] = useState<Period[]>([]);

  useEffect(() => {
    setPeriods(MockStorageService.getPeriods());
  }, []);

  const refetch = useCallback(() => {
    setPeriods(MockStorageService.getPeriods());
  }, []);

  const getByLoan = useCallback((loanId: number) => {
    return MockStorageService.getPeriodsByLoan(loanId);
  }, []);

  return {
    data: periods,
    getByLoan,
    refetch,
  };
}

export function useConfig() {
  const [config, setConfig] = useState<BusinessConfig>(MockStorageService.getConfig());

  const update = useCallback((updates: Partial<BusinessConfig>) => {
    const updated = MockStorageService.updateConfig(updates);
    setConfig(updated);
    return updated;
  }, []);

  return { data: config, update };
}

export function useSummary() {
  const [summary, setSummary] = useState<SummaryIndicators>({
    totalLent: 0,
    capitalPending: 0,
    capitalRecovered: 0,
    capitalRecoveredPct: 0,
    interestCollected: 0,
    profitabilityPct: 0,
    interestOverdueUncollected: 0,
    interestPendingCalendar: 0,
    totalReceived: 0,
    activeLoans: 0,
    loansInFollowUp: 0,
    capitalInFollowUp: 0,
    loansMissingDate: 0,
    loansCapitalPaid: 0,
    paymentsToReview: 0,
  });

  const [monthly, setMonthly] = useState<MonthlyMovement[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const refetch = useCallback(() => {
    const loans = MockStorageService.getLoansWithPayments(
      MockStorageService.getPayments(),
      MockStorageService.getPeriods()
    );
    const payments = MockStorageService.getPayments();
    const periods = MockStorageService.getPeriods();

    setSummary(MockStorageService.computeSummary(loans, payments, periods));
    setMonthly(MockStorageService.computeMonthlyMovement(loans, payments, year));
  }, [year]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    data: summary,
    monthly,
    year,
    setYear,
    refetch,
  };
}

export type { CustomerLoan, Payment, Period, BusinessConfig, SummaryIndicators, MonthlyMovement };
export { MockStorageService };
