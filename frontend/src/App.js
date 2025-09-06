import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to={user.isAdmin ? "/admin" : "/user"} /> : <Login />} 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/user" 
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to={user ? (user.isAdmin ? "/admin" : "/user") : "/login"} />} 
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </CustomThemeProvider>
  );
}

export default App;