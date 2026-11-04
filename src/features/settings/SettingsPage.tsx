import { useState } from 'react';
import { useConfig } from '@/hooks/useStorage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building, Shield, CreditCard, Clock, AlertTriangle } from 'lucide-react';

export function SettingsPage() {
  const { data: config, update: updateConfig } = useConfig();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const updates: Partial<typeof config> = {
      quincenalRate: parseFloat(formData.get('quincenalRate') as string) || config.quincenalRate,
      monthlyRate: parseFloat(formData.get('monthlyRate') as string) || config.monthlyRate,
      periodsPerLoan: parseInt(formData.get('periodsPerLoan') as string) || config.periodsPerLoan,
      maxLoans: parseInt(formData.get('maxLoans') as string) || config.maxLoans,
      maxPayments: parseInt(formData.get('maxPayments') as string) || config.maxPayments,
    };
    updateConfig(updates);
    setTimeout(() => setIsSaving(false), 800);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Configuración</h1>
          <p className="text-muted-foreground">Parámetros del negocio (hoja Configuración del Excel)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros del negocio</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Shield size={16} className="text-muted-foreground" /> Tasa de rédito quincenal
                    </label>
                    <Input type="number" step="0.01" defaultValue={config.quincenalRate} name="quincenalRate" />
                    <p className="text-xs text-muted-foreground">Porcentaje sobre el capital pendiente en cada período quincenal.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <CreditCard size={16} className="text-muted-foreground" /> Tasa de rédito mensual
                    </label>
                    <Input type="number" step="0.01" defaultValue={config.monthlyRate} name="monthlyRate" />
                    <p className="text-xs text-muted-foreground">Porcentaje sobre el capital pendiente en cada período mensual.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock size={16} className="text-muted-foreground" /> Períodos calculados por préstamo
                    </label>
                    <Input type="number" defaultValue={config.periodsPerLoan} name="periodsPerLoan" />
                    <p className="text-xs text-muted-foreground">El calendario genera hasta este número de períodos por préstamo.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Building size={16} className="text-muted-foreground" /> Capacidad de préstamos
                    </label>
                    <Input type="number" defaultValue={config.maxLoans} name="maxLoans" />
                    <p className="text-xs text-muted-foreground">Filas disponibles en Registro.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <CreditCard size={16} className="text-muted-foreground" /> Capacidad de pagos
                    </label>
                    <Input type="number" defaultValue={config.maxPayments} name="maxPayments" />
                    <p className="text-xs text-muted-foreground">Filas disponibles en Pagos.</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
              <div className="mt-6 p-4 rounded-xl bg-warning-soft border border-warning/20 text-warning text-sm flex items-start gap-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>Si cambias una tasa, se recalculan TODOS los préstamos (también los ya registrados).
                Hazlo solo para préstamos nuevos.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Moneda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <CreditCard size={18} className="text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Peso colombiano (COP)</div>
                  <div className="text-xs text-muted-foreground">Todos los valores en COP</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <Shield size={18} className="text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Modo demostración</div>
                  <div className="text-xs text-muted-foreground">Datos guardados en LocalStorage</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
