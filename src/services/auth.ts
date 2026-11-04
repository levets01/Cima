/**
 * Login SIMULADO: valida contra src/services/mock/users.json.
 * Imita lo que hará el backend (respuesta asíncrona con espera), pero las credenciales
 * viajan dentro de la aplicación, así que NO es seguridad real.
 * Pendiente: reemplazar `login` y `logout` por llamadas al backend; la pantalla no cambia.
 */
import users from './mock/users.json';

const SESSION_KEY = 'cima_session';
const LATENCY_MS = 700;

interface MockUser {
  email: string;
  password: string;
  name: string;
}

export interface SessionUser {
  email: string;
  name: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (email: string) => email.trim().toLowerCase();

function readSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export const auth = {
  currentUser: readSession,

  isAuthenticated(): boolean {
    return readSession() !== null;
  },

  /** Devuelve el usuario si las credenciales coinciden con users.json; si no, null. */
  async login(email: string, password: string, remember: boolean): Promise<SessionUser | null> {
    await sleep(LATENCY_MS);
    const match = (users as MockUser[]).find((u) => normalize(u.email) === normalize(email) && u.password === password);
    if (!match) return null;
    const session: SessionUser = { email: match.email, name: match.name };
    try {
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* almacenamiento bloqueado: la sesión no se podrá guardar */
    }
    return session;
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
