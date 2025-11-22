import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export default function MinisterRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'MINISTER_VIEW') return <Navigate to="/" replace />;
  return <>{children}</>;
}
