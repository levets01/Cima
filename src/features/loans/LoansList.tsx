import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLoans } from '@/hooks/useStorage';
import { formatCurrency, formatDate } from '@/types';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'warning' | 'success' | 'outline'> = {
  'Activo': 'default',
  'En seguimiento': 'destructive',
  'Falta fecha': 'warning',
  'Capital pagado': 'success',
};

export function LoansList() {
  const { data: loans } = useLoans();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');

  const filtered = loans.filter((l) => {
    return l.customerName.toLowerCase().includes(search.toLowerCase()) ||
      String(l.id).includes(search);
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Registro de Préstamos</h1>
          <p className="text-muted-foreground">Listado de todos los préstamos registrados</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/clientes/nuevo')}>
            <span className="flex items-center gap-2">
              <span>+</span> Nuevo préstamo
            </span>
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <Input
          placeholder="Buscar por cliente o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          left={<Search className="w-4 h-4" />}
        />
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
                    <TableCell className="font-medium">#{loan.id}</TableCell>
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
                      <Button size="sm" variant="outline" onClick={() => navigate(`/prestamos/${loan.id}`)}>
                        Ver detalle
                      </Button>
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
    </div>
  );
}
