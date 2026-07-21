import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

type ProtectedRouteProps = {
  allowedRoles?: string[];
  allowGuest?: boolean;
};

export function ProtectedRoute({ allowedRoles, allowGuest = false }: ProtectedRouteProps) {
  const { isAuthenticated, isGuest, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="py-12 text-center font-semibold text-slate-600" role="status">Loading account...</div>;
  }

  if (!isAuthenticated && !(allowGuest && isGuest)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && (!isAuthenticated || !user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/scenarios" replace />;
  }

  return <Outlet />;
}
