import { useState } from 'react';
import { usePayments, useLoans } from '@/hooks/useStorage';
import { formatCurrency, formatDate, formatLoanNumber, dateInputToISO, todayDateInput } from '@/types';
import { Alert } from '@/components/ui/alert';
import { useUIStore } from '@/hooks/useStore';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function PaymentsList() {
  const { data: payments, loading, error, create } = usePayments();
  const { addToast } = useUIStore();
  const [saving, setSaving] = useState(false);
  const { data: loansData } = useLoans();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    loanId: '',
    paymentDate: todayDateInput(),
    amount: '',
    type: 'Capital' as 'Capital' | 'Rédito',
    periodNumber: '',
    note: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = payments.filter((p) => {
    return p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      String(p.loanId).includes(search);
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.loanId) e.loanId = 'Selecciona un préstamo';
    if (!formData.paymentDate) e.paymentDate = 'Fecha requerida';
    if (!Number.isFinite(Number(formData.amount)) || Number(formData.amount) <= 0) e.amount = 'Monto requerido';
    if (!formData.type) e.type = 'Tipo requerido';
    if (formData.type === 'Rédito' && (!Number.isInteger(Number(formData.periodNumber)) || Number(formData.periodNumber) <= 0))
      e.periodNumber = 'N.º período requerido para Rédito';
    const loan = loansData.find((l) => l.id === Number(formData.loanId));
    if (loan && formData.type === 'Capital' && Number(formData.amount) > loan.capitalPending)
      e.amount = `El monto supera el capital pendiente (${formatCurrency(loan.capitalPending)})`;
    if (loan && formData.paymentDate < loan.loanDate.slice(0, 10))
      e.paymentDate = 'La fecha no puede ser anterior al préstamo';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    try {
      await create({
        loanId: Number(formData.loanId),
        paymentDate: dateInputToISO(formData.paymentDate),
        amount: Number(formData.amount),
        type: formData.type,
        periodNumber: formData.type === 'Rédito' ? Number(formData.periodNumber) : null,
        note: formData.note,
      });
      setFormData({ loanId: '', paymentDate: todayDateInput(), amount: '', type: 'Capital', periodNumber: '', note: '' });
      setIsModalOpen(false);
      addToast({ title: 'Pago registrado', variant: 'success' });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo registrar el pago' });
    } finally {
      setSaving(false);
    }
  };

  const statItems = [
    { label: 'Total pagos', value: payments.length },
    { label: 'Total recibido', value: payments.reduce((s, p) => s + p.amount, 0) },
    { label: 'Por revisar', value: payments.filter(p => (p.review ?? '').startsWith('⚠')).length },
  ];

  const REVIEW_LABELS: Record<string, string> = {
    OK: 'OK',
    '⚠ Datos incompletos': 'Datos incompletos',
    '⚠ ID no existe': 'ID no existe',
    '⚠ Falta N.º período': 'Falta N.º período',
  };

  const REVIEW_VARIANTS: Record<string, 'default' | 'destructive' | 'success' | 'outline' | 'warning'> = {
    OK: 'success',
    '⚠ Datos incompletos': 'destructive',
    '⚠ ID no existe': 'destructive',
    '⚠ Falta N.º período': 'warning',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Pagos</h1>
          <p className="text-muted-foreground">Registro de pagos con diferenciación de Capital y Rédito</p>
        </div>
        <Button onClick={() => { setErrors({}); setIsModalOpen(true); }}>
          <Plus size={18} /> Nuevo pago
        </Button>
      </div>

      {error && <Alert variant="error" title="No se pudieron cargar los pagos" description={error} />}
      {loading && <p role="status" className="text-sm text-muted-foreground">Cargando pagos...</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statItems.map((s) => (
          <Card key={s.label} className="">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{s.label === 'Total recibido' ? formatCurrency(s.value) : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex-1">
        <Input
          placeholder="Buscar por cliente o ID de préstamo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          left={<Search className="w-4 h-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de pagos</CardTitle>
          <CardDescription>{filtered.length} registro(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID préstamo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">N.º período</TableHead>
                  <TableHead>Revisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{formatLoanNumber(p.loanId)}</TableCell>
                    <TableCell>{p.customerName}</TableCell>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.type}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {p.periodNumber ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={REVIEW_VARIANTS[p.review] || 'outline'}>
                        {REVIEW_LABELS[p.review] || p.review}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron pagos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { if (!saving) setIsModalOpen(false); }} title="Registrar pago">
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          {errors.submit && <Alert variant="error" title="No se pudo registrar el pago" description={errors.submit} />}
          <fieldset disabled={saving} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="payment-loanId" className="text-sm font-medium">Préstamo</label>
              <select
                id="payment-loanId"
                value={formData.loanId}
                onChange={(e) => setFormData({ ...formData, loanId: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccionar préstamo</option>
                {loansData?.map((l) => (
                  <option key={l.id} value={l.id}>{l.customerName} · {formatLoanNumber(l.id)}</option>
                ))}
              </select>
              {errors.loanId && <span className="text-xs text-destructive">{errors.loanId}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="payment-paymentDate" className="text-sm font-medium">Fecha del pago</label>
              <Input
                type="date"
                id="payment-paymentDate"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />
              {errors.paymentDate && <span className="text-xs text-destructive">{errors.paymentDate}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="payment-amount" className="text-sm font-medium">Valor recibido ($)</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                id="payment-amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
              {errors.amount && <span className="text-xs text-destructive">{errors.amount}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="payment-type" className="text-sm font-medium">Tipo de pago</label>
              <select
                id="payment-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Capital' | 'Rédito' })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Capital">Capital</option>
                <option value="Rédito">Rédito</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="payment-periodNumber" className="text-sm font-medium">N.º período</label>
              <Input
                type="number"
                min="1"
                step="1"
                disabled={formData.type !== 'Rédito'}
                id="payment-periodNumber"
                value={formData.periodNumber}
                onChange={(e) => setFormData({ ...formData, periodNumber: e.target.value })}
              />
              {errors.periodNumber && <span className="text-xs text-destructive">{errors.periodNumber}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="payment-note" className="text-sm font-medium">Nota / referencia</label>
              <Input
                id="payment-note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>{saving ? 'Registrando...' : 'Registrar pago'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
