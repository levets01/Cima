import { useSummary } from '@/hooks/useStorage';
import { formatCurrency } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Banknote, TrendingUp, AlertCircle, FileText, Sheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MonthlyChart } from '@/components/charts/MonthlyChart';
import { RankBars } from '@/components/charts/RankBars';
import { StatusDonut } from '@/components/charts/StatusDonut';
import { PALETTE, SERIES_COLORS } from '@/components/charts/EChart';

const COLORS = SERIES_COLORS;

export function ReportsPage() {
  const { data: summary, monthly, year, setYear } = useSummary();

  const statusDistribution = [
    { name: 'Activos', value: summary.activeLoans, color: COLORS[0] },
    { name: 'En seguimiento', value: summary.loansInFollowUp, color: COLORS[1] },
    { name: 'Capital pagado', value: summary.loansCapitalPaid, color: COLORS[2] },
    { name: 'Falta fecha', value: summary.loansMissingDate, color: PALETTE.gold },
  ];

  const totals = [
    { name: 'Capital prestado', value: summary.totalLent, color: PALETTE.wine },
    { name: 'Capital recuperado', value: summary.capitalRecovered, color: PALETTE.pink },
    { name: 'Réditos cobrados', value: summary.interestCollected, color: PALETTE.blush },
  ];

  const risk = [
    { name: 'Réditos vencidos', value: summary.interestOverdueUncollected, color: PALETTE.wine },
    { name: 'Capital en seguimiento', value: summary.capitalInFollowUp, color: PALETTE.pink },
    { name: 'Réditos por cobrar', value: summary.interestPendingCalendar, color: PALETTE.blush },
  ];

  const exportCsv = () => {
    const rows = [
      ['Mes', 'Réditos cobrados', 'Capital recuperado', 'Capital prestado'],
      ...monthly.map((m) => [m.month, m.interestCollected, m.capitalRecovered, m.capitalLent]),
    ];
    const csv = '\ufeff' + rows.map((r) => r.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `reporte-${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Reportes</h1>
          <p className="text-muted-foreground">Indicadores del negocio desde Registro y Pagos</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Año:</span>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="w-20"
          />
          <Button variant="outline" onClick={() => window.print()}>
            <FileText size={16} /> PDF
          </Button>
          <Button onClick={exportCsv}>
            <Sheet size={16} /> Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Banknote size={16} /> Capital total prestado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{formatCurrency(summary.totalLent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Capital recuperado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums text-success">{formatCurrency(summary.capitalRecovered)}</div>
            <div className="text-sm text-muted-foreground mt-1">{summary.capitalRecoveredPct.toFixed(1)}% del capital prestado</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp size={16} /> Réditos cobrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums text-plum">{formatCurrency(summary.interestCollected)}</div>
            <div className="text-sm text-muted-foreground mt-1">Ganancia real (no incluye capital)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle size={16} /> Rentabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums text-success">{summary.profitabilityPct.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground mt-1">Réditos cobrados ÷ capital prestado</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Movimiento mensual ({year})</CardTitle></CardHeader>
          <CardContent className="h-80"><MonthlyChart data={monthly} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Totales del negocio</CardTitle></CardHeader>
          <CardContent className="h-80"><RankBars data={totals} /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Indicadores de riesgo</CardTitle></CardHeader>
          <CardContent className="h-72"><RankBars data={risk} horizontal /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Distribución por estado</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-52 w-full"><StatusDonut data={statusDistribution} /></div>
            <div className="mt-4 w-full space-y-2">
              {statusDistribution.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />{d.name}
                  </span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
