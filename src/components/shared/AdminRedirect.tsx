import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

function AdminRedirect() {
  const { loading } = useAuth();
  const { currentUser: currentAppUser } = useData();
  const isAdmin = currentAppUser?.is_admin || false;
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for loading to complete
    if (loading) return;

    // If user is admin and not already on admin dashboard, redirect
    if (isAdmin && currentAppUser) {
      const currentPath = window.location.pathname;
      
      // Only redirect if not already on admin pages
      if (!currentPath.startsWith('/admin')) {
        console.log('Admin detected, redirecting to dashboard...');
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [isAdmin, currentAppUser, loading, navigate]);

  return null; // This component doesn't render anything
}

export default AdminRedirect;
