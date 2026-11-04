/**
 * Acceso local de un solo usuario. La contraseña se guarda como hash SHA-256 con sal
 * en este navegador. Protege la pantalla, no es seguridad de servidor: los datos
 * siguen en localStorage.
 */
const CRED_KEY = 'cima_auth';
const SESSION_KEY = 'cima_session';

interface Credential {
  salt: string;
  hash: string;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCredential(): Credential | null {
  try {
    const raw = localStorage.getItem(CRED_KEY);
    return raw ? (JSON.parse(raw) as Credential) : null;
  } catch {
    return null;
  }
}

function openSession(remember: boolean) {
  try {
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, '1');
  } catch {
    /* almacenamiento bloqueado */
  }
}

export const auth = {
  hasPassword(): boolean {
    return readCredential() !== null;
  },

  isAuthenticated(): boolean {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1' || localStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  },

  async setup(password: string, remember: boolean): Promise<void> {
    const salt = crypto.randomUUID();
    const hash = await sha256(salt + password);
    localStorage.setItem(CRED_KEY, JSON.stringify({ salt, hash }));
    openSession(remember);
  },

  async login(password: string, remember: boolean): Promise<boolean> {
    const cred = readCredential();
    if (!cred) return false;
    const ok = (await sha256(cred.salt + password)) === cred.hash;
    if (ok) openSession(remember);
    return ok;
  },

  logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* noop */
    }
  },
};
