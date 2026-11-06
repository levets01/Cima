import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { useUIStore } from '@/hooks/useStore';
import { useConfig } from '@/hooks/useStorage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building, Shield, CreditCard, Clock, AlertTriangle, FolderOpen, Download } from 'lucide-react';

export function SettingsPage() {
  const { data: config, loading, error, update: updateConfig } = useConfig();
  const { addToast } = useUIStore();
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [openingDataFolder, setOpeningDataFolder] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const openDataFolder = async () => {
    if (openingDataFolder || !window.cimaDesktop?.openDataFolder) return;
    setOpeningDataFolder(true);
    try {
      await window.cimaDesktop.openDataFolder();
    } catch (err) {
      addToast({ title: 'No se pudo abrir la carpeta de datos',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setOpeningDataFolder(false);
    }
  };

  const backupDatabase = async () => {
    if (backingUp || !window.cimaDesktop?.backupDatabase) return;
    setBackingUp(true);
    try {
      const savedPath = await window.cimaDesktop.backupDatabase();
      if (savedPath) addToast({ title: 'Copia de seguridad guardada',
        description: 'Tus préstamos y pagos se guardaron en la ubicación elegida.', variant: 'success' });
    } catch {
      addToast({ title: 'No se pudo crear la copia de seguridad', description: 'Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setBackingUp(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving || loading || error) return;
    const formData = new FormData(e.currentTarget);
    const values = {
      quincenalRate: Number(formData.get('quincenalRate')) / 100,
      monthlyRate: Number(formData.get('monthlyRate')) / 100,
      periodsPerLoan: Number(formData.get('periodsPerLoan')),
      maxLoans: Number(formData.get('maxLoans')),
      maxPayments: Number(formData.get('maxPayments')),
    };
    if (Object.values(values).some((v) => !Number.isFinite(v)) || values.quincenalRate < 0 || values.monthlyRate < 0 ||
      [values.periodsPerLoan, values.maxLoans, values.maxPayments].some((v) => !Number.isInteger(v) || v <= 0)) {
      setSaveError('Revisa las tasas y escribe cantidades enteras mayores que cero.');
      return;
    }
    const updates: Partial<typeof config> = {};
    for (const key of Object.keys(values) as (keyof typeof values)[]) {
      const baseline = key === 'quincenalRate' || key === 'monthlyRate'
        ? Number((config[key] * 100).toFixed(6)) : config[key];
      if (Number(formData.get(key)) !== baseline) updates[key] = values[key];
    }
    setSaveError('');
    if (!Object.keys(updates).length) {
      addToast({ title: 'No hay cambios por guardar', variant: 'info' });
      return;
    }
    setIsSaving(true);
    try {
      await updateConfig(updates);
      addToast({ title: 'Configuración guardada', variant: 'success' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Configuración</h1>
          <p className="text-muted-foreground">Parámetros del negocio (hoja Configuración del Excel)</p>
        </div>
      </div>

      {error && <Alert variant="error" title="No se pudo cargar la configuración" description={error} />}
      {loading && <p role="status" className="text-sm text-muted-foreground">Cargando configuración...</p>}
      {saveError && <Alert variant="error" title="No se pudo guardar" description={saveError} />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros del negocio</CardTitle>
            </CardHeader>
            <CardContent>
              <form key={JSON.stringify(config)} onSubmit={handleSave} className="space-y-4">
                <fieldset disabled={loading || isSaving || !!error} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="config-quincenalRate" className="text-sm font-medium flex items-center gap-2">
                      <Shield size={16} className="text-muted-foreground" /> Tasa de rédito quincenal (%)
                    </label>
                    <Input type="number" min="0" required step="0.01" defaultValue={Number((config.quincenalRate * 100).toFixed(6))} name="quincenalRate" id="config-quincenalRate" />
                    <p className="text-xs text-muted-foreground">Porcentaje sobre el capital pendiente en cada período quincenal.</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="config-monthlyRate" className="text-sm font-medium flex items-center gap-2">
                      <CreditCard size={16} className="text-muted-foreground" /> Tasa de rédito mensual (%)
                    </label>
                    <Input type="number" min="0" required step="0.01" defaultValue={Number((config.monthlyRate * 100).toFixed(6))} name="monthlyRate" id="config-monthlyRate" />
                    <p className="text-xs text-muted-foreground">Porcentaje sobre el capital pendiente en cada período mensual.</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="config-periodsPerLoan" className="text-sm font-medium flex items-center gap-2">
                      <Clock size={16} className="text-muted-foreground" /> Períodos calculados por préstamo
                    </label>
                    <Input type="number" min="1" step="1" required defaultValue={config.periodsPerLoan} name="periodsPerLoan" id="config-periodsPerLoan" />
                    <p className="text-xs text-muted-foreground">El calendario genera hasta este número de períodos por préstamo.</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="config-maxLoans" className="text-sm font-medium flex items-center gap-2">
                      <Building size={16} className="text-muted-foreground" /> Capacidad de préstamos
                    </label>
                    <Input type="number" min="1" step="1" required defaultValue={config.maxLoans} name="maxLoans" id="config-maxLoans" />
                    <p className="text-xs text-muted-foreground">Filas disponibles en Registro.</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="config-maxPayments" className="text-sm font-medium flex items-center gap-2">
                      <CreditCard size={16} className="text-muted-foreground" /> Capacidad de pagos
                    </label>
                    <Input type="number" min="1" step="1" required defaultValue={config.maxPayments} name="maxPayments" id="config-maxPayments" />
                    <p className="text-xs text-muted-foreground">Filas disponibles en Pagos.</p>
                  </div>
                </fieldset>
                <div className="pt-4 border-t border-border">
                  <Button type="submit" disabled={isSaving || loading || !!error}>
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
              <div className="mt-6 p-4 rounded-xl bg-warning-soft border border-warning/20 text-warning text-sm flex items-start gap-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>Cambiar una tasa recalcula el calendario de todos los préstamos de esa modalidad. Los pagos registrados se conservan.</span>
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
                  <div className="text-sm font-medium">Datos del negocio</div>
                  <div className="text-xs text-muted-foreground">Préstamos y pagos guardados en la base de datos</div>
                </div>
              </div>
              {window.cimaDesktop?.backupDatabase && (
                <Button variant="outline" onClick={backupDatabase} disabled={backingUp}>
                  <Download size={16} /> {backingUp ? 'Guardando copia...' : 'Crear copia de seguridad'}
                </Button>
              )}
              {window.cimaDesktop?.openDataFolder && (
                <Button variant="outline" onClick={openDataFolder} disabled={openingDataFolder}>
                  <FolderOpen size={16} /> {openingDataFolder ? 'Abriendo carpeta...' : 'Abrir carpeta de datos'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
