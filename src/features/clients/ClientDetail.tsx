import { useParams, useNavigate } from 'react-router-dom';
import { useLoans, usePayments } from '@/hooks/useStorage';
import { formatCurrency, formatDate, formatLoanNumber } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'warning' | 'success' | 'outline'> = {
  'Activo': 'default',
  'En seguimiento': 'destructive',
  'Falta fecha': 'warning',
  'Capital pagado': 'success',
};

export function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: loans } = useLoans();
  const { data: payments } = usePayments();

  const loanId = id ? parseInt(id) : 0;
  const loan = loans?.find((l) => l.id === loanId);
  const loanPayments = payments?.filter((p) => p.loanId === loanId) || [];

  if (!loan) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold">Préstamo no encontrado</h1>
        <Button onClick={() => navigate('/prestamos')}>Volver al registro</Button>
      </div>
    );
  }

  const totalLoansAmount = loan.principal;
  const totalBalance = loan.capitalPending;
  const totalPaid = loan.capitalPaid;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>{loan.customerName}</h1>
          <p className="text-muted-foreground">Préstamo {formatLoanNumber(loan.id)}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/prestamos')}>Volver al registro</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Capital prestado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{formatCurrency(totalLoansAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Saldo pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-destructive">{formatCurrency(totalBalance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Capital pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-success">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Préstamo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Estado</span>
                  <Badge variant={STATUS_VARIANTS[loan.status] || 'outline'}>
                    {loan.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Modalidad</span>
                  <span className="font-medium">{loan.modality}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tasa por período</span>
                  <span className="font-medium">{(loan.ratePerPeriod * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rédito por período</span>
                  <span className="font-medium">{formatCurrency(loan.interestPerPeriod)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fecha del préstamo</span>
                  <span className="font-medium">{formatDate(loan.loanDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Primer pago de réditos</span>
                  <span className="font-medium">{formatDate(loan.firstInterestPaymentDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Próximo cobro</span>
                  <span className="font-medium">{formatDate(loan.nextCollection)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Días de atraso</span>
                  <span className="font-medium text-warning">{loan.daysOverdue}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Réditos recibidos</span>
                <span className="font-medium">{formatCurrency(loan.interestReceived)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Réditos vencidos</span>
                <span className="font-medium text-destructive">{formatCurrency(loan.interestOverdue)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Historial de pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-right pb-2">Valor</th>
                    <th className="text-left pb-2">Tipo</th>
                    <th className="text-center pb-2">N.º período</th>
                    <th className="text-center pb-2">Revisión</th>
                  </tr>
                </thead>
                <tbody>
                  {loanPayments.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-accent/50">
                      <td className="py-3 text-sm">{formatDate(p.paymentDate)}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                      <td className="py-3 text-sm">{p.type}</td>
                      <td className="py-3 text-center">{p.periodNumber ?? '-'}</td>
                      <td className="py-3 text-center">
                        <Badge variant="outline">{p.review}</Badge>
                      </td>
                    </tr>
                  ))}
                  {loanPayments.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sin pagos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
