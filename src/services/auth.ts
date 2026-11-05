import { apiJson, apiRequest } from '@/lib/api';

export interface SessionUser {
  email: string;
  name: string;
}

export interface AuthResponse {
  user: SessionUser;
  token: string;
}

const SESSION_KEY = 'cima_session';
const TOKEN_KEY = 'cima_token';

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

  async login(email: string, password: string, remember: boolean): Promise<SessionUser | null> {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember }),
    });

    if (res.status === 401) return null;
    if (!res.ok) return null;

    const data: AuthResponse = await res.json();

    const session: SessionUser = { email: data.user.email, name: data.user.name };
    try {
      const store = remember ? localStorage : sessionStorage;
      store.setItem(SESSION_KEY, JSON.stringify(session));
      store.setItem(TOKEN_KEY, data.token);
    } catch {
      /* almacenamiento bloqueado */
    }
    return session;
  },

  logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* noop */
    }
  },
};
