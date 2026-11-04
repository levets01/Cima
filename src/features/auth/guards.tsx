import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { auth } from '@/services/auth';

export function RequireAuth() {
  return auth.isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}

export function Logout() {
  const navigate = useNavigate();
  useEffect(() => {
    auth.logout();
    navigate('/login', { replace: true });
  }, [navigate]);
  return null;
}
