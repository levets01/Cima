import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiJson } from '@/lib/api';
import { formatCurrency, formatDate, dateInputToISO } from '@/types';
import { useUIStore } from '@/hooks/useStore';

type ImportRow = Record<string, unknown>;

interface ImportLoan {
  customerName: string;
  loanDate: string;
  principal: number;
  modality: string;
  ratePerPeriod?: number;
  interestPerPeriod?: number;
  firstInterestPaymentDate: string | null;
}

function importDate(value: unknown, date1904 = false): string {
  if (value == null || value === '') return '';
  let date = String(value).trim();
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value, { date1904 });
    if (!parsed) return '';
    date = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(date);
  if (local) date = `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date)) return '';
  const day = date.slice(0, 10);
  try {
    const iso = dateInputToISO(day);
    return iso.slice(0, 10) === day ? iso : '';
  } catch {
    return '';
  }
}

function normalizeRow(row: ImportRow, date1904: boolean): ImportLoan {
  const firstDate = row.firstInterestPaymentDate ?? row['Primer Pago'] ?? row.primerPago;
  const rawModality = String(row.modality ?? row.Modalidad ?? row.modalidad ?? 'Mensual').trim();
  const modality = rawModality.toLowerCase() === 'mensual' ? 'Mensual'
    : rawModality.toLowerCase() === 'quincenal' ? 'Quincenal' : rawModality;
  return {
    customerName: String(row.customerName ?? row.Cliente ?? row.Nombre ?? row.nombre ?? '').trim(),
    loanDate: importDate(row.loanDate ?? row.Fecha ?? row.Date ?? row.fecha, date1904),
    principal: Number(row.principal ?? row.Capital ?? row.Monto ?? row.capital ?? 0),
    modality,
    ratePerPeriod: row.ratePerPeriod == null ? undefined : Number(row.ratePerPeriod),
    interestPerPeriod: row.interestPerPeriod == null ? undefined : Number(row.interestPerPeriod),
    firstInterestPaymentDate: firstDate == null || firstDate === '' ? null : importDate(firstDate, date1904),
  };
}

export interface ImportClientProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function ImportClients({ isOpen, onClose, onComplete }: ImportClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportLoan[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [reading, setReading] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const { addToast } = useUIStore();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || importing) return;
    setFile(f);
    setPreview([]);
    setErrors([]);
    setWarnings([]);
    setDone(false);
    setReading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const workbook = XLSX.read(ev.target?.result, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) throw new Error('El archivo no contiene hojas.');
        const rows = XLSX.utils.sheet_to_json<ImportRow>(workbook.Sheets[firstSheet], { raw: true });
        if (!rows.length) throw new Error('La hoja no contiene préstamos.');
        const date1904 = !!workbook.Workbook?.WBProps?.date1904;
        setPreview(rows.map((row) => normalizeRow(row, date1904)));
      } catch (err) {
        setErrors([err instanceof Error ? err.message : 'No se pudo leer el archivo. Usa un archivo .xlsx o .csv válido.']);
      } finally {
        setReading(false);
      }
    };
    reader.onerror = () => { setErrors(['No se pudo leer el archivo seleccionado.']); setReading(false); };
    reader.readAsArrayBuffer(f);
  };

  const validate = (rows: ImportLoan[]): string[] => {
    const errs: string[] = [];
    rows.forEach((row, i) => {
      const label = `Fila ${i + 2}`;
      if (!row.customerName) errs.push(`${label}: nombre del cliente requerido`);
      if (!row.loanDate) errs.push(`${label}: fecha inválida; usa una fecha Excel, AAAA-MM-DD o DD/MM/AAAA`);
      if (!Number.isFinite(row.principal) || row.principal <= 0) errs.push(`${label}: capital debe ser mayor a cero`);
      if (row.modality !== 'Mensual' && row.modality !== 'Quincenal') errs.push(`${label}: modalidad inválida; usa Mensual o Quincenal`);
      if (row.firstInterestPaymentDate === '') errs.push(`${label}: fecha de primer pago inválida`);
      if (row.firstInterestPaymentDate && row.loanDate && row.firstInterestPaymentDate < row.loanDate)
        errs.push(`${label}: el primer pago no puede ser anterior al préstamo`);
      if (row.ratePerPeriod != null && (!Number.isFinite(row.ratePerPeriod) || row.ratePerPeriod < 0))
        errs.push(`${label}: tasa inválida`);
      if (row.interestPerPeriod != null && (!Number.isFinite(row.interestPerPeriod) || row.interestPerPeriod < 0))
        errs.push(`${label}: rédito por período inválido`);
    });
    return errs;
  };

  const handleImport = async () => {
    if (importing || reading || done || !preview.length) return;
    const validationErrors = validate(preview);
    setErrors(validationErrors);
    if (validationErrors.length) return;
    setImporting(true);
    try {
      const data = await apiJson<{ created: number; errors?: string[] }>('/loans/import', {
        method: 'POST', body: JSON.stringify({ loans: preview }),
      });
      setCreatedCount(data.created);
      setDone(true);
      setWarnings(data.errors ?? []);
      addToast({ title: 'Importación completada', description: `Se importaron ${data.created} préstamos`, variant: 'success' });
      onComplete?.();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Error al importar los préstamos']);
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-card shadow-2xl rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Importar prestamos desde Excel</h2>
          <Button type="button" variant="outline" size="sm" disabled={importing || reading} onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          <p className="text-sm text-muted-foreground">
            Columnas soportadas: customerName (Cliente), loanDate (Fecha), principal (Capital), modality (Modalidad), ratePerPeriod, interestPerPeriod, firstInterestPaymentDate.
          </p>

          <Input
            type="file"
            disabled={importing || reading || done}
            accept=".xlsx,.csv"
            onChange={handleFile}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          {reading && <p role="status" className="text-sm text-muted-foreground">Leyendo archivo...</p>}
          {file && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="flex items-center gap-1">{file.name}</span>
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/50 p-3">
              <h3 className="text-sm font-semibold text-destructive">Errores de validacion:</h3>
              <ul className="text-sm text-destructive mt-1 list-disc list-inside space-y-1">
                {errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {errors.length > 10 && (
                  <li className="text-xs opacity-70">... y {errors.length - 10} errores mas</li>
                )}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-lg bg-warning/10 border border-warning/50 p-3">
              <h3 className="text-sm font-semibold text-warning">Advertencias:</h3>
              <ul className="text-sm text-warning mt-1 list-disc list-inside space-y-1">
                {warnings.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {warnings.length > 10 && (
                  <li className="text-xs opacity-70">... y {warnings.length - 10} advertencias mas</li>
                )}
              </ul>
            </div>
          )}

          {preview.length > 0 && !done && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                Vista previa ({preview.length} fila(s), mostrando las primeras 20)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-1 text-left">#</th>
                      <th className="px-3 py-1 text-left">Cliente</th>
                      <th className="px-3 py-1 text-left">Fecha</th>
                      <th className="px-3 py-1 text-right">Capital</th>
                      <th className="px-3 py-1 text-left">Modalidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-3 py-1">{i + 1}</td>
                        <td className="px-3 py-1">
                          {row.customerName || '-'}
                        </td>
                        <td className="px-3 py-1">
                          {formatDate(row.loanDate) || 'Fecha inválida'}
                        </td>
                        <td className="px-3 py-1 text-right">
                          {Number.isFinite(row.principal) ? formatCurrency(row.principal) : 'Capital inválido'}
                        </td>
                        <td className="px-3 py-1">
                          {row.modality}
                        </td>
                      </tr>
                    ))}
                    {preview.length > 20 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-1 text-center text-xs text-muted-foreground">
                          ... y {preview.length - 20} fila(s) mas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.length > 0 && !done && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={importing || reading}
                onClick={() => {
                  setPreview([]);
                  setFile(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={importing || reading}
                onClick={handleImport}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {importing ? 'Importando...' : 'Importar prestamos'}
              </Button>
            </div>
          )}

          {done && (
            <div className="rounded-lg bg-success/10 border border-success/50 p-3">
              <h3 className="text-sm font-semibold text-success">!Importacion completada!</h3>
              <p className="text-xs text-success/80 mt-1">
                Se registraron {createdCount} préstamos correctamente.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          {!done && (
            <Button type="button" variant="outline" disabled={importing || reading} onClick={onClose}>
              Cerrar
            </Button>
          )}
          {done && (
            <Button type="button" variant="default" disabled={importing || reading} onClick={onClose}>
              Listo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
