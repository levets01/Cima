import { Alert } from '@/components/ui/alert';
import { useState } from 'react';
import { usePeriods, useLoans } from '@/hooks/useStorage';
import { formatCurrency, formatDate, formatLoanNumber } from '@/types';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'warning' | 'success' | 'outline'> = {
  'Por pagar': 'default',
  'Pendiente vencido': 'destructive',
  'Rédito pagado': 'success',
  'Capital pagado': 'outline',
};

export function PeriodsList() {
  const { data: periods, loading, error } = usePeriods();
  const { data: loansData } = useLoans();
  const [search, setSearch] = useState('');
  const [loanFilter, setLoanFilter] = useState('all');

  let filtered = periods;

  if (loanFilter !== 'all') {
    filtered = periods.filter((p) => p.loanId === parseInt(loanFilter));
  }

  filtered = filtered.filter((p) => {
    return p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      String(p.loanId).includes(search);
  });

  const statItems = [
    { label: 'Total periodos', value: periods.length },
    { label: 'Por pagar', value: periods.filter(p => p.status === 'Por pagar').length },
    { label: 'Vencidos', value: periods.filter(p => p.status === 'Pendiente vencido').length },
    { label: 'Rédito pendiente', value: periods.reduce((s, p) => s + p.interestPending, 0) },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Periodos de Pago</h1>
          <p className="text-muted-foreground">Calendario de vencimientos por préstamo</p>
        </div>
      </div>

      {error && <Alert variant="error" title="No se pudieron cargar los datos" description={error} />}
      {loading && <p role="status" className="text-sm text-muted-foreground">Cargando datos...</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {statItems.map((s) => (
          <Card key={s.label} className="">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{s.label === 'Rédito pendiente' ? formatCurrency(s.value) : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por cliente o préstamo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            left={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full lg:w-80">
          <select
            onChange={(e) => setLoanFilter(e.target.value)}
            value={loanFilter}
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos los préstamos</option>
            {loansData?.map((l) => (
              <option key={l.id} value={l.id}>{l.customerName} · {formatLoanNumber(l.id)}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendario de períodos</CardTitle>
          <CardDescription>{filtered.length} periodo(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID préstamo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">N.º período</TableHead>
                  <TableHead className="text-right">Vencimiento</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead className="text-right">Capital pendiente est.</TableHead>
                  <TableHead className="text-right">Rédito generado</TableHead>
                  <TableHead className="text-right">Rédito pagado</TableHead>
                  <TableHead className="text-right">Rédito pendiente</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{formatLoanNumber(period.loanId)}</TableCell>
                    <TableCell>{period.customerName}</TableCell>
                    <TableCell className="text-center">{period.periodNumber}</TableCell>
                    <TableCell className="text-right">{formatDate(period.dueDate)}</TableCell>
                    <TableCell>{period.modality}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.capitalPendingEstimated)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.interestGenerated)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.interestPaid)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.interestPending)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={STATUS_VARIANTS[period.status] || 'outline'}>
                        {period.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No se encontraron periodos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
