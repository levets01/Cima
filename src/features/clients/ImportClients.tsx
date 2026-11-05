import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/types';
import { useLoans } from '@/hooks/useStorage';
import { useUIStore } from '@/hooks/useStore';

export interface ImportClientProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function ImportClients({ isOpen, onClose, onComplete }: ImportClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const { refetch } = useLoans();
  const { addToast } = useUIStore();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setErrors([]);
    setWarnings([]);
    setDone(false);
    setImporting(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      if (!data) return;
      try {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
        setPreview(rows);
      } catch (err) {
        setErrors(['No se pudo leer el archivo. Usa un archivo .xlsx o .csv valido.']);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const normalizeRow = (row: any): any => {
    const rawDate = row.loanDate ?? row.Fecha ?? row.Date ?? row.fecha ?? '';
    let loanDate = '';
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        loanDate = d.toISOString();
      } else {
        loanDate = String(rawDate);
      }
    }

    const rawFirstDate = row.firstInterestPaymentDate ?? row['Primer Pago'] ?? row.primerPago ?? null;
    let firstInterestPaymentDate = null;
    if (rawFirstDate) {
      const d = new Date(rawFirstDate);
      if (!isNaN(d.getTime())) {
        firstInterestPaymentDate = d.toISOString();
      } else {
        firstInterestPaymentDate = String(rawFirstDate);
      }
    }

    const modality = String(row.modality ?? row.Modalidad ?? row.modalidad ?? 'Mensual').trim();

    return {
      customerName: String(row.customerName ?? row.Cliente ?? row.Nombre ?? row.nombre ?? '').trim(),
      loanDate,
      principal: Number(row.principal ?? row.Capital ?? row.Monto ?? row.capital ?? 0),
      modality,
      ratePerPeriod: row.ratePerPeriod != null ? Number(row.ratePerPeriod) : undefined,
      interestPerPeriod: row.interestPerPeriod != null ? Number(row.interestPerPeriod) : undefined,
      firstInterestPaymentDate,
    };
  };

  const validate = (rows: any[]): { errors: string[]; warnings: string[] } => {
    const errs: string[] = [];
    const warns: string[] = [];
    rows.forEach((row, i) => {
      if (!row.customerName) errs.push(`Fila ${i + 1}: nombre del cliente requerido`);
      if (!row.loanDate) errs.push(`Fila ${i + 1}: fecha del prestamo requerida`);
      if (!row.principal || row.principal <= 0) errs.push(`Fila ${i + 1}: capital debe ser mayor a 0`);
      const m = String(row.modality ?? row.Modalidad ?? row.modalidad ?? '').trim();
      if (m && m !== 'Mensual' && m !== 'Quincenal') {
        warns.push(`Fila ${i + 1}: modalidad '${m}' no soportada, se omitira (usa Mensual o Quincenal)`);
      }
    });
    return { errors: errs, warnings: warns };
  };

  const handleImport = async () => {
    const rows = preview.map(normalizeRow);
    const { errors: valErrors, warnings: valWarnings } = validate(rows);
    setWarnings(valWarnings);

    // Filtrar filas con modalidad no soportada antes de enviar
    const validRows = rows.filter((row) => {
      const m = String(row.modality ?? '').trim();
      return m === 'Mensual' || m === 'Quincenal';
    });

    if (valErrors.length) {
      setErrors(valErrors);
      return;
    }

    if (validRows.length === 0) {
      setErrors(['No hay filas validas para importar (todas tienen modalidad no soportada)']);
      return;
    }

    setImporting(true);
    try {
      const API_BASE = 'http://localhost:4000/api';
      const res = await fetch(`${API_BASE}/loans/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(sessionStorage.getItem('cima_token') ?? localStorage.getItem('cima_token')) ?? ''}`,
        },
        body: JSON.stringify({ loans: validRows }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      setDone(true);
      setImporting(false);
      addToast({
        title: 'Importacion completada',
        description: `Se importaron ${data.created ?? validRows.length} prestamos`,
        variant: 'success',
      });
      refetch();
      onComplete?.();
    } catch (err: any) {
      setImporting(false);
      setErrors([err.message || 'Error al importar los prestamos']);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-card shadow-2xl rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Importar prestamos desde Excel</h2>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          <p className="text-sm text-muted-foreground">
            Columnas soportadas: customerName (Cliente), loanDate (Fecha), principal (Capital), modality (Modalidad), ratePerPeriod, interestPerPeriod, firstInterestPaymentDate.
          </p>

          <Input
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFile}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
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
                          {row.customerName || row.Cliente || row.Nombre || '-'}
                        </td>
                        <td className="px-3 py-1">
                          {row.loanDate || row.Fecha || row.Date || '-'}
                        </td>
                        <td className="px-3 py-1 text-right">
                          {formatCurrency(Number(row.principal || row.Capital || row.Monto || 0))}
                        </td>
                        <td className="px-3 py-1">
                          {row.modality || row.Modalidad || row.modalidad || 'Mensual'}
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
                onClick={() => {
                  setPreview([]);
                  setFile(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={importing}
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
                Los prestamos se han registrado correctamente.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          {!done && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          )}
          {done && (
            <Button type="button" variant="default" onClick={onClose}>
              Listo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
