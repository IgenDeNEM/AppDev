import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !user.isAdmin) {
    return <Navigate to="/user" />;
  }

  return children;
};

export default ProtectedRoute;