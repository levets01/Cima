import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.CIMA_DESKTOP = 'true';
process.env.CIMA_DESKTOP_KEY = 'cima-desktop-api-test-key';
process.env.JWT_SECRET = 'cima-desktop-api-test-jwt-secret-for-temporary-database';
process.env.FRONTEND_URL = 'null';

// Each test file runs in its own worker and gets a newly created SQLite database.
test('desktop HTTP API: local access, first account, sessions and validation', { timeout: 60000 }, async (suite) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cima desktop api '));
  process.env.DATABASE_URL = `file:${path.join(directory, 'cartera-api.db')}`;
  const { default: prisma } = await import('../src/config/prisma');
  const { initializeDesktopDatabase } = await import('../src/config/desktop-database');
  const { createApp } = await import('../src/app');
  let server: Server | undefined;
  let token = '';
  let loanId = 0;
  const account = { email: '  DESKTOP@EXAMPLE.TEST  ', name: '  Administradora Local  ', password: 'Local123' };

  try {
    await initializeDesktopDatabase(path.resolve('prisma/migrations'));
    server = await new Promise<Server>((resolve, reject) => {
      const listener = createApp().listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const origin = `http://127.0.0.1:${address.port}`;
    const request = (route: string, init: RequestInit = {}, access: { key?: string | null; token?: string | null } = {}) => {
      const headers = new Headers(init.headers);
      headers.set('Origin', 'null');
      if (access.key !== null) headers.set('X-Cima-Desktop-Key', access.key ?? process.env.CIMA_DESKTOP_KEY!);
      if (access.token !== null && (access.token ?? token)) headers.set('Authorization', `Bearer ${access.token ?? token}`);
      if (init.body) headers.set('Content-Type', 'application/json');
      return fetch(`${origin}/api${route}`, { ...init, headers });
    };
    const body = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });

    await suite.test('all actual API requests require the desktop key', async () => {
      for (const key of [null, 'incorrect-local-key']) {
        const response = await request('/auth/setup-status', {}, { key });
        assert.equal(response.status, 403);
        assert.match((await response.json()).error, /aplicación local/);
      }
      const health = await request('/health');
      assert.equal(health.status, 200);
      assert.equal((await health.json()).status, 'ok');
    });

    await suite.test('file-origin CORS preflight permits the local key header and authorization', async () => {
      const response = await fetch(`${origin}/api/auth/setup`, { method: 'OPTIONS', headers: {
        Origin: 'null', 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-cima-desktop-key,authorization',
      } });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), 'null');
      assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
      assert.match(response.headers.get('access-control-allow-headers')!.toLowerCase(), /x-cima-desktop-key/);
      assert.match(response.headers.get('access-control-allow-headers')!.toLowerCase(), /authorization/);
    });

    await suite.test('a fresh database requests setup and contains no default user', async () => {
      assert.equal(await prisma.user.count(), 0);
      const response = await request('/auth/setup-status');
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), 'null');
      assert.deepEqual(await response.json(), { needsSetup: true });
      assert.equal((await request('/loans', {}, { token: null })).status, 401);
      assert.equal((await request('/auth/login', body({ email: 'rosita@cima.com', password: 'Cima2025!' }))).status, 401);
    });

    await suite.test('setup rejects fewer than eight password characters without creating an account', async () => {
      const response = await request('/auth/setup', body({ ...account, password: '1234567' }));
      assert.equal(response.status, 400);
      const result = await response.json();
      assert.equal(result.error, 'Datos inválidos');
      assert.ok(result.details.some((detail: { field: string }) => detail.field === 'password'));
      assert.equal(await prisma.user.count(), 0);
    });

    await suite.test('first setup creates exactly one administrator and a session', async () => {
      const response = await request('/auth/setup', body(account));
      assert.equal(response.status, 201);
      const result = await response.json();
      assert.deepEqual(result.user, { email: 'desktop@example.test', name: 'Administradora Local' });
      assert.equal(typeof result.token, 'string');
      assert.ok(result.token.length > 30);
      token = result.token;
      const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
      assert.equal(users.length, 1);
      assert.equal(users[0].role, 'ADMIN');
    });

    await suite.test('setup cannot run a second time or replace the first account', async () => {
      const status = await request('/auth/setup-status');
      assert.deepEqual(await status.json(), { needsSetup: false });
      const response = await request('/auth/setup', body({ ...account, email: 'second@example.test', password: 'Changed123' }));
      assert.equal(response.status, 409);
      assert.match((await response.json()).error, /ya está configurado/);
      assert.equal(await prisma.user.count(), 1);
      assert.equal((await prisma.user.findFirstOrThrow({ select: { email: true } })).email, 'desktop@example.test');
    });

    await suite.test('login and session endpoints validate credentials and bearer tokens', async () => {
      assert.equal((await request('/auth/login', body({ email: 'desktop@example.test', password: 'wrong-password' }))).status, 401);
      const response = await request('/auth/login', body({ email: account.email, password: account.password }));
      assert.equal(response.status, 200);
      const session = await response.json();
      token = session.token;
      const me = await request('/auth/me');
      assert.equal(me.status, 200);
      assert.deepEqual(await me.json(), { user: { email: 'desktop@example.test', name: 'Administradora Local' } });
      assert.equal((await request('/auth/me', {}, { token: null })).status, 401);
      assert.equal((await request('/loans', {}, { token: 'invalid-jwt' })).status, 401);
      assert.equal((await request('/loans', {}, { key: null })).status, 403);
    });

    await suite.test('invalid dates, identifiers and configuration values return HTTP 400', async () => {
      const invalidDate = await request('/loans', body({ customerName: 'Cliente', loanDate: '2024-02-30', principal: 1000, modality: 'Mensual' }));
      assert.equal(invalidDate.status, 400);
      const details = await invalidDate.json();
      assert.ok(details.details.some((detail: { field: string }) => detail.field === 'loanDate'));
      assert.equal((await request('/loans/1abc')).status, 400);
      assert.equal((await request('/loans/1.5')).status, 400);
      assert.equal((await request('/reports/monthly-movement?year=invalid')).status, 400);
      assert.equal((await request('/payments?loanId=-1')).status, 400);
      assert.equal((await request('/config', { method: 'PATCH', body: JSON.stringify({ monthlyRate: 2 }) })).status, 400);
      assert.equal(await prisma.loan.count(), 0);
    });

    await suite.test('date-only forms create and repay a loan with consistent API reports', async () => {
      const created = await request('/loans', body({ customerName: 'Ana API', loanDate: '2024-01-01', principal: 1000,
        modality: 'Mensual', firstInterestPaymentDate: '2024-01-31', ratePerPeriod: 0.1 }));
      assert.equal(created.status, 201);
      const loan = await created.json();
      loanId = loan.id;
      assert.equal(loan.loanDate, '2024-01-01T12:00:00.000Z');
      assert.equal(loan.capitalPending, 1000);
      const payment = await request('/payments', body({ loanId, paymentDate: '2024-02-15', amount: 400, type: 'Capital' }));
      assert.equal(payment.status, 201);
      const periods = await request(`/periods/loan/${loanId}`);
      assert.equal(periods.status, 200);
      const calendar = await periods.json();
      assert.equal(calendar[0].interestGenerated, 100);
      assert.equal(calendar[1].dueDate, '2024-02-29T12:00:00.000Z');
      assert.equal(calendar[1].interestGenerated, 60);
      const summary = await request('/reports/summary');
      assert.equal(summary.status, 200);
      const indicators = await summary.json();
      assert.equal(indicators.totalLent, 1000);
      assert.equal(indicators.capitalPending, 600);
      assert.equal(indicators.capitalRecovered, 400);
    });

    await suite.test('payment business errors return HTTP 400 and preserve the ledger', async () => {
      const scenarios = [
        { paymentDate: '2024-02-15', amount: 601, type: 'Capital' },
        { paymentDate: '2023-12-31', amount: 1, type: 'Capital' },
        { paymentDate: '2024-02-15', amount: 1, type: 'Rédito', periodNumber: 999 },
        { paymentDate: '2024-02-15', amount: 1, type: 'Rédito' },
      ];
      for (const scenario of scenarios) {
        const response = await request('/payments', body({ loanId, ...scenario }));
        assert.equal(response.status, 400);
        assert.equal(typeof (await response.json()).error, 'string');
      }
      assert.equal(await prisma.payment.count(), 1);
      assert.equal((await prisma.loan.findUniqueOrThrow({ where: { id: loanId } })).capitalPending, 600);
    });
    await suite.test('sessions use current account data and reject tokens after restored identity changes', async () => {
      const user = await prisma.user.findFirstOrThrow({ select: { id: true } });
      await prisma.user.update({ where: { id: user.id }, data: { name: 'Nombre restaurado' }, select: { id: true } });
      const refreshed = await request('/auth/me');
      assert.equal(refreshed.status, 200);
      assert.equal((await refreshed.json()).user.name, 'Nombre restaurado');

      await prisma.user.update({ where: { id: user.id }, data: { email: 'restored@example.test' }, select: { id: true } });
      assert.equal((await request('/auth/me')).status, 401);
      assert.equal((await request('/loans')).status, 401);
      const login = await request('/auth/login', body({ email: 'restored@example.test', password: account.password }));
      assert.equal(login.status, 200);
      token = (await login.json()).token;
      assert.equal((await request('/loans')).status, 200);

      await prisma.user.delete({ where: { id: user.id }, select: { id: true } });
      assert.equal((await request('/auth/me')).status, 401);
      assert.equal((await request('/loans')).status, 401);
    });
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    }
    await prisma.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
