import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma';
import { DEFAULT_CONFIG } from '../src/types';
import { LoanService } from '../src/services/loan.service';
import { PaymentService } from '../src/services/payment.service';

async function main() {
  const production = process.env.NODE_ENV === 'production';
  const email = (process.env.SEED_EMAIL ?? (production ? '' : 'rosita@cima.com')).trim().toLowerCase();
  const password = process.env.SEED_PASSWORD ?? (production ? '' : 'Cima2025!');
  const name = process.env.SEED_NAME?.trim() || 'Rosita';

  if (!email || !password) {
    throw new Error('Define SEED_EMAIL y SEED_PASSWORD para crear el usuario inicial.');
  }
  if (production && (password === 'Cima2025!' || password.length < 12)) {
    throw new Error('SEED_PASSWORD debe ser una contraseña propia de al menos 12 caracteres en producción.');
  }
  if (production && process.env.SEED_DEMO === 'true') {
    throw new Error('Los datos de demostración solo están disponibles en desarrollo.');
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: await bcrypt.hash(password, 12), name, role: 'ADMIN' },
  });

  await prisma.config.upsert({ where: { id: 1 }, update: {}, create: DEFAULT_CONFIG });

  if (process.env.SEED_DEMO === 'true') {
    // Los nombres y notas permiten reejecutar el seed sin duplicar registros.
    const today = new Date();
    const dateAgo = (days: number) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - days);
      return date.toISOString().slice(0, 10);
    };
    const examples = [
      { customerName: 'Demo · Carlos Rodríguez', principal: 5000000, modality: 'Mensual', firstInterestPaymentDate: dateAgo(30) },
      { customerName: 'Demo · María Gómez', principal: 3000000, modality: 'Quincenal', firstInterestPaymentDate: dateAgo(15) },
      { customerName: 'Demo · Luis Fernández', principal: 8000000, modality: 'Mensual', firstInterestPaymentDate: null },
    ];

    for (const example of examples) {
      let loan = await prisma.loan.findFirst({ where: { customerName: example.customerName, userId: user.id } });
      if (!loan) {
        const created = await LoanService.create({ ...example, loanDate: dateAgo(60) }, user.id);
        loan = await prisma.loan.findUniqueOrThrow({ where: { id: created.id } });
      }
      if (!example.firstInterestPaymentDate) continue;

      const note = 'Pago de capital de demostración (seed)';
      const existingPayment = await prisma.payment.findFirst({ where: { loanId: loan.id, note } });
      if (!existingPayment) {
        await PaymentService.create({
          loanId: loan.id, paymentDate: dateAgo(10), amount: 500000,
          type: 'Capital', periodNumber: null, note,
        }, user.id);
      }
    }
  }

  console.log(`Seed completado. Usuario inicial: ${user.email}. No se modificaron usuarios existentes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => { await prisma.$disconnect(); });
