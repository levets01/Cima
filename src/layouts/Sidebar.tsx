import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, CreditCard, CalendarDays, BarChart3, Settings, LogOut } from 'lucide-react';
import { useUIStore } from '@/hooks/useStore';
import { useEffect } from 'react';
import { Logo } from '@/components/Logo';

const NAV_ITEMS = [
  { path: '/', label: 'Resumen', icon: Home },
  { path: '/prestamos', label: 'Registro', icon: FileText },
  { path: '/pagos', label: 'Pagos', icon: CreditCard },
  { path: '/periodos', label: 'Periodos', icon: CalendarDays },
  { path: '/reportes', label: 'Reportes', icon: BarChart3 },
  { path: '/configuracion', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [setSidebarOpen]);

  const go = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button onClick={() => go('/')} className="flex items-center gap-3.5 px-6 pb-6 pt-8 text-left" aria-label="Ir al resumen">
          <Logo size={40} className="shrink-0" />
          <div>
            <div className="font-display text-3xl font-semibold leading-none tracking-tight text-primary">Cima</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-sidebar-muted">Préstamos</div>
          </div>
        </button>

        <nav className="flex-1 space-y-1 px-4 pt-6" aria-label="Principal">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => go(path)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-sidebar-active text-primary' : 'text-sidebar-muted hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2 : 1.6} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
              C
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-semibold">Mi cuenta</div>
              <div className="text-xs text-sidebar-muted">Administradora</div>
            </div>
          </div>
          <button
            onClick={() => go('/logout')}
            className="mt-4 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-sidebar-muted hover:bg-muted hover:text-foreground"
          >
            <LogOut size={18} strokeWidth={1.8} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-foreground/30 md:hidden" onClick={() => setSidebarOpen(false)} />}
    </>
  );
}
