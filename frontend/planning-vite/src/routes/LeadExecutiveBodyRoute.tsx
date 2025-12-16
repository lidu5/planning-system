import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LeadExecutiveBodyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'LEAD_EXECUTIVE_BODY' && !user.is_superuser) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default LeadExecutiveBodyRoute;
