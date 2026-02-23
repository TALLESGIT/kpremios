import { useLocation, Outlet } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import Header from '../shared/Header';
import Footer from '../shared/Footer';
import MobileBottomNav from './MobileBottomNav';

const MobileLayout = () => {
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/reset-password', '/forgot-email'].includes(location.pathname);

  // No mobile bottom nav for admin routes or auth routes
  const showBottomNav = !isAdminRoute && !isAuthRoute;
  // Hide footer on native app (it goes to Profile page) and admin routes
  const showFooter = !isAdminRoute && !isNative;

  return (
    <div className={`flex flex-col bg-background ${isNative ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Header />
      <main className={`flex-grow ${isNative ? 'overflow-y-auto' : ''} ${showBottomNav ? 'has-bottom-nav' : ''}`}>
        <Outlet />
        {showFooter && <Footer />}
      </main>
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
};

export default MobileLayout;
