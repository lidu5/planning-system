import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SuperuserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!user?.is_superuser) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default SuperuserRoute;
