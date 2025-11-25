import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { currentUser: currentAppUser, loading: dataLoading } = useData();
  
  // Check if user is admin (fallback para metadata do auth)
  const isAdmin = currentAppUser?.is_admin || user?.user_metadata?.is_admin || false;



  // Mostrar loading enquanto qualquer dado estiver carregando
  const isLoading = loading || dataLoading || (user && !currentAppUser && !dataLoading);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500/30 border-t-amber-500"></div>
      </div>
    );
  }

  // If no user is authenticated, redirect to login
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // If user is authenticated but not an admin, redirect to login
  if (user && currentAppUser && !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;