export interface SessionUser {
  email: string;
  name: string;
}

const SESSION_KEY = 'cima_session';
const TOKEN_KEY = 'cima_token';

export function clearSession() {
  for (const storage of [sessionStorage, localStorage]) {
    storage.removeItem(SESSION_KEY);
    storage.removeItem(TOKEN_KEY);
  }
}

export function readSession(): { user: SessionUser; token: string } | null {
  try {
    // Keep each user and token together to avoid mixing accounts.
    for (const storage of [sessionStorage, localStorage]) {
      const raw = storage.getItem(SESSION_KEY);
      const token = storage.getItem(TOKEN_KEY);
      if (!raw || !token) continue;
      try {
        const user = JSON.parse(raw) as SessionUser;
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (!user.email || !user.name || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) {
          throw new Error('Sesión inválida o expirada');
        }
        return { user, token };
      } catch {
        storage.removeItem(SESSION_KEY);
        storage.removeItem(TOKEN_KEY);
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function saveSession(user: SessionUser, token: string, remember: boolean) {
  clearSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(user));
  storage.setItem(TOKEN_KEY, token);
}
