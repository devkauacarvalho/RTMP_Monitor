import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';

// Pages — Auth
import LoginPage from './pages/auth/LoginPage';

// Pages — Tech
import TechDashboard from './pages/tech/TechDashboard';
import ClientsPage from './pages/tech/ClientsPage';
import DVRPage from './pages/tech/DVRPage';
import CamerasPage from './pages/tech/CamerasPage';
import UsersPage from './pages/tech/UsersPage';
import SettingsPage from './pages/tech/SettingsPage';

// Pages — Viewer
import ViewerHome from './pages/viewer/ViewerHome';
import CameraDetail from './pages/viewer/CameraDetail';

// Layout
import TechLayout from './components/layout/TechLayout';
import ViewerLayout from './components/layout/ViewerLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

export default function App() {
  const { user } = useAuthStore();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Tech Routes */}
      <Route
        path="/tech"
        element={
          <ProtectedRoute allowedRole="tech">
            <TechLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TechDashboard />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="dvr" element={<DVRPage />} />
        <Route path="cameras" element={<CamerasPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Viewer Routes */}
      <Route
        path="/viewer"
        element={
          <ProtectedRoute allowedRole="viewer">
            <ViewerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ViewerHome />} />
        <Route path="camera/:id" element={<CameraDetail />} />
      </Route>

      {/* Redirect root based on role */}
      <Route
        path="/"
        element={
          user?.role === 'tech' ? <Navigate to="/tech" replace /> :
          user?.role === 'viewer' ? <Navigate to="/viewer" replace /> :
          <Navigate to="/login" replace />
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
