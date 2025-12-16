import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ActivityLogRoute({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isSuper = !!user?.is_superuser;
  if (!token) return <Navigate to="/login" replace />;
  if (!isSuper && role !== 'STRATEGIC_STAFF' && role !== 'EXECUTIVE') return <Navigate to="/" replace />;
  return <>{children}</>;
}
