import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { useLoans } from '@/hooks/useStorage';
import { formatCurrency, formatDate, formatLoanNumber, type LoanStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

type Filter = 'Todos' | LoanStatus;
const FILTERS: Filter[] = ['Todos', 'Activo', 'En seguimiento', 'Falta fecha', 'Capital pagado'];

const STATUS_STYLE: Record<LoanStatus, string> = {
  Activo: 'bg-accent text-accent-foreground',
  'En seguimiento': 'bg-destructive/10 text-destructive',
  'Falta fecha': 'bg-warning-soft text-warning',
  'Capital pagado': 'bg-success-soft text-success',
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

const Dash = () => <span className="text-muted-foreground/60">—</span>;

export function LoansList() {
  const { data: loans } = useLoans();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [filter, setFilter] = useState<Filter>('Todos');

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter((l) => !q || l.customerName.toLowerCase().includes(q) || String(l.id).toLowerCase().includes(q));
  }, [loans, search]);

  const filtered = useMemo(
    () => (filter === 'Todos' ? searched : searched.filter((l) => l.status === filter)),
    [searched, filter]
  );

  const totals = useMemo(() => {
    const principal = filtered.reduce((sum, l) => sum + l.principal, 0);
    const pending = filtered.reduce((sum, l) => sum + l.capitalPending, 0);
    return { principal, pending, recovered: principal === 0 ? 0 : (principal - pending) / principal };
  }, [filtered]);

  const countFor = (f: Filter) => (f === 'Todos' ? searched.length : searched.filter((l) => l.status === f).length);

  return (
    <div className="space-y-6 p-4 md:p-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1>Registro de préstamos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Todos los préstamos y cuánto falta por recuperar de cada uno</p>
        </div>
        <Button onClick={() => navigate('/clientes/nuevo')}>
          <Plus size={16} /> Nuevo préstamo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {[
          { label: 'Préstamos', value: String(filtered.length) },
          { label: 'Capital prestado', value: formatCurrency(totals.principal) },
          { label: 'Por recuperar', value: formatCurrency(totals.pending), note: `${Math.round(totals.recovered * 100)}% ya recuperado` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="mt-1.5 text-2xl font-semibold tabular-nums">{s.value}</div>
              {s.note && <div className="mt-1 text-[13px] text-muted-foreground">{s.note}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-4 p-6 pb-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente o número"
              aria-label="Buscar por cliente o número"
              className="h-10 w-full rounded-lg border border-transparent bg-muted pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={active}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {f} <span className={active ? 'opacity-80' : 'opacity-60'}>{countFor(f)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <CardContent className="pt-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead className="text-right">Capital</TableHead>
                <TableHead className="w-[190px] text-right">Pendiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10"><span className="sr-only">Detalle</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((loan) => {
                const paid = loan.principal === 0 ? 0 : Math.min(1, Math.max(0, (loan.principal - loan.capitalPending) / loan.principal));
                return (
                  <TableRow key={loan.id} className="cursor-pointer" onClick={() => navigate(`/prestamos/${loan.id}`)}>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                          {initials(loan.customerName)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{loan.customerName}</div>
                          <div className="text-[13px] text-muted-foreground">{formatLoanNumber(loan.id)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{loan.loanDate ? formatDate(loan.loanDate) : <Dash />}</TableCell>
                    <TableCell className="text-muted-foreground">{loan.modality || <Dash />}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(loan.principal)}</TableCell>
                    <TableCell className="text-right">
                      <div className="tabular-nums font-medium">{formatCurrency(loan.capitalPending)}</div>
                      <div className="ml-auto mt-1.5 flex items-center justify-end gap-2" title={`${Math.round(paid * 100)}% recuperado`}>
                        <div className="h-1 w-24 overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${paid * 100}%` }} />
                        </div>
                        <span className="w-8 text-[12px] tabular-nums text-muted-foreground">{Math.round(paid * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[loan.status] ?? 'bg-muted text-muted-foreground'}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {loan.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        aria-label={`Ver detalle del préstamo de ${loan.customerName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/prestamos/${loan.id}`);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filtered.length === 0 && (
            <div className="py-14 text-center">
              <p className="font-medium">No hay préstamos que coincidan</p>
              <p className="mt-1 text-sm text-muted-foreground">Prueba con otro nombre o cambia el estado seleccionado.</p>
              {(search || filter !== 'Todos') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearch('');
                    setFilter('Todos');
                  }}
                >
                  Quitar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
