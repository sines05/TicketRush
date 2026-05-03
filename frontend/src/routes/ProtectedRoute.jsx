import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loading from '../components/common/Loading.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const { loading, isAuthenticated, role } = useAuth();

  if (loading) {
    return <Loading title="Đang xác thực..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
