import { apiJson, apiRequest } from '@/lib/api';
import { clearSession, readSession, saveSession } from '@/lib/session';
import type { SessionUser } from '@/lib/session';

export type { SessionUser } from '@/lib/session';

export interface AuthResponse {
  user: SessionUser;
  token: string;
}

export const auth = {
  currentUser: () => readSession()?.user ?? null,
  isAuthenticated: () => readSession() !== null,

  async setup(name: string, email: string, password: string): Promise<SessionUser> {
    const data = await apiJson<AuthResponse>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
    });
    try {
      saveSession(data.user, data.token, true);
    } catch {
      throw new Error('No se pudo guardar tu acceso en este equipo. Inténtalo de nuevo.');
    }
    return data.user;
  },

  async login(email: string, password: string, remember: boolean): Promise<SessionUser | null> {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, remember }),
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error('No se pudo iniciar sesión. Inténtalo de nuevo.');
    const data: AuthResponse = await response.json();
    try {
      saveSession(data.user, data.token, remember);
    } catch {
      throw new Error('Habilita el almacenamiento del navegador para iniciar sesión.');
    }
    return data.user;
  },

  logout() {
    clearSession();
  },
};
