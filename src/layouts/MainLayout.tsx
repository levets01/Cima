import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useUIStore } from '@/hooks/useStore';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function MainLayout() {
  const { toasts, removeToast, pendingRequests, apiErrors } = useUIStore();
  const errors = [...new Set(Object.values(apiErrors))];
  return (
    <div className="min-h-screen bg-background md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main className="mx-auto max-w-7xl px-0 md:px-4">
          {pendingRequests > 0 && <p role="status" className="px-6 pt-3 text-sm text-muted-foreground">Cargando datos…</p>}
          {errors.length > 0 && (
            <div className="m-4 space-y-2">
              <Alert variant="error" title="No se pudieron cargar todos los datos" description={errors.join(' ')} />
              <Button variant="outline" onClick={() => window.location.reload()}>Volver a intentar</Button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="relative rounded-lg bg-card shadow-lg">
            <Alert variant={toast.variant} title={toast.title} description={toast.description} className="pr-10" />
            <button type="button" aria-label="Cerrar aviso" onClick={() => removeToast(toast.id)} className="absolute right-3 top-3 text-muted-foreground">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
