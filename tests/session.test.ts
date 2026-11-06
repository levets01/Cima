import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { clearSession, readSession, saveSession } from '../src/lib/session.ts';

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}
const user = { email: 'test@cima.local', name: 'Prueba' };
const token = (expires: number) => `header.${btoa(JSON.stringify({ exp: expires }))}.signature`;

beforeEach(() => {
  Object.defineProperty(globalThis, 'sessionStorage', { value: memoryStorage(), configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true });
});

test('una sesión nueva reemplaza la cuenta persistida anteriormente', () => {
  saveSession({ email: 'previous@cima.local', name: 'Anterior' }, token(9999999999), true);
  saveSession(user, token(9999999999), false);
  assert.equal(localStorage.getItem('cima_token'), null);
  assert.equal(readSession()?.user.email, user.email);
  clearSession();
  assert.equal(readSession(), null);
});

test('una sesión expirada o corrupta no concede acceso', () => {
  saveSession(user, token(1), false);
  assert.equal(readSession(), null);
  assert.equal(sessionStorage.getItem('cima_token'), null);
  sessionStorage.setItem('cima_session', '{invalid');
  sessionStorage.setItem('cima_token', 'invalid');
  assert.equal(readSession(), null);
});

test('una sesión corrupta no oculta una sesión persistida válida', () => {
  saveSession(user, token(9999999999), true);
  sessionStorage.setItem('cima_session', '{invalid');
  sessionStorage.setItem('cima_token', 'invalid');
  assert.equal(readSession()?.user.email, user.email);
  assert.equal(sessionStorage.getItem('cima_token'), null);
});
