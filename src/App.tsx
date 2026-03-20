import { Routes, Route, Navigate, useLocation, BrowserRouter as Router } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { ZKToastIcon } from './components/shared/ZKToastIcon';
import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminApprovalsPage from './pages/AdminApprovalsPage';
import AdminRafflesPage from './pages/AdminRafflesPage';
import CreateRafflePageSimple from './pages/admin/CreateRafflePageSimple';
import WinnersPage from './pages/WinnersPage';
import MyNumbersPage from './pages/MyNumbersPage';
import TestAdminPage from './pages/TestAdminPage';
import LoadingDemo from './components/shared/LoadingDemo';
import LiveGamesPage from './pages/LiveGamesPage';
import LiveParticipationPage from './pages/LiveParticipationPage';
import AdminLiveGamesPage from './pages/AdminLiveGamesPage';
import AdminLiveControlPage from './pages/AdminLiveControlPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminLiveStreamPage from './pages/AdminLiveStreamPage';
import AdminZkTVPage from './pages/admin/AdminZkTVPage';
import { useParams } from 'react-router-dom';

// Novas páginas de autenticação e sorteio ao vivo
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboardPage from './pages/UserDashboardPage';
import LiveRafflePage from './pages/LiveRafflePage';
import FreeRafflesPage from './pages/FreeRafflesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForgotEmailPage from './pages/ForgotEmailPage';

// Banners
import AdminBannersPage from './pages/admin/AdminBannersPage';
import ZkTVPage from './pages/ZkTVPage';

// Competições e Tabelas
import CompetitionsPage from './pages/CompetitionsPage';
import StandingsPage from './pages/StandingsPage';
import EscalacaoPage from './pages/EscalacaoPage';

// Spotify e Clips
import SpotifyPage from './pages/SpotifyPage';
import ZkClipsPage from './pages/ZkClipsPage';
import ShopPage from './pages/ShopPage';
import AdminSpotifyPage from './pages/admin/AdminSpotifyPage';
import AdminClipsPage from './pages/admin/AdminClipsPage';

import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import UserProtectedRoute from './components/ProtectedRoute';
import { ChatProvider } from './features/chat/ChatProvider';
import { CartProvider } from './context/CartContext';
import { ChatHost } from './features/chat/ChatHost';
import { StreamRegistryProvider } from './features/chat/StreamRegistryProvider';
import MobileNavigation from './components/shared/MobileNavigation';
import MenuPage from './pages/MenuPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import NotificationsPage from './pages/NotificationsPage';
import { usePushNotifications } from './hooks/usePushNotifications';
import { App as CapacitorApp } from '@capacitor/app';

function ChannelRedirect() {
  const { channelName } = useParams();
  return <Navigate to={`/zk-tv?channel=${channelName}`} replace />;
}

function GlobalChatAndPollOverlay() {
  return (
    <>
      <ChatHost />
    </>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("❌ CRASH NO APP:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-6 text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Ops! Ocorreu um erro.</h1>
          <p className="text-red-200 mb-6 font-mono text-sm max-w-lg overflow-auto">
            {this.state.error?.toString()}
          </p>
          <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-white text-red-900 rounded-full font-bold">REINICIAR APP</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContentInner() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [loadingSafetyTimeout, setLoadingSafetyTimeout] = useState(false);

  usePushNotifications();

  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else CapacitorApp.exitApp();
    });
    return () => { backButtonListener.then(l => l.remove()); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ App: Loading safety timeout atingido');
        setLoadingSafetyTimeout(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  const publicRoutes = ['/', '/index.html', '/login', '/register', '/forgot-password', '/reset-password', '/forgot-email', '/zk-tv', '/winners', '/my-numbers', '/loja'];
  const currentPath = location.pathname.toLowerCase();
  const isPublicRoute = currentPath === '/' || currentPath === '/index.html' ||
                        publicRoutes.some(route => currentPath === route || currentPath.endsWith(route)) ||
                        currentPath.includes('live') || currentPath.includes('zk-tv') || currentPath.includes('media') ||
                        currentPath.includes('loja');

  if (loading && !isPublicRoute && !loadingSafetyTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">

        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div className="text-center relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl mb-8 shadow-2xl"
            animate={{ rotate: [0, 360], scale: [1, 1.05, 1] }}
            transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
          >
            <span className="text-4xl font-black text-white italic tracking-tighter">ZK</span>
          </motion.div>
          <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mb-4 mx-auto">
            <motion.div className="h-full bg-blue-500" animate={{ x: [-200, 200] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
          </div>
          <p className="text-white/60 text-xs font-black uppercase tracking-[0.3em]">Sincronizando Sessão...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <DataProvider authUser={user}>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { background: '#005BAA', color: '#FFFFFF', borderRadius: '12px', border: '2px solid #FFFFFF', padding: '16px 20px', fontSize: '14px', fontWeight: '800' }
      }} />
      <StreamRegistryProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/winners" element={<WinnersPage />} />
          <Route path="/my-numbers" element={<MyNumbersPage />} />
          <Route path="/live-games" element={<LiveGamesPage />} />
          <Route path="/live-games/:gameId" element={<LiveParticipationPage />} />
          <Route path="/loja" element={<ShopPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-email" element={<ForgotEmailPage />} />
          <Route path="/dashboard" element={<UserProtectedRoute><UserDashboardPage /></UserProtectedRoute>} />
          <Route path="/live-raffle" element={<UserProtectedRoute><LiveRafflePage /></UserProtectedRoute>} />
          <Route path="/free-raffles" element={<UserProtectedRoute><FreeRafflesPage /></UserProtectedRoute>} />
          <Route path="/competicoes" element={<CompetitionsPage />} />
          <Route path="/tabela/:competitionName" element={<StandingsPage />} />
          <Route path="/escalacao" element={<EscalacaoPage />} />
          <Route path="/spotify" element={<SpotifyPage />} />
          <Route path="/zk-clips" element={<ZkClipsPage />} />
          <Route path="/zk-tv" element={<ZkTVPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/register" element={<AdminRegisterPage />} />
          <Route path="/test-admin" element={<TestAdminPage />} />
          <Route path="/loading-demo" element={<LoadingDemo />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute><AdminApprovalsPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/raffles" element={<ProtectedRoute><AdminRafflesPage /></ProtectedRoute>} />
          <Route path="/admin/raffles/create" element={<ProtectedRoute><CreateRafflePageSimple /></ProtectedRoute>} />
          <Route path="/admin/live-games" element={<ProtectedRoute><AdminLiveGamesPage /></ProtectedRoute>} />
          <Route path="/admin/live-games/:gameId/control" element={<ProtectedRoute><AdminLiveControlPage /></ProtectedRoute>} />
          <Route path="/admin/live-stream" element={<ProtectedRoute><AdminLiveStreamPage /></ProtectedRoute>} />
          <Route path="/admin/zk-tv" element={<ProtectedRoute><AdminZkTVPage /></ProtectedRoute>} />
          <Route path="/admin/banners" element={<ProtectedRoute><AdminBannersPage /></ProtectedRoute>} />
          <Route path="/admin/spotify" element={<ProtectedRoute><AdminSpotifyPage /></ProtectedRoute>} />
          <Route path="/admin/clips" element={<ProtectedRoute><AdminClipsPage /></ProtectedRoute>} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/termos" element={<TermsOfUsePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/live/:channelName" element={<ChannelRedirect />} />
        </Routes>
        <GlobalChatAndPollOverlay />
        <MobileNavigation />
      </StreamRegistryProvider>
    </DataProvider>
  );
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <ChatProvider>
              <AppContentInner />
            </ChatProvider>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;