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
  
  // Check if user is admin
  const isAdmin = currentAppUser?.is_admin || false;

  // Show loading if auth is still loading or data is still loading
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500/30 border-t-amber-500"></div>
      </div>
    );
  }

  // If we have a user but no currentAppUser yet, wait a bit more
  if (user && !currentAppUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Carregando dados do usuário...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {

    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;