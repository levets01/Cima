import { Prisma, type Loan, type Payment as DbPayment, type Period as DbPeriod } from '@prisma/client';
import prisma from '../config/prisma';
import {
  type CustomerLoan, type Payment, type Period, type BusinessConfig, type LoanStatus,
  DEFAULT_CONFIG, getRateForModality, roundMoney,
} from '../types';
import { HttpError } from '../middleware/error.middleware';
import { loanSchema, loanUpdateSchema, loanImportSchema } from '../validators';
import { generatePeriodsForLoan, recomputeLoanFromPayments } from './loan-calculations';
import { inTransaction } from './transaction';
export { generatePeriodsForLoan, recomputeLoanFromPayments } from './loan-calculations';

type Database = Prisma.TransactionClient;
type LoanWithDetails = Loan & { payments: DbPayment[]; periods: DbPeriod[] };

export function toPrismaLoanStatus(status: LoanStatus) {
  return ({ Activo: 'Activo', 'En seguimiento': 'EnSeguimiento', 'Falta fecha': 'FaltaFecha', 'Capital pagado': 'CapitalPagado' } as const)[status];
}

export function mapPaymentToFrontend(payment: DbPayment): Payment {
  return {
    id: payment.id, loanId: payment.loanId, paymentDate: payment.paymentDate.toISOString(),
    amount: payment.amount, type: payment.type === 'Redito' ? 'Rédito' : 'Capital',
    periodNumber: payment.periodNumber, note: payment.note ?? '',
    customerName: payment.customerName, review: payment.review,
  };
}

function mapLoanToFrontend(loan: Loan): CustomerLoan {
  return {
    id: loan.id, customerName: loan.customerName, loanDate: loan.loanDate.toISOString(),
    principal: loan.principal, modality: loan.modality, ratePerPeriod: loan.ratePerPeriod,
    interestPerPeriod: loan.interestPerPeriod,
    firstInterestPaymentDate: loan.firstInterestPaymentDate?.toISOString() ?? null,
    capitalPaid: loan.capitalPaid, capitalPending: loan.capitalPending, interestReceived: loan.interestReceived,
    status: ({ Activo: 'Activo', EnSeguimiento: 'En seguimiento', FaltaFecha: 'Falta fecha', CapitalPagado: 'Capital pagado' } as const)[loan.status],
    nextCollection: loan.nextCollection?.toISOString() ?? null,
    interestOverdue: loan.interestOverdue, daysOverdue: loan.daysOverdue,
  };
}

export async function readBusinessConfig(db: Database = prisma): Promise<BusinessConfig> {
  const config = await db.config.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ...DEFAULT_CONFIG } });
  return {
    quincenalRate: config.quincenalRate, monthlyRate: config.monthlyRate,
    periodsPerLoan: config.periodsPerLoan, maxLoans: config.maxLoans, maxPayments: config.maxPayments,
  };
}

export function validateId(id: number): void {
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError('ID inválido', 400);
}

export function calculateLoanView(row: LoanWithDetails, config: BusinessConfig, now = new Date()) {
  const payments = row.payments.map(mapPaymentToFrontend);
  const source = mapLoanToFrontend(row);
  // Never shrink a historical schedule below a period which already has a recorded payment.
  const periodCount = Math.max(config.periodsPerLoan, ...payments.map((payment) => payment.periodNumber ?? 0));
  const generated = generatePeriodsForLoan(source, payments, { ...config, periodsPerLoan: periodCount }, now);
  const storedIds = new Map(row.periods.map((period) => [period.periodNumber, period.id]));
  const periods: Period[] = generated.map((period) => ({ ...period, id: storedIds.get(period.periodNumber) ?? 0 }));
  const loan = recomputeLoanFromPayments(source, payments, periods, now);
  return { loan, payments, periods };
}

export async function readLoanViews(db: Database = prisma) {
  const config = await readBusinessConfig(db);
  const rows = await db.loan.findMany({ include: { payments: true, periods: true }, orderBy: { id: 'asc' } });
  const now = new Date();
  return rows.map((row) => calculateLoanView(row, config, now));
}

/** Persist the schedule and totals together; callers must pass their transaction. */
export async function refreshLoan(db: Database, loanId: number, config?: BusinessConfig) {
  const row = await db.loan.findUnique({ where: { id: loanId }, include: { payments: true, periods: true } });
  if (!row) throw new HttpError('Préstamo no encontrado', 404);
  const view = calculateLoanView(row, config ?? await readBusinessConfig(db));
  await db.period.deleteMany({ where: { loanId } });
  await db.period.createMany({ data: view.periods.map(({ id: _id, ...period }) => ({
    ...period, dueDate: period.dueDate ? new Date(period.dueDate) : null,
    status: ({ 'Por pagar': 'PorPagar', 'Pendiente vencido': 'PendienteVencido', 'Rédito pagado': 'ReditoPagado', 'Capital pagado': 'CapitalPagado' } as const)[period.status],
  })) });
  const loan = view.loan;
  await db.loan.update({ where: { id: loanId }, data: {
    capitalPaid: loan.capitalPaid, capitalPending: loan.capitalPending, interestReceived: loan.interestReceived,
    interestPerPeriod: loan.interestPerPeriod, status: toPrismaLoanStatus(loan.status),
    nextCollection: loan.nextCollection ? new Date(loan.nextCollection) : null,
    interestOverdue: loan.interestOverdue, daysOverdue: loan.daysOverdue,
  } });
  const stored = await db.period.findMany({ where: { loanId }, orderBy: { periodNumber: 'asc' } });
  return { ...view, periods: view.periods.map((period, index) => ({ ...period, id: stored[index].id })) };
}

async function createLoan(db: Database, data: ReturnType<typeof loanSchema.parse>, userId?: number): Promise<CustomerLoan> {
  const config = await readBusinessConfig(db);
  if (await db.loan.count() >= config.maxLoans) throw new HttpError('Se alcanzó el límite de préstamos configurado', 400);
  const rate = data.ratePerPeriod ?? getRateForModality(data.modality, config);
  const loan = await db.loan.create({ data: {
    customerName: data.customerName, loanDate: new Date(data.loanDate), principal: roundMoney(data.principal),
    modality: data.modality, ratePerPeriod: rate, interestPerPeriod: roundMoney(data.principal * rate),
    firstInterestPaymentDate: data.firstInterestPaymentDate ? new Date(data.firstInterestPaymentDate) : null,
    capitalPending: roundMoney(data.principal), ...(userId ? { userId } : {}),
  } });

  const openingBalances: Prisma.PaymentCreateManyInput[] = [];
  if (data.capitalPaid > 0) openingBalances.push({
    loanId: loan.id, paymentDate: loan.loanDate, amount: roundMoney(data.capitalPaid), type: 'Capital',
    customerName: loan.customerName, note: 'Saldo inicial importado; fecha de referencia del préstamo',
    review: '⚠ Saldo inicial: verificar fecha del abono', ...(userId ? { userId } : {}),
  });
  if (data.interestReceived > 0) openingBalances.push({
    loanId: loan.id, paymentDate: loan.loanDate, amount: roundMoney(data.interestReceived), type: 'Redito',
    customerName: loan.customerName, note: 'Rédito histórico importado; aplicado a los primeros períodos pendientes',
    review: '⚠ Saldo inicial: verificar fecha y períodos', ...(userId ? { userId } : {}),
  });
  if (openingBalances.length) {
    if (await db.payment.count() + openingBalances.length > config.maxPayments) throw new HttpError('Se alcanzó el límite de pagos configurado', 400);
    await db.payment.createMany({ data: openingBalances });
  }
  return (await refreshLoan(db, loan.id, config)).loan;
}

export class LoanService {
  static async getAll(): Promise<CustomerLoan[]> {
    return (await readLoanViews()).map((view) => view.loan).reverse();
  }

  static async getById(id: number): Promise<CustomerLoan | null> {
    validateId(id);
    const row = await prisma.loan.findUnique({ where: { id }, include: { payments: true, periods: true } });
    return row ? calculateLoanView(row, await readBusinessConfig()).loan : null;
  }

  static async create(data: unknown, userId?: number): Promise<CustomerLoan> {
    const parsed = loanSchema.parse(data);
    return inTransaction((db) => createLoan(db, parsed, userId));
  }

  static async update(id: number, updates: unknown, _userId?: number): Promise<CustomerLoan | null> {
    validateId(id);
    const parsed = loanUpdateSchema.parse(updates);
    return inTransaction(async (db) => {
      const row = await db.loan.findUnique({ where: { id }, include: { payments: true } });
      if (!row) return null;
      const combined = loanSchema.parse({ ...mapLoanToFrontend(row), ...parsed, capitalPaid: 0, interestReceived: 0 });
      const totalCapitalPaid = roundMoney(row.payments.filter((payment) => payment.type === 'Capital')
        .reduce((total, payment) => total + payment.amount, 0));
      if (combined.principal < totalCapitalPaid) throw new HttpError('El principal no puede ser menor al capital ya pagado', 400);
      if (row.payments.some((payment) => payment.paymentDate < new Date(combined.loanDate))) {
        throw new HttpError('La fecha del préstamo no puede ser posterior a sus pagos', 400);
      }
      const config = await readBusinessConfig(db);
      const rate = parsed.ratePerPeriod ?? (parsed.modality ? getRateForModality(combined.modality, config) : row.ratePerPeriod);
      await db.loan.update({ where: { id }, data: {
        customerName: combined.customerName, loanDate: new Date(combined.loanDate), principal: roundMoney(combined.principal),
        modality: combined.modality, ratePerPeriod: rate, interestPerPeriod: roundMoney(combined.principal * rate),
        firstInterestPaymentDate: combined.firstInterestPaymentDate ? new Date(combined.firstInterestPaymentDate) : null,
      } });
      if (row.customerName !== combined.customerName) {
        await db.payment.updateMany({ where: { loanId: id }, data: { customerName: combined.customerName } });
      }
      return (await refreshLoan(db, id, config)).loan;
    });
  }

  static async delete(id: number): Promise<boolean> {
    validateId(id);
    return inTransaction(async (db) => {
      const removed = await db.loan.deleteMany({ where: { id } });
      return removed.count > 0;
    });
  }

  static async createMany(data: unknown[], userId?: number): Promise<CustomerLoan[]> {
    const parsed = loanImportSchema.parse({ loans: data });
    return inTransaction(async (db) => {
      const created: CustomerLoan[] = [];
      for (const loan of parsed.loans) created.push(await createLoan(db, loan, userId));
      return created;
    });
  }
}

export class PeriodService {
  static async getAll(): Promise<Period[]> {
    return (await readLoanViews()).flatMap((view) => view.periods);
  }

  static async getByLoan(loanId: number): Promise<Period[]> {
    validateId(loanId);
    const row = await prisma.loan.findUnique({ where: { id: loanId }, include: { payments: true, periods: true } });
    if (!row) throw new HttpError('Préstamo no encontrado', 404);
    return calculateLoanView(row, await readBusinessConfig()).periods;
  }

  static async regenerateForLoan(loanId: number): Promise<Period[]> {
    validateId(loanId);
    return inTransaction(async (db) => (await refreshLoan(db, loanId)).periods);
  }
}
