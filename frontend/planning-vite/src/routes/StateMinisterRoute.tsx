import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function StateMinisterRoute({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const role = (user?.role || '').toUpperCase();
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'STATE_MINISTER') return <Navigate to="/" replace />;
  return <>{children}</>;
}
