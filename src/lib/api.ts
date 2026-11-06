import { clearSession, readSession } from './session';
import { useUIStore } from '@/hooks/useStore';

const desktop = typeof window !== 'undefined' ? window.cimaDesktop : undefined;
const API_URL = (desktop?.isDesktop ? desktop.apiUrl : import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (desktop?.isDesktop) headers.set('X-Cima-Desktop-Key', desktop.apiKey);
  const token = readSession()?.token;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  useUIStore.getState().startRequest();
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, headers });
    if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/setup')) {
      clearSession();
      if (window.cimaDesktop?.isDesktop) window.location.hash = '/login';
      else window.location.assign('/login');
      throw new Error('Tu sesión terminó. Inicia sesión de nuevo.');
    }
    return response;
  } catch (error) {
    if (error instanceof TypeError) throw new Error(desktop?.isDesktop
      ? 'No se pudo acceder a los datos de este equipo. Cierra Cima y vuelve a abrirla.'
      : 'No se pudo conectar con el servidor. Comprueba que la API esté en ejecución.');
    throw error;
  } finally {
    useUIStore.getState().finishRequest();
  }
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isRead = !init.method || init.method === 'GET';
  try {
    const response = await apiRequest(path, init);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const details = body?.details?.map((item: { message?: string }) => item.message).filter(Boolean).join('. ');
      throw new Error(details || body?.error || `No se pudo completar la solicitud (${response.status}).`);
    }
    const data = response.status === 204 ? undefined : await response.json();
    if (isRead) useUIStore.getState().setApiError(path, null);
    return data as T;
  } catch (error) {
    if (isRead) useUIStore.getState().setApiError(path, error instanceof Error ? error.message : 'No se pudieron cargar los datos.');
    throw error;
  }
}

export { API_URL };
