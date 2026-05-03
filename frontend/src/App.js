import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Teams from './pages/Teams';
import Resources from './pages/Resources';
import Hospitals from './pages/Hospitals';
import Financial from './pages/Financial';
import Approvals from './pages/Approvals';
import Audit from './pages/Audit';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  return user ? <Navigate to="/" replace /> : children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { background: '#21262d', color: '#e6edf3', border: '1px solid #30363d' }, success: { iconTheme: { primary: '#22c55e', secondary: '#0d1117' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#0d1117' } } }} />
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="reports"   element={<Reports />} />
            <Route path="teams"     element={<Teams />} />
            <Route path="resources" element={<Resources />} />
            <Route path="hospitals" element={<Hospitals />} />
            <Route path="financial" element={<Financial />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="audit"     element={<Audit />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
