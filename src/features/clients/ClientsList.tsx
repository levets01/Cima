import { useEffect, useState } from 'react';
import { useLoans } from '@/hooks/useStorage';
import { formatCurrency, formatDate, formatLoanNumber } from '@/types';
import { Search, Plus } from 'lucide-react';
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
  customerName: z.string().min(2, 'Nombre del cliente requerido'),
  loanDate: z.string().min(1, 'Fecha del préstamo requerida'),
  principal: z.coerce.number().min(1, 'Capital requerido'),
  modality: z.enum(['Mensual', 'Quincenal']),
  firstInterestPaymentDate: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanSchema>;

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'warning' | 'success' | 'outline'> = {
  'Activo': 'default',
  'En seguimiento': 'destructive',
  'Falta fecha': 'warning',
  'Capital pagado': 'success',
};

export function ClientsList() {
  const { data: loans, refetch, create, update, remove } = useLoans();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema) as any,
    defaultValues: {
      customerName: '',
      loanDate: new Date().toISOString().split('T')[0],
      principal: 0,
      modality: 'Mensual',
      firstInterestPaymentDate: '',
    },
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  const filtered = loans.filter((l) => {
    const matchesSearch = l.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onSubmit = (data: LoanFormData) => {
    const ratePerPeriod = data.modality === 'Quincenal' ? 0.1 : 0.2;
    const interestPerPeriod = data.principal * ratePerPeriod;
    const capitalPending = data.principal;
    const status = data.firstInterestPaymentDate ? 'Activo' : 'Falta fecha';

    const newLoan = {
      customerName: data.customerName,
      loanDate: data.loanDate,
      principal: data.principal,
      modality: data.modality,
      ratePerPeriod,
      interestPerPeriod,
      firstInterestPaymentDate: data.firstInterestPaymentDate || null,
      capitalPaid: 0,
      capitalPending,
      interestReceived: 0,
      status,
      nextCollection: data.firstInterestPaymentDate || null,
      interestOverdue: 0,
      daysOverdue: 0,
    };

    if (editingId) {
      update(editingId, newLoan);
    } else {
      create(newLoan);
    }
    form.reset();
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleDelete = () => {
    if (loanToDelete !== null) {
      remove(loanToDelete);
      setLoanToDelete(null);
      setIsConfirmOpen(false);
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
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nuevo préstamo
        </Button>
      </div>

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
                      <Button size="sm" variant="outline" onClick={() => setEditingId(loan.id)}>Editar</Button>
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

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); form.reset(); setEditingId(null); }}>
        {editingId ? 'Editar préstamo' : 'Nuevo préstamo'}
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del cliente</label>
              <Input {...form.register('customerName')} placeholder="Carlos Rodríguez" />
              {form.formState.errors.customerName && <span className="text-xs text-destructive">{form.formState.errors.customerName.message}</span>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha del préstamo</label>
              <Input {...form.register('loanDate')} type="date" />
              {form.formState.errors.loanDate && <span className="text-xs text-destructive">{form.formState.errors.loanDate.message}</span>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capital prestado ($)</label>
              <Input {...form.register('principal')} type="number" />
              {form.formState.errors.principal && <span className="text-xs text-destructive">{form.formState.errors.principal.message}</span>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Modalidad de cobro</label>
              <select {...form.register('modality')} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                <option value="Mensual">Mensual</option>
                <option value="Quincenal">Quincenal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Primer pago de réditos</label>
              <Input {...form.register('firstInterestPaymentDate')} type="date" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); form.reset(); setEditingId(null); }}>
              Cancelar
            </Button>
            <Button type="submit">Guardar préstamo</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar préstamo"
        description="¿Estás seguro de que deseas eliminar este préstamo?"
      />
    </div>
  );
}
