import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useConfig, useLoans } from '@/hooks/useStorage';
import { formatCurrency, formatDate, formatLoanNumber, dateInputToISO, todayDateInput, toDateInput, getRateForModality, type CustomerLoan } from '@/types';
import { Search, Plus } from 'lucide-react';
import { useUIStore } from '@/hooks/useStore';
import { Alert } from '@/components/ui/alert';
import { ImportClients } from './ImportClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/modal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loanSchema = z.object({
  customerName: z.string().trim().min(2, 'Nombre del cliente requerido'),
  loanDate: z.string().min(1, 'Fecha del préstamo requerida'),
  principal: z.coerce.number().min(1, 'Capital requerido'),
  modality: z.enum(['Mensual', 'Quincenal']),
  firstInterestPaymentDate: z.string().optional(),
}).refine((data) => !data.firstInterestPaymentDate || data.firstInterestPaymentDate >= data.loanDate, {
  path: ['firstInterestPaymentDate'], message: 'El primer pago no puede ser anterior al préstamo',
});

type LoanFormData = z.infer<typeof loanSchema>;

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'warning' | 'success' | 'outline'> = {
  'Activo': 'default',
  'En seguimiento': 'destructive',
  'Falta fecha': 'warning',
  'Capital pagado': 'success',
};

export function ClientsList() {
  const { data: loans, loading, error, refetch, create, update, remove } = useLoans();
  const { data: config, loading: configLoading, error: configError } = useConfig();
  const { addToast } = useUIStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema) as any,
    defaultValues: {
      customerName: '',
      loanDate: todayDateInput(),
      principal: 0,
      modality: 'Mensual',
      firstInterestPaymentDate: '',
    },
  });

  const editParam = params.get('editar');
  const initializedRoute = useRef<string | null>(null);
  useEffect(() => {
    const route = `${pathname}?editar=${editParam ?? ''}`;
    if (initializedRoute.current === route) return;
    if (pathname.endsWith('/nuevo')) {
      initializedRoute.current = route;
      setEditingId(null);
      form.reset({ customerName: '', loanDate: todayDateInput(), principal: 0, modality: 'Mensual', firstInterestPaymentDate: '' });
      setSubmitError('');
      setIsModalOpen(true);
    } else if (editParam) {
      const loan = loans.find((l) => l.id === Number(editParam));
      if (loan) {
        initializedRoute.current = route;
        setEditingId(loan.id);
        form.reset({ customerName: loan.customerName, loanDate: toDateInput(loan.loanDate), principal: loan.principal,
          modality: loan.modality, firstInterestPaymentDate: toDateInput(loan.firstInterestPaymentDate) });
        setSubmitError('');
        setIsModalOpen(true);
      }
    } else {
      initializedRoute.current = route;
    }
  }, [pathname, editParam, loans, form]);

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    form.reset();
    setEditingId(null);
    setSubmitError('');
    if (pathname.endsWith('/nuevo') || editParam) navigate('/clientes', { replace: true });
  };

  const openEdit = (loan: CustomerLoan) => {
    setEditingId(loan.id);
    form.reset({ customerName: loan.customerName, loanDate: toDateInput(loan.loanDate), principal: loan.principal,
      modality: loan.modality, firstInterestPaymentDate: toDateInput(loan.firstInterestPaymentDate) });
    setSubmitError('');
    setIsModalOpen(true);
  };

  const filtered = loans.filter((l) => {
    const matchesSearch = l.customerName.toLowerCase().includes(search.toLowerCase()) || String(l.id).includes(search);
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onSubmit = async (data: LoanFormData) => {
    if (saving || configLoading || configError) return;
    setSaving(true);
    setSubmitError('');
    try {
      const existing = loans.find((l) => l.id === editingId);
      const ratePerPeriod = existing?.modality === data.modality
        ? existing.ratePerPeriod : getRateForModality(data.modality, config);
      const fields = {
        customerName: data.customerName.trim(),
        loanDate: dateInputToISO(data.loanDate),
        principal: data.principal,
        modality: data.modality,
        ratePerPeriod,
        interestPerPeriod: data.principal * ratePerPeriod,
        firstInterestPaymentDate: data.firstInterestPaymentDate ? dateInputToISO(data.firstInterestPaymentDate) : null,
      };
      if (editingId) {
        await update(editingId, fields);
      } else {
        await create({ ...fields, capitalPaid: 0, capitalPending: data.principal, interestReceived: 0,
          status: fields.firstInterestPaymentDate ? 'Activo' : 'Falta fecha',
          nextCollection: fields.firstInterestPaymentDate, interestOverdue: 0, daysOverdue: 0 });
      }
      addToast({ title: editingId ? 'Préstamo actualizado' : 'Préstamo registrado', variant: 'success' });
      setIsModalOpen(false);
      form.reset();
      setEditingId(null);
      if (pathname.endsWith('/nuevo') || editParam) navigate('/clientes', { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar el préstamo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (loanToDelete === null || deleting) return;
    setDeleting(true);
    try {
      await remove(loanToDelete);
      setLoanToDelete(null);
      setIsConfirmOpen(false);
      addToast({ title: 'Préstamo eliminado', variant: 'success' });
    } catch (err) {
      addToast({ title: 'No se pudo eliminar', description: err instanceof Error ? err.message : 'Inténtalo de nuevo', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const statItems = [
    { label: 'Total préstamos', value: loans.length, icon: <Plus size={16} /> },
    { label: 'Activos', value: loans.filter(l => l.status === 'Activo').length, icon: <Plus size={16} className="text-success" /> },
    { label: 'En seguimiento', value: loans.filter(l => l.status === 'En seguimiento').length, icon: <Plus size={16} className="text-destructive" /> },
    { label: 'Capital total', value: loans.reduce((s, l) => s + l.principal, 0), icon: <Plus size={16} className="text-primary" /> },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Registro de Préstamos</h1>
          <p className="text-muted-foreground">Listado de todos los préstamos registrados</p>
        </div>
        <Button disabled={configLoading || !!configError} onClick={() => { setEditingId(null); form.reset(); setSubmitError(''); setIsModalOpen(true); }}>
          <Plus size={18} /> Nuevo préstamo
        </Button>
        <Button variant="outline" onClick={() => setIsImportOpen(true)}>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Importar Excel
          </span>
        </Button>
      </div>

      {error && <Alert variant="error" title="No se pudieron cargar los préstamos" description={error} />}
      {configError && <Alert variant="error" title="No se pudo cargar la configuración" description={configError} />}
      {loading && <p role="status" className="text-sm text-muted-foreground">Cargando préstamos...</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {statItems.map((s) => (
          <Card key={s.label} className="border-b-2 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{typeof s.value === 'number' && s.label === 'Capital total' ? formatCurrency(s.value) : s.value}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">{s.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por cliente o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            left={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full lg:w-80">
          <select
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="En seguimiento">En seguimiento</option>
            <option value="Falta fecha">Falta fecha</option>
            <option value="Capital pagado">Capital pagado</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Préstamos registrados</CardTitle>
          <CardDescription>{filtered.length} registro(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha préstamo</TableHead>
                  <TableHead className="text-right">Capital</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{formatLoanNumber(loan.id)}</TableCell>
                    <TableCell>{loan.customerName}</TableCell>
                    <TableCell>{formatDate(loan.loanDate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(loan.principal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(loan.capitalPending)}</TableCell>
                    <TableCell>{loan.modality}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[loan.status] || 'outline'}>
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(loan)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => { setLoanToDelete(loan.id); setIsConfirmOpen(true); }}>Eliminar</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron préstamos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Editar préstamo' : 'Nuevo préstamo'}>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
          {submitError && <Alert variant="error" title="No se pudo guardar" description={submitError} />}
          <fieldset disabled={saving} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="loan-customerName" className="text-sm font-medium">Nombre del cliente</label>
              <Input id="loan-customerName" {...form.register('customerName')} placeholder="Carlos Rodríguez" />
              {form.formState.errors.customerName && <span className="text-xs text-destructive">{form.formState.errors.customerName.message}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="loan-loanDate" className="text-sm font-medium">Fecha del préstamo</label>
              <Input id="loan-loanDate" {...form.register('loanDate')} type="date" />
              {form.formState.errors.loanDate && <span className="text-xs text-destructive">{form.formState.errors.loanDate.message}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="loan-principal" className="text-sm font-medium">Capital prestado ($)</label>
              <Input id="loan-principal" {...form.register('principal')} type="number" min="1" step="0.01" />
              {form.formState.errors.principal && <span className="text-xs text-destructive">{form.formState.errors.principal.message}</span>}
            </div>
            <div className="space-y-2">
              <label htmlFor="loan-modality" className="text-sm font-medium">Modalidad de cobro</label>
              <select id="loan-modality" {...form.register('modality')} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                <option value="Mensual">Mensual</option>
                <option value="Quincenal">Quincenal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="loan-firstInterestPaymentDate" className="text-sm font-medium">Primer pago de réditos</label>
              <Input id="loan-firstInterestPaymentDate" {...form.register('firstInterestPaymentDate')} type="date" />
              {form.formState.errors.firstInterestPaymentDate && <span className="text-xs text-destructive">{form.formState.errors.firstInterestPaymentDate.message}</span>}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" disabled={saving} onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || configLoading || !!configError}>{saving ? 'Guardando...' : 'Guardar préstamo'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => { if (!deleting) setIsConfirmOpen(false); }}
        onConfirm={handleDelete}
        title="Eliminar préstamo"
        description="Se eliminarán el préstamo, sus pagos y su calendario. Esta acción no se puede deshacer."
        confirmLabel={deleting ? 'Eliminando...' : 'Eliminar préstamo'}
        destructive
      />

      {isImportOpen && <ImportClients
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onComplete={() => { void refetch().catch(() => {}); }}
      />}
    </div>
  );
}
