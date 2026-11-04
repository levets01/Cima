import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, HandCoins, BarChart3, BadgeCheck, ArrowRight } from 'lucide-react';
import { useSummary, usePayments } from '@/hooks/useStorage';
import { formatCurrency, formatDate } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MonthlyChart } from '@/components/charts/MonthlyChart';
import { Sparkline } from '@/components/charts/Sparkline';
import { StatusDonut } from '@/components/charts/StatusDonut';
import { PALETTE } from '@/components/charts/EChart';

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function Dashboard() {
  const navigate = useNavigate();
  const { data: summary, monthly, year, setYear, refetch } = useSummary();
  const { data: payments, refetch: refetchPayments } = usePayments();

  useEffect(() => {
    refetch();
    refetchPayments();
  }, [refetch, refetchPayments]);

  const sparks = useMemo(() => {
    let lent = 0;
    let interest = 0;
    const profitability = monthly.map((m) => {
      lent += m.capitalLent;
      interest += m.interestCollected;
      return lent === 0 ? 0 : (interest / lent) * 100;
    });
    return {
      lent: monthly.map((m) => m.capitalLent),
      recovered: monthly.map((m) => m.capitalRecovered),
      interest: monthly.map((m) => m.interestCollected),
      profitability,
    };
  }, [monthly]);

  const kpis = [
    { label: 'Capital prestado', value: formatCurrency(summary.totalLent), icon: Banknote, color: PALETTE.wine, data: sparks.lent },
    { label: 'Capital recuperado', value: formatCurrency(summary.capitalRecovered), icon: HandCoins, color: PALETTE.pink, data: sparks.recovered },
    { label: 'Réditos cobrados', value: formatCurrency(summary.interestCollected), icon: BarChart3, color: PALETTE.plum, data: sparks.interest },
    { label: 'Rentabilidad', value: pct(summary.profitabilityPct), icon: BadgeCheck, color: PALETTE.gold, data: sparks.profitability },
  ];

  const totalLoans = summary.activeLoans + summary.loansInFollowUp + summary.loansMissingDate + summary.loansCapitalPaid;
  const onTime = summary.activeLoans + summary.loansCapitalPaid;
  const status = [
    { name: 'Al día', value: onTime, color: PALETTE.wine },
    { name: 'En seguimiento', value: summary.loansInFollowUp, color: PALETTE.pink },
    { name: 'Sin fecha de pago', value: summary.loansMissingDate, color: PALETTE.gold },
  ];
  const share = (v: number) => (totalLoans === 0 ? 0 : Math.round((v / totalLoans) * 100));

  const recent = useMemo(
    () => [...payments].sort((a, b) => (b.paymentDate > a.paymentDate ? 1 : -1)).slice(0, 5),
    [payments]
  );

  const risk = [
    { label: 'Capital por recuperar', value: formatCurrency(summary.capitalPending) },
    { label: '% capital recuperado', value: pct(summary.capitalRecoveredPct) },
    { label: 'Réditos vencidos sin cobrar', value: formatCurrency(summary.interestOverdueUncollected), danger: true },
    { label: 'Réditos pendientes del calendario', value: formatCurrency(summary.interestPendingCalendar) },
    { label: 'Capital en seguimiento', value: formatCurrency(summary.capitalInFollowUp), danger: true },
    { label: 'Préstamos sin fecha de primer pago', value: String(summary.loansMissingDate) },
  ];

  return (
    <div className="space-y-8 p-4 md:p-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1>Resumen</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu negocio de préstamos de un vistazo</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Año</span>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="w-24"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color, data }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-5 pb-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {label}
                <Icon size={17} strokeWidth={1.6} />
              </div>
              <div className="mt-2 truncate text-[28px] font-semibold leading-tight tabular-nums">{value}</div>
              <div className="-mx-5 mt-2 h-12">
                <Sparkline data={data} color={color} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolución financiera ({year})</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <MonthlyChart data={monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado del negocio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <StatusDonut data={status} centerText={`${share(onTime)}%`} centerLabel="Cartera al día" />
            </div>
            <div className="mt-4 space-y-2.5">
              {status.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {d.value} <span className="font-normal text-muted-foreground">· {share(d.value)}%</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Movimientos recientes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pagos')} className="text-primary">
              Ver todos <ArrowRight size={16} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5">Cliente</th>
                    <th className="px-3 py-2.5">Tipo</th>
                    <th className="px-3 py-2.5">Descripción</th>
                    <th className="px-3 py-2.5 text-right">Monto</th>
                    <th className="px-3 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Aún no hay movimientos registrados</td>
                    </tr>
                  )}
                  {recent.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-3 tabular-nums">{formatDate(p.paymentDate)}</td>
                      <td className="px-3 py-3">{p.customerName}</td>
                      <td className="px-3 py-3">
                        {p.type}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{p.note}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">{formatCurrency(p.amount)}</td>
                      <td className="px-3 py-3">
                        {(p.review ?? 'OK') === 'OK' ? <Badge variant="success">Registrado</Badge> : <Badge variant="warning">Por revisar</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indicadores clave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {risk.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={`font-semibold tabular-nums ${r.danger ? 'text-destructive' : ''}`}>{r.value}</span>
              </div>
            ))}
            <Button variant="outline" className="mt-2 w-full" onClick={() => navigate('/reportes')}>
              Ver reportes <ArrowRight size={16} />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
