import assert from 'node:assert/strict';
import test from 'node:test';
import { addMonths, computeNextDueDate, dateInputToISO, formatDate, toDateInput } from '../src/types/index.ts';

test('la fecha registrada se muestra en el mismo día desde Colombia', () => {
  process.env.TZ = 'America/Bogota';
  const saved = dateInputToISO('2026-11-06');
  assert.equal(formatDate(saved), '06/11/2026');
  assert.equal(toDateInput(saved), '2026-11-06');
  assert.throws(() => dateInputToISO('2026-02-30'));
});

test('los vencimientos mensuales respetan el último día del mes y los años bisiestos', () => {
  assert.equal(addMonths(new Date('2026-01-31T00:00:00Z'), 1).toISOString(), '2026-02-28T00:00:00.000Z');
  assert.equal(addMonths(new Date('2024-01-31T00:00:00Z'), 1).toISOString(), '2024-02-29T00:00:00.000Z');
  assert.equal(computeNextDueDate(null, 3, 'Mensual', new Date('2026-01-31T00:00:00Z'))?.toISOString(), '2026-03-31T00:00:00.000Z');
});

test('el calendario quincenal alterna el día 15 y fin de mes sin saltarse febrero', () => {
  const first = new Date('2026-01-31T00:00:00Z');
  let previous: Date | null = first;
  const dates: string[] = [];
  for (let period = 1; period <= 5; period++) {
    previous = computeNextDueDate(previous, period, 'Quincenal', first);
    dates.push(toDateInput(previous?.toISOString() ?? null));
  }
  assert.deepEqual(dates, ['2026-01-31', '2026-02-15', '2026-02-28', '2026-03-15', '2026-03-31']);
});
