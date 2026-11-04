import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { ClientsList } from '@/features/clients';
import { LoansList, LoanDetail } from '@/features/loans';
import { PaymentsList } from '@/features/payments';
import { PeriodsList } from '@/features/periods';
import { ReportsPage } from '@/features/reports';
import { LoginPage, RequireAuth, Logout } from '@/features/auth';
import { SettingsPage } from '@/features/settings';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="logout" element={<Logout />} />
        <Route element={<RequireAuth />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="prestamos" element={<LoansList />} />
          <Route path="prestamos/:id" element={<LoanDetail />} />
          <Route path="pagos" element={<PaymentsList />} />
          <Route path="periodos" element={<PeriodsList />} />
          <Route path="reportes" element={<ReportsPage />} />
          <Route path="configuracion" element={<SettingsPage />} />
          <Route path="clientes" element={<ClientsList />} />
          <Route path="clientes/nuevo" element={<ClientsList />} />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
