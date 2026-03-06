import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const storedToken = localStorage.getItem('auth_token');
  
  // Check both context token and localStorage token
  if (!token && !storedToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
