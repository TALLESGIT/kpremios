import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAdmin, currentAppUser, loading } = useAuth();

  console.log('🔒 ProtectedRoute - user:', user);
  console.log('🔒 ProtectedRoute - currentAppUser:', currentAppUser);
  console.log('🔒 ProtectedRoute - isAdmin:', isAdmin);
  console.log('🔒 ProtectedRoute - loading:', loading);
  console.log('🔒 ProtectedRoute - user exists:', !!user);
  console.log('🔒 ProtectedRoute - isAdmin value:', isAdmin);
  console.log('🔒 ProtectedRoute - will redirect:', !user || !isAdmin);

  // Show loading only if we don't have user data yet
  if (loading && !user) {
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
    console.log('🔒 Redirecting to admin login - user:', !!user, 'isAdmin:', isAdmin);
    return <Navigate to="/admin/login" replace />;
  }

  console.log('🔒 Access granted to admin dashboard');
  return <>{children}</>;
}

export default ProtectedRoute;