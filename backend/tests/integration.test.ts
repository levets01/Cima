import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Always create a disposable local SQLite file. Existing DATABASE_URL values are
// ignored, so this test never opens or modifies the user's application database.
process.env.NODE_ENV = 'test';

test('SQLite: loans, payments, reports, configuration and concurrent writes remain consistent', { timeout: 60000 }, async (suite) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cima escritorio test '));
  process.env.DATABASE_URL = `file:${path.join(directory, 'cartera local á.db')}`;
  const { default: prisma } = await import('../src/config/prisma');
  const { LoanService, PeriodService } = await import('../src/services/loan.service');
  const { PaymentService } = await import('../src/services/payment.service');
  const { ConfigService } = await import('../src/services/config.service');
  const { ReportService } = await import('../src/services/report.service');
  const { initializeDesktopDatabase } = await import('../src/config/desktop-database');
  const base = { customerName: 'Integration Ana', loanDate: '2024-01-01', principal: 1000,
    modality: 'Mensual', ratePerPeriod: 0.12, firstInterestPaymentDate: '2024-01-31' };

  try {
    await initializeDesktopDatabase(path.resolve('prisma/migrations'));
    await initializeDesktopDatabase(path.resolve('prisma/migrations'));
    await suite.test('local migrations create the database and can run again without duplicates', async () => {
      const migrations = await prisma.$queryRawUnsafe<{ count: bigint }[]>('SELECT COUNT(*) AS count FROM "_CimaMigration"');
      assert.equal(Number(migrations[0].count), 1);
      assert.equal(await prisma.loan.count(), 0);
    });
    await ConfigService.update({ monthlyRate: 0.1, quincenalRate: 0.05, periodsPerLoan: 3, maxLoans: 30, maxPayments: 50 });
    const loan = await LoanService.create(base);

    await suite.test('creation initializes balances and the configured calendar', async () => {
      assert.equal(loan.capitalPending, 1000);
      assert.equal(loan.capitalPaid, 0);
      assert.equal(loan.ratePerPeriod, 0.12);
      const periods = await PeriodService.getByLoan(loan.id);
      assert.equal(periods.length, 3);
      assert.deepEqual(periods.map((period) => period.dueDate?.slice(0, 10)), ['2024-01-31', '2024-02-29', '2024-03-31']);
      assert.deepEqual(periods.map((period) => period.interestGenerated), [120, 120, 120]);
    });

    await suite.test('capital and interest payments update persisted and returned balances', async () => {
      await PaymentService.create({ loanId: loan.id, paymentDate: '2024-02-15', amount: 400, type: 'Capital' });
      await PaymentService.create({ loanId: loan.id, paymentDate: '2024-02-16', amount: 120, type: 'Rédito', periodNumber: 1 });
      const updated = (await LoanService.getById(loan.id))!;
      assert.equal(updated.capitalPending, 600);
      assert.equal(updated.capitalPaid, 400);
      assert.equal(updated.interestReceived, 120);
      const periods = await PeriodService.getByLoan(loan.id);
      assert.deepEqual(periods.map((period) => period.interestGenerated), [120, 72, 72]);
      assert.equal(periods[0].interestPending, 0);
      assert.equal(periods[0].status, 'Rédito pagado');
      assert.equal((await prisma.loan.findUniqueOrThrow({ where: { id: loan.id } })).capitalPending, 600);
      const regenerated = await PeriodService.regenerateForLoan(loan.id);
      assert.deepEqual(regenerated.map(({ id: _id, ...period }) => period), periods.map(({ id: _id, ...period }) => period));
    });

    await suite.test('reports match the ledger', async () => {
      const summary = await ReportService.getSummary();
      assert.equal(summary.totalLent, 1000);
      assert.equal(summary.capitalPending, 600);
      assert.equal(summary.capitalRecovered, 400);
      assert.equal(summary.interestCollected, 120);
      assert.equal(summary.totalReceived, 520);
      assert.equal(summary.interestOverdueUncollected, 144);
      const monthly = await ReportService.getMonthlyMovement(2024);
      assert.equal(monthly[0].capitalLent, 1000);
      assert.equal(monthly[1].capitalRecovered, 400);
      assert.equal(monthly[1].interestCollected, 120);
    });

    await suite.test('editing principal and customer regenerates periods and preserves payments', async () => {
      const updated = (await LoanService.update(loan.id, { customerName: 'Integration Ana Updated', principal: 1200 }))!;
      assert.equal(updated.capitalPending, 800);
      assert.equal(updated.interestPerPeriod, 144);
      const periods = await PeriodService.getByLoan(loan.id);
      assert.equal(periods[0].interestPending, 24);
      assert.equal(periods[1].interestGenerated, 96);
      assert.ok((await PaymentService.getByLoan(loan.id)).every((payment) => payment.customerName === 'Integration Ana Updated'));
      await assert.rejects(LoanService.update(loan.id, { principal: 300 }), /capital ya pagado/);
      await assert.rejects(LoanService.update(loan.id, { loanDate: '2024-02-16', firstInterestPaymentDate: '2024-03-01' }), /posterior a sus pagos/);
    });

    await suite.test('configuration preserves custom rates until that modality rate is changed', async () => {
      const fortnightly = await LoanService.create({ ...base, customerName: 'Integration Q', modality: 'Quincenal', ratePerPeriod: 0.075 });
      await ConfigService.update({ periodsPerLoan: 4 });
      assert.equal((await LoanService.getById(loan.id))?.ratePerPeriod, 0.12);
      assert.equal((await LoanService.getById(fortnightly.id))?.ratePerPeriod, 0.075);
      assert.equal((await PeriodService.getByLoan(loan.id)).length, 4);
      await ConfigService.update({ monthlyRate: 0.15 });
      assert.equal((await LoanService.getById(loan.id))?.ratePerPeriod, 0.15);
      assert.equal((await LoanService.getById(fortnightly.id))?.ratePerPeriod, 0.075);
      assert.equal((await PeriodService.getByLoan(loan.id))[1].interestGenerated, 120);
    });

    await suite.test('invalid payments leave the ledger and calendar unchanged', async () => {
      const before = await prisma.payment.count();
      await assert.rejects(PaymentService.create({ loanId: loan.id, paymentDate: '2024-02-15', amount: 801, type: 'Capital' }), /supera el capital/);
      await assert.rejects(PaymentService.create({ loanId: loan.id, paymentDate: '2024-02-15', amount: 999, type: 'Rédito', periodNumber: 1 }), /supera el rédito/);
      await assert.rejects(PaymentService.create({ loanId: loan.id, paymentDate: '2024-02-15', amount: 1, type: 'Rédito', periodNumber: 999 }), /período de rédito/);
      await assert.rejects(PaymentService.create({ loanId: loan.id, paymentDate: '2023-12-31', amount: 1, type: 'Capital' }), /anterior al préstamo/);
      await assert.rejects(PaymentService.create({ loanId: loan.id, paymentDate: '2099-01-01', amount: 1, type: 'Capital' }), /fecha futura/);
      assert.equal(await prisma.payment.count(), before);
    });

    await suite.test('an import is atomic when a later row exceeds the loan limit', async () => {
      const before = { loans: await prisma.loan.count(), payments: await prisma.payment.count(), periods: await prisma.period.count() };
      await ConfigService.update({ maxLoans: before.loans + 1 });
      await assert.rejects(LoanService.createMany([
        { ...base, customerName: 'Import First', capitalPaid: 100, interestReceived: 25 },
        { ...base, customerName: 'Import Second' },
      ]), /límite de préstamos/);
      assert.equal(await prisma.loan.count(), before.loans);
      assert.equal(await prisma.payment.count(), before.payments);
      assert.equal(await prisma.period.count(), before.periods);
      await ConfigService.update({ maxLoans: 30 });
    });

    await suite.test('imported historical balances survive recomputation and have a review trail', async () => {
      const [imported] = await LoanService.createMany([{ ...base, capitalPaid: 100, interestReceived: 25 }]);
      assert.equal(imported.capitalPending, 900);
      assert.equal(imported.interestReceived, 25);
      const reloaded = (await LoanService.getById(imported.id))!;
      assert.equal(reloaded.capitalPaid, 100);
      assert.equal(reloaded.interestReceived, 25);
      const payments = await PaymentService.getByLoan(imported.id);
      assert.equal(payments.length, 2);
      assert.ok(payments.every((payment) => payment.review.startsWith('⚠')));
      const periods = await PeriodService.getByLoan(imported.id);
      assert.equal(periods[0].interestGenerated, 108);
      assert.equal(periods[0].interestPaid, 25);
    });

    await suite.test('concurrent capital payments cannot overpay the same loan', async () => {
      const concurrent = await LoanService.create({ ...base, principal: 100, customerName: 'Concurrent' });
      const input = { loanId: concurrent.id, paymentDate: '2024-02-15', amount: 80, type: 'Capital' };
      const results = await Promise.allSettled([PaymentService.create(input), PaymentService.create(input)]);
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal((await PaymentService.getByLoan(concurrent.id)).length, 1);
      assert.equal((await LoanService.getById(concurrent.id))?.capitalPending, 20);
    });

    await suite.test('configured limits and paid period history are enforced', async () => {
      const currentPayments = await prisma.payment.count();
      const currentLoans = await prisma.loan.count();
      await ConfigService.update({ maxPayments: currentPayments, maxLoans: currentLoans });
      await assert.rejects(LoanService.create(base), /límite de préstamos/);
      await assert.rejects(PaymentService.create({ loanId: loan.id, paymentDate: '2024-02-15', amount: 1, type: 'Capital' }), /límite de pagos/);
      await assert.rejects(ConfigService.update({ maxLoans: currentLoans - 1 }), /número actual/);
      await ConfigService.update({ maxPayments: 50 });
      const period = (await PeriodService.getByLoan(loan.id))[1];
      await PaymentService.create({ loanId: loan.id, paymentDate: '2024-03-01', amount: period.interestPending, type: 'Rédito', periodNumber: 2 });
      await assert.rejects(ConfigService.update({ periodsPerLoan: 1 }), /períodos que ya tienen pagos/);
    });
  } finally {
    await prisma.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
