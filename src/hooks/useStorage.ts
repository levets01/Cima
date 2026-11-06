import { useState, useEffect, useCallback, useRef } from 'react';
import { apiJson } from '@/lib/api';
import { DEFAULT_CONFIG } from '@/types';
import type { CustomerLoan, Payment, Period, BusinessConfig, SummaryIndicators, MonthlyMovement } from '@/types';

const DATA_CHANGED = 'cima:data-changed';
const invalidate = () => window.dispatchEvent(new Event(DATA_CHANGED));

function useRemoteData<T>(path: string, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const refetch = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    try {
      const result = await apiJson<T>(path);
      if (request === latestRequest.current) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (cause) {
      if (request === latestRequest.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los datos.');
      throw cause;
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    const refresh = () => { void refetch().catch(() => {}); };
    refresh();
    window.addEventListener(DATA_CHANGED, refresh);
    return () => window.removeEventListener(DATA_CHANGED, refresh);
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useLoans() {
  const resource = useRemoteData<CustomerLoan[]>('/loans', []);
  const create = useCallback(async (loan: Partial<CustomerLoan>) => {
    const created = await apiJson<CustomerLoan>('/loans', { method: 'POST', body: JSON.stringify(loan) });
    invalidate();
    return created;
  }, []);
  const update = useCallback(async (id: number, updates: Partial<CustomerLoan>) => {
    const updated = await apiJson<CustomerLoan>(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    invalidate();
    return updated;
  }, []);
  const remove = useCallback(async (id: number) => {
    await apiJson<void>(`/loans/${id}`, { method: 'DELETE' });
    invalidate();
    return true;
  }, []);
  return { ...resource, create, update, remove };
}

export function usePayments() {
  const resource = useRemoteData<Payment[]>('/payments', []);
  const create = useCallback(async (payment: Omit<Payment, 'id' | 'customerName' | 'review'>) => {
    const created = await apiJson<Payment>('/payments', { method: 'POST', body: JSON.stringify(payment) });
    invalidate();
    return created;
  }, []);
  return { ...resource, create };
}

export function usePeriods() {
  const resource = useRemoteData<Period[]>('/periods', []);
  const getByLoan = useCallback((loanId: number) => apiJson<Period[]>(`/periods/loan/${loanId}`), []);
  const regenerate = useCallback(async (loanId: number) => {
    const periods = await apiJson<Period[]>(`/periods/loan/${loanId}/regenerate`, { method: 'POST' });
    invalidate();
    return periods;
  }, []);
  return { ...resource, getByLoan, regenerate };
}

export function useConfig() {
  const resource = useRemoteData<BusinessConfig>('/config', DEFAULT_CONFIG);
  const update = useCallback(async (updates: Partial<BusinessConfig>) => {
    const updated = await apiJson<BusinessConfig>('/config', { method: 'PATCH', body: JSON.stringify(updates) });
    invalidate();
    return updated;
  }, []);
  return { ...resource, update };
}

const EMPTY_SUMMARY: SummaryIndicators = {
  totalLent: 0, capitalPending: 0, capitalRecovered: 0, capitalRecoveredPct: 0,
  interestCollected: 0, profitabilityPct: 0, interestOverdueUncollected: 0,
  interestPendingCalendar: 0, totalReceived: 0, activeLoans: 0, loansInFollowUp: 0,
  capitalInFollowUp: 0, loansMissingDate: 0, loansCapitalPaid: 0, paymentsToReview: 0,
};

export function useSummary() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const summary = useRemoteData<SummaryIndicators>('/reports/summary', EMPTY_SUMMARY);
  const monthly = useRemoteData<MonthlyMovement[]>(`/reports/monthly-movement?year=${year}`, []);
  const refreshSummary = summary.refetch;
  const refreshMonthly = monthly.refetch;
  const refetch = useCallback(() => Promise.all([refreshSummary(), refreshMonthly()]), [refreshSummary, refreshMonthly]);
  return { data: summary.data, monthly: monthly.data, year, setYear, refetch,
    loading: summary.loading || monthly.loading, error: summary.error || monthly.error };
}
