import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';
import { UploadPage } from './pages/UploadPage';
import { SecurityCenterPage } from './pages/SecurityCenterPage';
import { DuplicateDetectionPage } from './pages/DuplicateDetectionPage';
import { IntegrityVerificationPage } from './pages/IntegrityVerificationPage';
import { ExtractionResultsPage } from './pages/ExtractionResultsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner text="Checking zero-trust session..." size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !isLoading && isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <UploadPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <SecurityCenterPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/duplicates"
        element={
          <ProtectedRoute>
            <DuplicateDetectionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/integrity"
        element={
          <ProtectedRoute>
            <IntegrityVerificationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/extractions"
        element={
          <ProtectedRoute>
            <ExtractionResultsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents/:id"
        element={
          <ProtectedRoute>
            <DocumentDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <ApprovalsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <AuditPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
