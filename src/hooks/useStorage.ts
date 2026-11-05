import { useState, useEffect, useCallback } from 'react';
import {
  apiJson,
  apiRequest,
} from '@/lib/api';
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

  const refetch = useCallback(async () => {
    const data = await apiJson<CustomerLoan[]>('/loans');
    setLoans(data);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(async (loan: Omit<CustomerLoan, 'id'>) => {
    const created = await apiJson<CustomerLoan>('/loans', {
      method: 'POST',
      body: JSON.stringify(loan),
    });
    await refetch();
    return created;
  }, [refetch]);

  const update = useCallback(async (id: number, updates: Partial<CustomerLoan>) => {
    const updated = await apiJson<CustomerLoan>(`/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    await refetch();
    return updated;
  }, [refetch]);

  const remove = useCallback(async (id: number) => {
    await apiRequest(`/loans/${id}`, { method: 'DELETE' });
    await refetch();
    return true;
  }, [refetch]);

  return { data: loans, create, update, remove, refetch };
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);

  const refetch = useCallback(async () => {
    const data = await apiJson<Payment[]>('/payments');
    setPayments(data);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (payment: Omit<Payment, 'id' | 'customerName' | 'review'>) => {
      const created = await apiJson<Payment>('/payments', {
        method: 'POST',
        body: JSON.stringify(payment),
      });
      await refetch();
      return created;
    },
    [refetch]
  );

  return { data: payments, create, refetch };
}

export function usePeriods() {
  const [periods, setPeriods] = useState<Period[]>([]);

  const refetch = useCallback(async () => {
    const data = await apiJson<Period[]>('/periods');
    setPeriods(data);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const getByLoan = useCallback(async (loanId: number) => {
    return apiJson<Period[]>(`/periods/loan/${loanId}`);
  }, []);

  const regenerate = useCallback(async (loanId: number) => {
    return apiJson<Period[]>(`/periods/loan/${loanId}/regenerate`, {
      method: 'POST',
    });
  }, []);

  return { data: periods, getByLoan, regenerate, refetch };
}

export function useConfig() {
  const [config, setConfig] = useState<BusinessConfig>({
    quincenalRate: 0.1,
    monthlyRate: 0.2,
    periodsPerLoan: 36,
    maxLoans: 200,
    maxPayments: 2000,
  });

  const refetch = useCallback(async () => {
    const data = await apiJson<BusinessConfig>('/config');
    setConfig(data);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const update = useCallback(async (updates: Partial<BusinessConfig>) => {
    const updated = await apiJson<BusinessConfig>('/config', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setConfig(updated);
    return updated;
  }, []);

  return { data: config, update, refetch };
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

  const refetch = useCallback(async () => {
    const [s, m] = await Promise.all([
      apiJson<SummaryIndicators>('/reports/summary'),
      apiJson<MonthlyMovement[]>(`/reports/monthly-movement?year=${year}`),
    ]);
    setSummary(s);
    setMonthly(m);
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
