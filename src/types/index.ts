export type Currency = 'COP';

export type LoanStatus = 'Activo' | 'En seguimiento' | 'Falta fecha' | 'Capital pagado';
export type PeriodStatus = 'Por pagar' | 'Pendiente vencido' | 'Rédito pagado' | 'Capital pagado';
export type PaymentType = 'Capital' | 'Rédito';
export type Modality = 'Mensual' | 'Quincenal';

export interface CustomerLoan {
  id: number;
  customerName: string;
  loanDate: string;
  principal: number;
  modality: Modality;
  ratePerPeriod: number;
  interestPerPeriod: number;
  firstInterestPaymentDate: string | null;
  capitalPaid: number;
  capitalPending: number;
  interestReceived: number;
  status: LoanStatus;
  nextCollection: string | null;
  interestOverdue: number;
  daysOverdue: number;
}

export interface Payment {
  id: number;
  loanId: number;
  paymentDate: string;
  amount: number;
  type: PaymentType;
  periodNumber: number | null;
  note: string;
  customerName: string;
  review: string;
}

export interface Period {
  id: number;
  loanId: number;
  customerName: string;
  periodNumber: number;
  dueDate: string | null;
  modality: Modality;
  capitalPendingEstimated: number;
  interestGenerated: number;
  interestPaid: number;
  interestPending: number;
  status: PeriodStatus;
}

export interface BusinessConfig {
  quincenalRate: number;
  monthlyRate: number;
  periodsPerLoan: number;
  maxLoans: number;
  maxPayments: number;
}

export interface SummaryIndicators {
  totalLent: number;
  capitalPending: number;
  capitalRecovered: number;
  capitalRecoveredPct: number;
  interestCollected: number;
  profitabilityPct: number;
  interestOverdueUncollected: number;
  interestPendingCalendar: number;
  totalReceived: number;
  activeLoans: number;
  loansInFollowUp: number;
  capitalInFollowUp: number;
  loansMissingDate: number;
  loansCapitalPaid: number;
  paymentsToReview: number;
}

export interface MonthlyMovement {
  month: string;
  interestCollected: number;
  capitalRecovered: number;
  capitalLent: number;
}

export const CURRENCY_SYMBOL = '$';
export const LOCALE = 'es-CO';
export const DEFAULT_CONFIG: BusinessConfig = {
  quincenalRate: 0.1,
  monthlyRate: 0.2,
  periodsPerLoan: 36,
  maxLoans: 200,
  maxPayments: 2000,
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Número del préstamo para mostrar: los ids antiguos como "loan_001" se ven como "N.º 1". */
export function formatLoanNumber(id: number | string): string {
  const n = String(id).replace(/^loan_0*/i, '') || String(id);
  return `N.º ${n}`;
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  });
}

/** Las fechas de préstamos y pagos son días del calendario, sin hora. */
export function toDateInput(value: string | null): string {
  return value?.slice(0, 10) ?? '';
}

export function dateInputToISO(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Fecha inválida. Usa AAAA-MM-DD.');
  const iso = new Date(`${value}T00:00:00.000Z`).toISOString();
  if (iso.slice(0, 10) !== value) throw new Error('La fecha no existe en el calendario.');
  return iso;
}

export function todayDateInput(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getRateForModality(modality: Modality, config: BusinessConfig): number {
  return modality === 'Quincenal' ? config.quincenalRate : config.monthlyRate;
}

export function computeInterestPerPeriod(principal: number, modality: Modality, config: BusinessConfig): number {
  return principal * getRateForModality(modality, config);
}

export function computeCapitalPending(principal: number, capitalPaid: number): number {
  return Math.max(0, principal - capitalPaid);
}

export function computeLoanStatus(
  principal: number,
  capitalPaid: number,
  firstInterestPaymentDate: string | null,
  daysOverdue: number
): LoanStatus {
  if (capitalPaid >= principal) return 'Capital pagado';
  if (!firstInterestPaymentDate) return 'Falta fecha';
  if (daysOverdue > 0) return 'En seguimiento';
  return 'Activo';
}

export function computePeriodStatus(
  capitalPendingEstimated: number,
  interestPending: number,
  dueDate: string | null
): PeriodStatus {
  if (capitalPendingEstimated === 0) return 'Capital pagado';
  if (interestPending === 0) return 'Rédito pagado';
  if (dueDate && new Date(dueDate) < new Date()) return 'Pendiente vencido';
  return 'Por pagar';
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function computeNextDueDate(
  previousDueDate: Date | null,
  periodNumber: number,
  modality: Modality,
  firstDueDate: Date | null
): Date | null {
  if (!firstDueDate) return null;
  if (periodNumber === 1) return firstDueDate;

  if (modality === 'Mensual') {
    return addMonths(firstDueDate, periodNumber - 1);
  }

  // Quincenal: lógica del Excel
  // Si día del primer vencimiento <= 15, siguiente es fin de mes; si no, día 15 del mes siguiente
  const prev = previousDueDate || firstDueDate;
  if (prev.getUTCDate() <= 15) {
    return endOfMonth(prev);
  }
  const nextMonth = addMonths(prev, 1);
  return new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), 15));
}
