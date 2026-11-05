import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const loanSchema = z.object({
  customerName: z.string().min(1, 'Nombre del cliente requerido'),
  loanDate: z.string().datetime({ offset: true }),
  principal: z.number().positive('El principal debe ser positivo'),
  modality: z.enum(['Mensual', 'Quincenal']),
  ratePerPeriod: z.number().nonnegative(),
  interestPerPeriod: z.number().nonnegative(),
  firstInterestPaymentDate: z.string().datetime({ offset: true }).optional().nullable(),
  capitalPaid: z.number().nonnegative().default(0),
  capitalPending: z.number().nonnegative().default(0),
  interestReceived: z.number().nonnegative().default(0),
  nextCollection: z.string().datetime({ offset: true }).optional().nullable(),
  interestOverdue: z.number().nonnegative().default(0),
  daysOverdue: z.number().int().nonnegative().default(0),
});

export const loanUpdateSchema = z.object({
  customerName: z.string().min(1).optional(),
  loanDate: z.string().datetime({ offset: true }).optional(),
  principal: z.number().positive().optional(),
  modality: z.enum(['Mensual', 'Quincenal']).optional(),
  ratePerPeriod: z.number().nonnegative().optional(),
  interestPerPeriod: z.number().nonnegative().optional(),
  firstInterestPaymentDate: z.string().datetime({ offset: true }).optional().nullable(),
  capitalPaid: z.number().nonnegative().optional(),
  capitalPending: z.number().nonnegative().optional(),
  interestReceived: z.number().nonnegative().optional(),
  status: z.enum([
    'Activo',
    'En seguimiento',
    'Falta fecha',
    'Capital pagado',
  ]).optional(),
  nextCollection: z.string().datetime({ offset: true }).optional().nullable(),
  interestOverdue: z.number().nonnegative().optional(),
  daysOverdue: z.number().int().nonnegative().optional(),
});

export const paymentSchema = z.object({
  loanId: z.number().int().positive('ID de préstamo inválido'),
  paymentDate: z.string().datetime({ offset: true }),
  amount: z.number().positive('El monto debe ser positivo'),
  type: z.enum(['Capital', 'Rédito']),
  periodNumber: z.number().int().positive().optional().nullable(),
  note: z.string().optional(),
});

export const configSchema = z.object({
  quincenalRate: z.number().nonnegative().optional(),
  monthlyRate: z.number().nonnegative().optional(),
  periodsPerLoan: z.number().int().positive().optional(),
  maxLoans: z.number().int().positive().optional(),
  maxPayments: z.number().int().positive().optional(),
});
