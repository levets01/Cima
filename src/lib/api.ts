const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('cima_session') ?? localStorage.getItem('cima_session');
  if (!raw) return null;
  try {
    const { email, name } = JSON.parse(raw);
    // El backend devuelve un JWT token; aquí lo guardamos tras el login
    return (sessionStorage.getItem('cima_token') ?? localStorage.getItem('cima_token')) ?? '';
  } catch {
    return null;
  }
}

export async function apiRequest(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('cima_session');
      localStorage.removeItem('cima_session');
      sessionStorage.removeItem('cima_token');
      localStorage.removeItem('cima_token');
      window.location.href = '/login';
    }
    throw new Error('No autorizado');
  }

  return res;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiRequest(path, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export { API_URL };
