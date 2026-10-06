/**
 * components/common/ProtectedRoute.jsx
 * Redireciona para /login se não autenticado ou role incorreto.
 */
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

export default function ProtectedRoute({ children, allowedRole }) {
  const { token, user } = useAuthStore();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    // Redireciona para a área correta do usuário
    return <Navigate to={user.role === 'tech' ? '/tech' : '/viewer'} replace />;
  }

  return children;
}
