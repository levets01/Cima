import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.NODE_ENV = 'test';

test('desktop SQLite initialization, migration integrity and independent backups', { timeout: 60000 }, async (suite) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cima desktop backup '));
  process.env.DATABASE_URL = `file:${path.join(directory, 'cartera principal á.db')}`;
  const migrations = path.join(directory, 'migrations');
  await cp(path.resolve('prisma/migrations'), migrations, { recursive: true });
  const { default: prisma } = await import('../src/config/prisma');
  const { PrismaClient } = await import('@prisma/client');
  const { initializeDesktopDatabase, backupDesktopDatabase, migrationStatements } = await import('../src/config/desktop-database');
  const { LoanService } = await import('../src/services/loan.service');
  const { PaymentService } = await import('../src/services/payment.service');

  try {
    await suite.test('the SQL splitter respects comments, escaped quotes and semicolons in strings', () => {
      assert.deepEqual(migrationStatements(`-- ignored;\nCREATE TABLE "A;B" ("text" TEXT); /* ignored; */ INSERT INTO "A;B" VALUES ('it''s; valid');`), [
        'CREATE TABLE "A;B" ("text" TEXT)', 'INSERT INTO "A;B" VALUES (\'it\'\'s; valid\')',
      ]);
      assert.throws(() => migrationStatements("SELECT 'unfinished"), /SQL incompleto/);
    });

    await suite.test('initialization runs offline twice and does not create a user', async () => {
      await initializeDesktopDatabase(migrations);
      await initializeDesktopDatabase(migrations);
      assert.equal(await prisma.user.count(), 0);
      assert.equal(await prisma.loan.count(), 0);
      const history = await prisma.$queryRawUnsafe<{ count: bigint }[]>('SELECT COUNT(*) AS count FROM "_CimaMigration"');
      assert.equal(Number(history[0].count), 1);
    });

    const user = await prisma.user.create({ data: { email: 'desktop@example.test', password: 'test-only-hash', name: 'Desktop Local' } });
    const loan = await LoanService.create({
      customerName: 'Ana Local', loanDate: '2024-01-01', principal: 1000,
      modality: 'Mensual', firstInterestPaymentDate: '2024-01-31',
    }, user.id);
    await PaymentService.create({ loanId: loan.id, paymentDate: '2024-02-01', amount: 20, type: 'Capital' }, user.id);

    await suite.test('a pending migration applies once and preserves existing records', async () => {
      const next = path.join(migrations, '20261106010000_pending');
      await mkdir(next);
      await writeFile(path.join(next, 'migration.sql'), `CREATE TABLE "MigrationNote" ("id" INTEGER PRIMARY KEY, "note" TEXT NOT NULL);\nINSERT INTO "MigrationNote" VALUES (1, 'texto; válido');`);
      await initializeDesktopDatabase(migrations);
      await initializeDesktopDatabase(migrations);
      const note = await prisma.$queryRawUnsafe<{ note: string }[]>('SELECT note FROM "MigrationNote"');
      assert.equal(note[0].note, 'texto; válido');
      assert.equal(await prisma.loan.count(), 1);
      assert.equal(await prisma.payment.count(), 1);
      const history = await prisma.$queryRawUnsafe<{ count: bigint }[]>('SELECT COUNT(*) AS count FROM "_CimaMigration"');
      assert.equal(Number(history[0].count), 2);
    });

    await suite.test('a checksum mismatch stops initialization without changing financial data', async () => {
      const filename = path.join(migrations, '20261106000000_initial', 'migration.sql');
      const original = await readFile(filename, 'utf8');
      await writeFile(filename, `${original}\n-- modified after application\n`);
      try {
        await assert.rejects(initializeDesktopDatabase(migrations), /modificada después de aplicarse/);
        assert.equal((await LoanService.getById(loan.id))?.capitalPending, 980);
        assert.equal(await prisma.payment.count(), 1);
      } finally { await writeFile(filename, original); }
    });

    await suite.test('a failed migration rolls back both its schema changes and history entry', async () => {
      const failed = path.join(migrations, '20261106020000_failed');
      await mkdir(failed);
      await writeFile(path.join(failed, 'migration.sql'), 'CREATE TABLE "PartialMigration" ("id" INTEGER); INSERT INTO "TableDoesNotExist" VALUES (1);');
      try {
        await assert.rejects(initializeDesktopDatabase(migrations));
        const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(`SELECT name FROM sqlite_master WHERE name = 'PartialMigration'`);
        assert.equal(tables.length, 0);
        const history = await prisma.$queryRawUnsafe<{ count: bigint }[]>('SELECT COUNT(*) AS count FROM "_CimaMigration"');
        assert.equal(Number(history[0].count), 2);
      } finally { await rm(failed, { recursive: true, force: true }); }
    });

    await suite.test('a VACUUM backup reopens with users, loans, payments, schedules and migration history intact', async () => {
      const destination = path.join(directory, "respaldo á con ' comilla.db");
      await backupDesktopDatabase(destination);
      const snapshot = new PrismaClient({ datasources: { db: { url: `file:${destination}` } } });
      try {
        assert.equal(await snapshot.user.count(), 1);
        assert.equal(await snapshot.loan.count(), 1);
        assert.equal(await snapshot.payment.count(), 1);
        assert.equal(await snapshot.period.count(), 36);
        assert.equal(await snapshot.config.count(), 1);
        assert.equal((await snapshot.loan.findUniqueOrThrow({ where: { id: loan.id } })).capitalPending, 980);
        const integrity = await snapshot.$queryRawUnsafe<{ integrity_check: string }[]>('PRAGMA integrity_check');
        assert.equal(integrity[0].integrity_check, 'ok');
        const history = await snapshot.$queryRawUnsafe<{ count: bigint }[]>('SELECT COUNT(*) AS count FROM "_CimaMigration"');
        assert.equal(Number(history[0].count), 2);
        await PaymentService.create({ loanId: loan.id, paymentDate: '2024-02-02', amount: 30, type: 'Capital' }, user.id);
        assert.equal((await LoanService.getById(loan.id))?.capitalPending, 950);
        assert.equal((await snapshot.loan.findUniqueOrThrow({ where: { id: loan.id } })).capitalPending, 980);
      } finally { await snapshot.$disconnect(); }
      await assert.rejects(backupDesktopDatabase(destination), /ya existe/);
      await assert.rejects(backupDesktopDatabase('relative.db'), /ruta absoluta/);
    });
  } finally {
    await prisma.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
