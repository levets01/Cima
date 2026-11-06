import { useParams, useNavigate } from 'react-router-dom';
import { useLoans, usePayments, usePeriods } from '@/hooks/useStorage';
import { formatCurrency, formatDate, formatLoanNumber } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, Activity, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'warning' | 'success' | 'outline'> = {
  'Activo': 'default',
  'En seguimiento': 'destructive',
  'Falta fecha': 'warning',
  'Capital pagado': 'success',
};

const PERIOD_STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'success' | 'outline'> = {
  'Por pagar': 'default',
  'Pendiente vencido': 'destructive',
  'Rédito pagado': 'success',
  'Capital pagado': 'outline',
};

export function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: loans, loading, error } = useLoans();
  const { data: payments } = usePayments();
  const { data: periods } = usePeriods();

  const loanId = id ? parseInt(id) : 0;
  const loan = loans?.find((l) => l.id === loanId);
  const loanPayments = payments?.filter((p) => p.loanId === loanId) || [];
  const loanPeriods = periods?.filter((p) => p.loanId === loanId) || [];

  if (loading) return <p className="p-6" role="status">Cargando préstamo…</p>;
  if (error) return <p className="p-6 text-destructive" role="alert">{error}</p>;
  if (!loan) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold text-foreground">Préstamo no encontrado</h1>
        <Button onClick={() => navigate('/prestamos')}>Volver al registro</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Préstamo {formatLoanNumber(loan.id)}</h1>
          <p className="text-muted-foreground">{loan.customerName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/clientes?editar=${loan.id}`)}>Editar préstamo</Button>
          <Button onClick={() => navigate('/prestamos')}>Volver al registro</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Capital prestado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{formatCurrency(loan.principal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Capital pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-success">{formatCurrency(loan.capitalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Capital pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-destructive">{formatCurrency(loan.capitalPending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Réditos recibidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-plum">{formatCurrency(loan.interestReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Rédito por período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{formatCurrency(loan.interestPerPeriod)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Tasa por período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{(loan.ratePerPeriod * 100).toFixed(0)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Días de atraso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-warning">{loan.daysOverdue}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-4">Fecha</th>
                      <th className="text-right pb-4">Valor</th>
                      <th className="text-left pb-4">Tipo</th>
                      <th className="text-center pb-4">N.º período</th>
                      <th className="text-left pb-4">Nota</th>
                      <th className="text-center pb-4">Revisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanPayments.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-accent/50">
                        <td className="py-3 text-sm">{formatDate(p.paymentDate)}</td>
                        <td className="py-3 text-right">{formatCurrency(p.amount)}</td>
                        <td className="py-3 text-sm">{p.type}</td>
                        <td className="py-3 text-center">{p.periodNumber ?? '-'}</td>
                        <td className="py-3 text-sm text-muted-foreground">{p.note}</td>
                        <td className="py-3 text-center">
                          <Badge variant="outline">{p.review}</Badge>
                        </td>
                      </tr>
                    ))}
                    {loanPayments.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Sin pagos registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Calendario de períodos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-center pb-4">N.º</th>
                    <th className="text-right pb-4">Vencimiento</th>
                    <th className="text-right pb-4">Capital pendiente est.</th>
                    <th className="text-right pb-4">Rédito generado</th>
                    <th className="text-right pb-4">Rédito pagado</th>
                    <th className="text-right pb-4">Rédito pendiente</th>
                    <th className="text-center pb-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loanPeriods.map((period) => (
                    <tr key={period.id} className="border-b hover:bg-accent/50">
                      <td className="py-3 text-center font-medium">{period.periodNumber}</td>
                      <td className="py-3 text-right">{formatDate(period.dueDate)}</td>
                      <td className="py-3 text-right">{formatCurrency(period.capitalPendingEstimated)}</td>
                      <td className="py-3 text-right">{formatCurrency(period.interestGenerated)}</td>
                      <td className="py-3 text-right">{formatCurrency(period.interestPaid)}</td>
                      <td className="py-3 text-right">{formatCurrency(period.interestPending)}</td>
                      <td className="py-3 text-center">
                        <Badge variant={PERIOD_STATUS_VARIANTS[period.status] || 'outline'}>
                          {period.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {loanPeriods.length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Sin períodos generados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Banknote size={16} className="text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Estado del préstamo</div>
            <div className="font-medium">
              <Badge variant={STATUS_VARIANTS[loan.status] || 'outline'}>
                {loan.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Activity size={16} className="text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Próximo cobro</div>
            <div className="font-medium">{formatDate(loan.nextCollection)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ChevronRight size={16} className="text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Réditos vencidos</div>
            <div className="font-medium text-destructive">{formatCurrency(loan.interestOverdue)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
