import { z } from 'zod';
import { businessDate } from '../types';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Fecha inválida');

/** Noon UTC preserves a date-only form value when displayed in Colombia. */
export const dateSchema = z.union([dateOnly, z.string().datetime({ offset: true })])
  .transform((value) => value.length === 10 ? `${value}T12:00:00.000Z` : new Date(value).toISOString());
const money = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER / 100).multipleOf(0.01, 'Usa como máximo dos decimales');
const rate = z.number().finite().min(0).max(1, 'La tasa debe estar entre 0 y 1');

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
  remember: z.boolean().optional(),
});

const loanFields = z.object({
  customerName: z.string().trim().min(1, 'Nombre del cliente requerido').max(200),
  loanDate: dateSchema,
  principal: money.positive('El principal debe ser positivo'),
  modality: z.enum(['Mensual', 'Quincenal']),
  ratePerPeriod: rate.optional(),
  // Accepted for compatibility; derived amounts are always calculated by the server.
  interestPerPeriod: z.number().finite().nonnegative().optional(),
  firstInterestPaymentDate: dateSchema.nullable().optional(),
  capitalPaid: money.default(0),
  interestReceived: money.default(0),
});

function validateLoanDates(value: { loanDate?: string; firstInterestPaymentDate?: string | null }, ctx: z.RefinementCtx) {
  if (value.loanDate && value.firstInterestPaymentDate
    && businessDate(value.firstInterestPaymentDate) < businessDate(value.loanDate)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['firstInterestPaymentDate'], message: 'El primer vencimiento no puede ser anterior al préstamo' });
  }
}

export const loanSchema = loanFields.superRefine((value, ctx) => {
  validateLoanDates(value, ctx);
  if (value.capitalPaid > value.principal) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capitalPaid'], message: 'El capital pagado no puede superar el principal' });
  }
});

export const loanUpdateSchema = loanFields.omit({ capitalPaid: true, interestReceived: true })
  .partial().superRefine(validateLoanDates);

export const paymentSchema = z.object({
  loanId: z.number().int().positive('ID de préstamo inválido'),
  paymentDate: dateSchema,
  amount: money.positive('El monto debe ser positivo'),
  type: z.enum(['Capital', 'Rédito']),
  periodNumber: z.number().int().positive().optional().nullable(),
  note: z.string().trim().max(2000).optional(),
}).superRefine((value, ctx) => {
  if (value.type === 'Rédito' && !value.periodNumber) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['periodNumber'], message: 'El rédito requiere un número de período' });
  }
  if (value.type === 'Capital' && value.periodNumber != null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['periodNumber'], message: 'Un abono a capital no lleva período' });
  }
});

export const configSchema = z.object({
  quincenalRate: rate.optional(),
  monthlyRate: rate.optional(),
  periodsPerLoan: z.number().int().positive().max(1200).optional(),
  maxLoans: z.number().int().positive().max(100000).optional(),
  maxPayments: z.number().int().positive().max(1000000).optional(),
});

export const loanImportSchema = z.object({
  loans: z.array(loanFields.extend({
    ratePerPeriod: z.number().finite().min(0).max(100)
      .transform((value) => value > 1 ? value / 100 : value).optional(),
  }).superRefine((value, ctx) => {
    validateLoanDates(value, ctx);
    if (value.capitalPaid > value.principal) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capitalPaid'], message: 'El capital pagado no puede superar el principal' });
    }
  })).min(1, 'Se requiere al menos un préstamo').max(1000),
});
