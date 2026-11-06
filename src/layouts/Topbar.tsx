import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, Search } from 'lucide-react';
import { useUIStore } from '@/hooks/useStore';
import { apiJson } from '@/lib/api';
import type { Payment } from '@/types';

export function Topbar() {
  const navigate = useNavigate();
  const { setSidebarOpen } = useUIStore();
  const [q, setQ] = useState('');
  const [toReview, setToReview] = useState(0);

  useEffect(() => {
    apiJson<Payment[]>('/payments').then((payments) => {
      setToReview(payments.filter((p) => (p.review ?? '').startsWith('⚠')).length);
    }).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-background/80 px-4 backdrop-blur-xl md:px-8">
      <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground md:hidden" aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      <form
        className="relative max-w-md flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(`/prestamos${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
        }}
      >
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar préstamos, clientes..."
          aria-label="Buscar cliente o préstamo"
          className="h-10 w-full rounded-lg border border-transparent bg-muted pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:bg-card focus:ring-1 focus:ring-ring"
        />
      </form>
      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => navigate('/pagos')}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label={`Pagos por revisar: ${toReview}`}
          title="Pagos por revisar"
        >
          <Bell size={19} />
          {toReview > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-primary-foreground">
              {toReview}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
