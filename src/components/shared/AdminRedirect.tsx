import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function AdminRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for loading to complete
    if (loading) return;

    // Only redirect if user is actually logged in
    if (user) {
      const currentPath = window.location.pathname;
      
      // Only redirect if not already on admin pages and not on login/register pages
      if (!currentPath.startsWith('/admin') && 
          !currentPath.startsWith('/login') && 
          !currentPath.startsWith('/register')) {

        // We'll let the DataProvider handle the admin check
        // This component just ensures we don't redirect unnecessarily
      }
    }
  }, [user, loading, navigate]);

  return null; // This component doesn't render anything
}

export default AdminRedirect;
