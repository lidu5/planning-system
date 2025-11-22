import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ExecutiveRoute({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const role = (user?.role || '').toUpperCase();
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'EXECUTIVE') return <Navigate to="/" replace />;
  return <>{children}</>;
}
