import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma';
import { DEFAULT_CONFIG } from '../src/types';
import { toPrismaLoanStatus } from '../src/services/loan.service';

async function main() {
  const hashedPassword = await bcrypt.hash('Cima2025!', 10);

  // Usuario por defecto (coincide con users.json del frontend)
  await prisma.user.upsert({
    where: { email: 'rosita@cima.com' },
    update: {},
    create: {
      email: 'rosita@cima.com',
      password: hashedPassword,
      name: 'Rosita',
    },
  });

  // Configuración por defecto
  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: DEFAULT_CONFIG,
  });

  // Préstamos de ejemplo
  const now = new Date();
  const addMonths = (date: Date, m: number) => {
    const r = new Date(date);
    r.setMonth(r.getMonth() + m);
    return r;
  };
  const addDays = (date: Date, d: number) => {
    const r = new Date(date);
    r.setDate(r.getDate() + d);
    return r;
  };
  const toISO = (d: Date) => d.toISOString();

  const loans = [
    {
      customerName: 'Carlos Rodríguez',
      loanDate: toISO(addMonths(now, -4)),
      principal: 5000000,
      modality: 'Mensual' as const,
      ratePerPeriod: 0.2,
      interestPerPeriod: 1000000,
      firstInterestPaymentDate: toISO(addMonths(now, -3)),
      capitalPaid: 1000000,
      capitalPending: 4000000,
      interestReceived: 3000000,
      status: 'Activo' as const,
      nextCollection: toISO(addMonths(now, 1)),
      interestOverdue: 0,
      daysOverdue: 0,
    },
    {
      customerName: 'María Gómez',
      loanDate: toISO(addMonths(now, -2)),
      principal: 3000000,
      modality: 'Quincenal' as const,
      ratePerPeriod: 0.1,
      interestPerPeriod: 300000,
      firstInterestPaymentDate: toISO(addDays(now, -15)),
      capitalPaid: 500000,
      capitalPending: 2500000,
      interestReceived: 600000,
      status: 'En seguimiento' as const,
      nextCollection: toISO(addDays(now, -5)),
      interestOverdue: 300000,
      daysOverdue: 5,
    },
    {
      customerName: 'Luis Fernández',
      loanDate: toISO(addMonths(now, -6)),
      principal: 8000000,
      modality: 'Mensual' as const,
      ratePerPeriod: 0.2,
      interestPerPeriod: 1600000,
      firstInterestPaymentDate: null,
      capitalPaid: 0,
      capitalPending: 8000000,
      interestReceived: 0,
      status: 'Falta fecha' as const,
      nextCollection: null,
      interestOverdue: 0,
      daysOverdue: 0,
    },
  ];

  for (const loan of loans) {
    const created = await prisma.loan.create({
      data: {
        customerName: loan.customerName,
        loanDate: new Date(loan.loanDate),
        principal: loan.principal,
        modality: loan.modality === 'Quincenal' ? 'Quincenal' : 'Mensual',
        ratePerPeriod: loan.ratePerPeriod,
        interestPerPeriod: loan.interestPerPeriod,
        firstInterestPaymentDate: loan.firstInterestPaymentDate ? new Date(loan.firstInterestPaymentDate) : null,
        capitalPaid: loan.capitalPaid,
        capitalPending: loan.capitalPending,
        interestReceived: loan.interestReceived,
        status: loan.status === 'Activo' ? 'Activo'
          : loan.status === 'En seguimiento' ? 'EnSeguimiento'
          : loan.status === 'Falta fecha' ? 'FaltaFecha'
          : 'CapitalPagado',
        nextCollection: loan.nextCollection ? new Date(loan.nextCollection) : null,
        interestOverdue: loan.interestOverdue,
        daysOverdue: loan.daysOverdue,
      },
    });

    // Pagos de ejemplo
    if (created.id === 1) {
      await prisma.payment.createMany({
        data: [
          {
            loanId: created.id,
            paymentDate: toISO(addDays(now, -45)),
            amount: 500000,
            type: 'Capital',
            periodNumber: null,
            note: 'Abono a capital',
            customerName: 'Carlos Rodríguez',
            review: 'OK',
          },
          {
            loanId: created.id,
            paymentDate: toISO(addDays(now, -30)),
            amount: 1000000,
            type: 'Redito',
            periodNumber: 1,
            note: 'Rédito período 1',
            customerName: 'Carlos Rodríguez',
            review: 'OK',
          },
        ],
      });
    }
    if (created.id === 2) {
      await prisma.payment.createMany({
        data: [
          {
            loanId: created.id,
            paymentDate: toISO(addDays(now, -20)),
            amount: 300000,
            type: 'Redito',
            periodNumber: 1,
            note: 'Rédito quincenal 1',
            customerName: 'María Gómez',
            review: 'OK',
          },
          {
            loanId: created.id,
            paymentDate: toISO(addDays(now, -10)),
            amount: 500000,
            type: 'Capital',
            periodNumber: null,
            note: 'Abono capital',
            customerName: 'María Gómez',
            review: 'OK',
          },
        ],
      });
    }
  }

  console.log('✅ Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
