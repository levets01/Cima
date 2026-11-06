/** Run only against CIMA_TEST_DATA_DIR. The complete function is serialized into Electron. */
module.exports = async function smokeRenderer() {
  const checks = [];
  const initialName = 'Smoke préstamo';
  const finalName = 'Smoke préstamo editado';
  const pause = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const wait = async (description, predicate, timeout = 20000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const result = await predicate();
      if (result) return result;
      await pause(80);
    }
    throw new Error(`Tiempo agotado: ${description}`);
  };
  const control = (selector) => wait(`control habilitado ${selector}`, () => {
    const element = document.querySelector(selector);
    return element && !element.matches(':disabled') ? element : null;
  });
  const fill = async (selector, value) => {
    const element = await control(selector);
    const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await pause();
  };
  const click = async (text, scope = document) => {
    const button = await wait(`botón ${text}`, () => Array.from(scope.querySelectorAll('button'))
      .find((item) => item.textContent.trim() === text && !item.matches(':disabled')));
    button.click();
    await pause();
  };
  const go = async (path, heading) => {
    window.location.hash = path;
    if (heading) await wait(`pantalla ${heading}`, () => Array.from(document.querySelectorAll('h1'))
      .some((item) => item.textContent.trim() === heading));
    await pause();
  };

  try {
    const bridge = window.cimaDesktop;
    assert(bridge?.isDesktop && bridge.apiKey, 'El puente de escritorio no está disponible.');
    const api = async (path) => {
      const token = localStorage.getItem('cima_token') || sessionStorage.getItem('cima_token');
      const response = await fetch(`${bridge.apiUrl}${path}`, {
        signal: AbortSignal.timeout(5000),
        headers: { 'X-Cima-Desktop-Key': bridge.apiKey, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      assert(response.ok, `La API respondió ${response.status} en ${path}: ${response.ok ? '' : await response.text()}`);
      return response.json();
    };
    const validateSavedState = async () => {
      const loans = await api('/loans');
      assert(loans.length === 1 && loans[0].customerName === finalName, 'Se esperaba únicamente el préstamo smoke editado.');
      const loan = await api(`/loans/${loans[0].id}`);
      assert(loan.principal === 1000000, 'El capital inicial debe persistir en 1000000.');
      assert(loan.capitalPaid === 100000 && loan.capitalPending === 900000, 'El abono de capital o el saldo pendiente no coincide.');
      assert(loan.interestReceived === 200000, 'El rédito recibido debe ser 200000.');
      const payments = (await api('/payments')).filter((item) => item.loanId === loan.id);
      assert(payments.length === 2, 'Deben existir dos pagos, sin duplicados.');
      assert(payments.some((item) => item.type === 'Capital' && item.amount === 100000), 'No persistió el abono de capital.');
      assert(payments.some((item) => item.type === 'Rédito' && item.amount === 200000 && item.periodNumber === 1), 'No persistió el rédito del período 1.');
      const config = await api('/config');
      assert(config.monthlyRate === 0, 'La tasa mensual cero debe persistir.');
      return { loan, paymentCount: payments.length, monthlyRate: config.monthlyRate };
    };
    const inspectScreens = async (loanId) => {
      await go(`/prestamos/${loanId}`, `Préstamo N.º ${loanId}`);
      await wait('detalle con nombre y valores', () => {
        const body = document.body.innerText;
        return body.includes(finalName) && body.includes('900.000') && body.includes('200.000');
      });
      checks.push('Detalle del préstamo y saldos visibles');
      await go('/reportes', 'Reportes');
      await wait('porcentajes correctos en reportes', () => document.body.innerText.includes('20.0%') && document.body.innerText.includes('10.0%'));
      const summary = await api('/reports/summary');
      assert(summary.capitalPending === 900000 && summary.interestCollected === 200000, 'El resumen no coincide con los pagos registrados.');
      checks.push('Reportes y resumen coinciden con los pagos');
    };

    const screen = await wait('primer acceso o sesión restaurada', () => {
      if (document.querySelector('#setup-name')) return 'setup';
      if (document.querySelector('h1')?.textContent.trim() === 'Resumen') return 'authenticated';
      const email = document.querySelector('#email');
      const submit = document.querySelector('button[type="submit"]');
      return email && submit && !submit.disabled ? 'login' : null;
    });
    assert(screen !== 'login', 'El acceso local existe, pero la sesión no se restauró automáticamente.');
    if (screen === 'authenticated') {
      assert(localStorage.getItem('cima_token'), 'La sesión persistente no contiene un token local.');
      const persisted = await validateSavedState();
      checks.push('Sesión, préstamo, dos pagos y tasa cero sobreviven al reinicio');
      await inspectScreens(persisted.loan.id);
      return { phase: 'restart', checks, loanId: persisted.loan.id, capitalPending: persisted.loan.capitalPending,
        interestReceived: persisted.loan.interestReceived, paymentCount: persisted.paymentCount, monthlyRate: persisted.monthlyRate };
    }

    await fill('#setup-name', 'Smoke Local');
    await fill('#email', 'smoke@cima.local');
    await fill('#password', 'SmokeLocal2026!');
    await fill('#setup-confirm-password', 'SmokeLocal2026!');
    await click('Crear mi acceso local');
    await wait('resumen tras crear acceso', () => document.querySelector('h1')?.textContent.trim() === 'Resumen');
    assert(localStorage.getItem('cima_token'), 'No se guardó la sesión persistente del acceso local.');
    assert((await api('/loans')).length === 0, 'La base temporal contiene préstamos ajenos a la prueba.');
    checks.push('Primer uso crea el acceso local y una sesión persistente');

    await go('/clientes/nuevo', 'Registro de Préstamos');
    await fill('#loan-customerName', initialName);
    await fill('#loan-loanDate', '2026-09-01');
    await fill('#loan-principal', '1000000');
    await fill('#loan-modality', 'Mensual');
    await fill('#loan-firstInterestPaymentDate', '2026-10-01');
    await click('Guardar préstamo');
    const created = await wait('préstamo creado', async () => (await api('/loans')).find((item) => item.customerName === initialName));
    await wait('formulario cerrado', () => !document.querySelector('#loan-customerName'));
    const row = await wait('fila editable del préstamo', () => Array.from(document.querySelectorAll('tbody tr')).find((item) => item.innerText.includes(initialName)));
    await click('Editar', row);
    await wait('edición precargada', () => document.querySelector('#loan-customerName')?.value === initialName);
    await fill('#loan-customerName', finalName);
    await click('Guardar préstamo');
    await wait('edición guardada', async () => (await api(`/loans/${created.id}`)).customerName === finalName);
    await wait('edición cerrada', () => !document.querySelector('#loan-customerName'));
    checks.push('Alta y edición del préstamo desde la tabla');

    await go('/pagos', 'Pagos');
    for (const payment of [
      { type: 'Capital', amount: '100000', date: '2026-10-15', note: 'Smoke capital' },
      { type: 'Rédito', amount: '200000', date: '2026-10-01', note: 'Smoke rédito' },
    ]) {
      await click('Nuevo pago');
      await wait('préstamo disponible para pago', () => document.querySelector(`#payment-loanId option[value="${created.id}"]`));
      await fill('#payment-loanId', created.id);
      await fill('#payment-paymentDate', payment.date);
      await fill('#payment-amount', payment.amount);
      await fill('#payment-type', payment.type);
      if (payment.type === 'Rédito') await fill('#payment-periodNumber', '1');
      await fill('#payment-note', payment.note);
      await click('Registrar pago');
      await wait(`pago ${payment.type} guardado`, async () => (await api('/payments')).some((item) => item.loanId === created.id && item.note === payment.note));
      await wait('formulario de pago cerrado', () => !document.querySelector('#payment-amount'));
    }
    const paidLoan = await api(`/loans/${created.id}`);
    assert(paidLoan.capitalPending === 900000 && paidLoan.interestReceived === 200000, 'Los pagos no actualizaron los saldos esperados.');
    checks.push('Pago de capital 100000 y rédito 200000 del período 1');

    await go('/configuracion', 'Configuración');
    await fill('#config-monthlyRate', '0');
    await click('Guardar cambios');
    await wait('tasa mensual cero guardada', async () => (await api('/config')).monthlyRate === 0);
    checks.push('La tasa cero se guarda sin perder pagos');
    const state = await validateSavedState();
    await inspectScreens(created.id);
    return { phase: 'initial', checks, loanId: created.id, capitalPending: state.loan.capitalPending,
      interestReceived: state.loan.interestReceived, paymentCount: state.paymentCount, monthlyRate: state.monthlyRate };
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nURL: ${window.location.href}\nBODY:\n${document.body.innerText.slice(0, 18000)}`);
  }
};
