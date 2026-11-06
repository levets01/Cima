import assert from 'node:assert/strict';
import test from 'node:test';
import { type CustomerLoan, type Payment, DEFAULT_CONFIG, computeNextDueDate, businessDate } from '../types';
import { dateSchema, loanSchema, loanImportSchema, paymentSchema } from '../validators';
import { generatePeriodsForLoan, recomputeLoanFromPayments } from './loan-calculations';

const iso = (value: string) => `${value}T12:00:00.000Z`;
const now = new Date(iso('2026-04-15'));
const config = { ...DEFAULT_CONFIG, periodsPerLoan: 4 };
const loan: CustomerLoan = {
  id: 1, customerName: 'Ana', loanDate: iso('2026-01-01'), principal: 1000,
  modality: 'Mensual', ratePerPeriod: 0.1, interestPerPeriod: 100,
  firstInterestPaymentDate: iso('2026-01-31'), capitalPaid: 0, capitalPending: 1000,
  interestReceived: 0, status: 'Activo', nextCollection: null, interestOverdue: 0, daysOverdue: 0,
};
const payment = (updates: Partial<Payment>): Payment => ({
  id: 1, loanId: 1, customerName: 'Ana', paymentDate: iso('2026-02-15'), amount: 500,
  type: 'Capital', periodNumber: null, note: '', review: 'OK', ...updates,
});

test('monthly dates clamp to February and return to the original day in March', () => {
  const dates = generatePeriodsForLoan(loan, [], config, now).map((period) => period.dueDate?.slice(0, 10));
  assert.deepEqual(dates, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  const leap = computeNextDueDate(null, 2, 'Mensual', new Date(iso('2024-01-31')));
  assert.equal(leap?.toISOString(), iso('2024-02-29'));
});

test('quincenal calendar alternates month end and the 15th without skipping February', () => {
  const periods = generatePeriodsForLoan({ ...loan, modality: 'Quincenal' }, [], config, now);
  assert.deepEqual(periods.map((period) => period.dueDate?.slice(0, 10)), [
    '2026-01-31', '2026-02-15', '2026-02-28', '2026-03-15',
  ]);
});

test('capital payments lower interest only on periods on or after their business date', () => {
  const payments = [payment({})];
  const periods = generatePeriodsForLoan(loan, payments, config, now);
  assert.deepEqual(periods.map((period) => period.interestGenerated), [100, 50, 50, 50]);
  const updated = recomputeLoanFromPayments(loan, payments, periods, now);
  assert.equal(updated.capitalPaid, 500);
  assert.equal(updated.capitalPending, 500);
  assert.equal(updated.interestOverdue, 200);
  assert.equal(updated.status, 'En seguimiento');
});

test('an interest payment closes its period and removes it from overdue balances', () => {
  const payments = [payment({}), payment({ id: 2, type: 'Rédito', amount: 100, periodNumber: 1 })];
  const periods = generatePeriodsForLoan(loan, payments, config, now);
  assert.equal(periods[0].interestPaid, 100);
  assert.equal(periods[0].interestPending, 0);
  assert.equal(periods[0].status, 'Rédito pagado');
  const updated = recomputeLoanFromPayments(loan, payments, periods, now);
  assert.equal(updated.interestReceived, 100);
  assert.equal(updated.interestOverdue, 100);
  assert.equal(updated.nextCollection, iso('2026-02-28'));
});

test('capital repayment ends future interest while preserving unpaid historical interest', () => {
  const payments = [payment({ amount: 1000 })];
  const periods = generatePeriodsForLoan(loan, payments, config, now);
  assert.deepEqual(periods.map((period) => period.interestGenerated), [100, 0, 0, 0]);
  const updated = recomputeLoanFromPayments(loan, payments, periods, now);
  assert.equal(updated.status, 'Capital pagado');
  assert.equal(updated.capitalPending, 0);
  assert.equal(updated.interestOverdue, 100);
});

test('imported historical interest is applied oldest first without being counted twice', () => {
  const payments = [payment({ amount: 100, type: 'Rédito', periodNumber: null }),
    payment({ id: 2, amount: 50, type: 'Rédito', periodNumber: 1 })];
  const periods = generatePeriodsForLoan(loan, payments, config, now);
  assert.deepEqual(periods.map((period) => period.interestPaid), [100, 50, 0, 0]);
  assert.equal(recomputeLoanFromPayments(loan, payments, periods, now).interestReceived, 150);
});

test('a payment made later on the due date applies to that day', () => {
  const periods = generatePeriodsForLoan(loan, [payment({ paymentDate: '2026-01-31T23:30:00-05:00' })], config, now);
  assert.equal(periods[0].interestGenerated, 50);
});

test('periods due today remain payable, and overdue begins the next Colombian day', () => {
  const dated = { ...loan, firstInterestPaymentDate: iso('2026-04-15') };
  assert.equal(generatePeriodsForLoan(dated, [], config, new Date('2026-04-16T04:59:00Z'))[0].status, 'Por pagar');
  assert.equal(generatePeriodsForLoan(dated, [], config, new Date('2026-04-16T05:01:00Z'))[0].status, 'Pendiente vencido');
});

test('undated loans preserve their balance and can be fully repaid', () => {
  const undated = { ...loan, firstInterestPaymentDate: null };
  assert.equal(generatePeriodsForLoan(undated, [], config, now)[0].dueDate, null);
  assert.equal(recomputeLoanFromPayments(undated, [], [], now).status, 'Falta fecha');
  const payments = [payment({ amount: 1000 })];
  const periods = generatePeriodsForLoan(undated, payments, config, now);
  assert.equal(periods[0].status, 'Capital pagado');
  assert.equal(recomputeLoanFromPayments(undated, payments, periods, now).status, 'Capital pagado');
});

test('the current configured period count is used', () => {
  assert.equal(generatePeriodsForLoan(loan, [], { ...config, periodsPerLoan: 7 }, now).length, 7);
});

test('form dates normalize without shifting the Colombian calendar date and invalid dates are rejected', () => {
  assert.equal(dateSchema.parse('2026-01-31'), iso('2026-01-31'));
  assert.equal(businessDate(dateSchema.parse('2026-01-31')), '2026-01-31');
  assert.equal(dateSchema.safeParse('2026-02-30').success, false);
  assert.equal(dateSchema.safeParse('2026-02-29').success, false);
  assert.equal(dateSchema.safeParse('2024-02-29').success, true);
});

test('loan validation rejects whitespace names, reversed dates, and excess capital balances', () => {
  assert.equal(loanSchema.safeParse({ ...loan, customerName: '   ' }).success, false);
  assert.equal(loanSchema.safeParse({ ...loan, firstInterestPaymentDate: '2025-12-31' }).success, false);
  assert.equal(loanSchema.safeParse({ ...loan, capitalPaid: 1001 }).success, false);
});

test('interest payments require a period and sub-cent payments cannot be recorded', () => {
  assert.equal(paymentSchema.safeParse(payment({ type: 'Rédito', periodNumber: null })).success, false);
  assert.equal(paymentSchema.safeParse(payment({ amount: 0.001 })).success, false);
  assert.equal(paymentSchema.safeParse(payment({ type: 'Capital', periodNumber: 1 })).success, false);
});

test('import validates every row and normalizes percentage rates', () => {
  const imported = loanImportSchema.parse({ loans: [{ ...loan, ratePerPeriod: 10, loanDate: '2026-01-01' }] });
  assert.equal(imported.loans[0].ratePerPeriod, 0.1);
  assert.equal(imported.loans[0].loanDate, iso('2026-01-01'));
  assert.equal(loanImportSchema.safeParse({ loans: [loan, { ...loan, loanDate: 'no-date' }] }).success, false);
});
