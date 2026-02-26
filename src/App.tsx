import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { motion } from 'framer-motion';
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
import LiveGamesPage from './pages/LiveGamesPage';
import LiveParticipationPage from './pages/LiveParticipationPage';
import AdminLiveGamesPage from './pages/AdminLiveGamesPage';
import AdminLiveControlPage from './pages/AdminLiveControlPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminLiveStreamPage from './pages/AdminLiveStreamPage';
import DiagnosticoAgoraPage from './pages/DiagnosticoAgoraPage';
import ReporterPage from './pages/ReporterPage';

// Novas páginas de autenticação e sorteio ao vivo
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboardPage from './pages/UserDashboardPage';
import LiveRafflePage from './pages/LiveRafflePage';
import FreeRafflesPage from './pages/FreeRafflesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForgotEmailPage from './pages/ForgotEmailPage';
import BioEditorPage from './pages/BioEditorPage';
import PublicBioPage from './pages/PublicBioPage';
import ProfilePage from './pages/ProfilePage';

// ZK TV
import ZkTVPage from './pages/ZkTVPage';
import AdminZkTVPage from './pages/admin/AdminZkTVPage';
import PublicLiveStreamPage from './pages/PublicLiveStreamPage';
import ZkClipsPage from './pages/ZkClipsPage';
import EscalacaoPage from './pages/EscalacaoPage';

// Spotify
import SpotifyPage from './pages/SpotifyPage';
import AdminSpotifyPage from './pages/admin/AdminSpotifyPage';

// Banners
import AdminBannersPage from './pages/admin/AdminBannersPage';

// Competições e Tabelas
import CompetitionsPage from './pages/CompetitionsPage';
import StandingsPage from './pages/StandingsPage';


import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/shared/ProtectedRoute';
import UserProtectedRoute from './components/ProtectedRoute';
import { ChatProvider } from './features/chat/ChatProvider';
import { ChatHost } from './features/chat/ChatHost';
import { StreamRegistryProvider, useRegisteredStreamId } from './features/chat/StreamRegistryProvider';
import { PollOverlay } from './features/polls/PollOverlay';
import MobileLayout from './components/layout/MobileLayout';

// Componente ErrorBoundary para capturar falhas críticas no mobile
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("❌ ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          background: 'linear-gradient(to bottom, #005BAA, #001A33)',
          color: 'white',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Opa! Algo deu errado no ZK.</h1>
          <p style={{ marginBottom: '20px', opacity: 0.8 }}>O aplicativo encontrou um erro inesperado na inicialização.</p>
          <pre style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '15px',
            borderRadius: '12px',
            maxWidth: '90%',
            overflow: 'auto',
            fontSize: '11px',
            textAlign: 'left',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '30px',
              padding: '12px 24px',
              background: 'white',
              color: '#005BAA',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente interno que usa o streamId do registry global
// As páginas (ZkTVPage, PublicLiveStreamPage) registram seu streamId via useRegisterStreamId
function GlobalChatAndPollOverlay() {
  const currentStreamId = useRegisteredStreamId();
  return (
    <>
      {/* ChatHost global - renderiza chat no slot ativo usando streamId do registry */}
      <ChatHost />
      {/* PollOverlay global - overlay temporário para enquetes */}
      <PollOverlay streamId={currentStreamId} />
    </>
  );
}

function AppContentInner() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Efeito para gerenciar o estado de loading local com timeout de segurança
  React.useEffect(() => {
    // Se a autenticação terminar, paramos o loading
    if (!authLoading) {
      setLoading(false);
      return;
    }

    // Timeout de segurança: se ficar mais de 4 segundos no loading, 
    // forçamos o encerramento para evitar tela azul/stuck
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Safety timeout reached for App loading state');
        setLoading(false);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [authLoading]);

  // Handler para o botão de voltar no Android (evita sair do app)
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backButtonListener = CapApp.addListener('backButton', () => {
      // Se não estiver na home, tenta voltar no histórico
      if (location.pathname !== '/') {
        navigate(-1);
      } else {
        // Se estiver na raiz, minimiza/sai
        CapApp.exitApp();
      }
    });

    return () => {
      backButtonListener.then(l => l.remove());
    };
  }, [location.pathname, navigate]);

  // Rotas públicas que podem ser acessadas durante o loading
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/forgot-email',
    '/spotify',
    '/zk-tv',
    '/winners',
    '/competicoes',
    '/live-games'
  ];

  // Verificar rota atual usando window.location
  let currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  // LOGS DE DEPURAÇÃO PARA MOBILE
  if (Capacitor.isNativePlatform()) {
    console.log('📱 [Mobile Debug] Path original:', window.location.pathname);
    console.log('📱 [Mobile Debug] URL completa:', window.location.href);
    console.log('📱 [Mobile Debug] Auth Loading:', authLoading);
  }

  // Normalização para Capacitor/Nativo: 
  // O caminho pode vir como /index.html ou começar com file://
  if (currentPath.includes('index.html')) {
    currentPath = '/';
    if (Capacitor.isNativePlatform()) console.log('📱 [Mobile Debug] Path normalizado para /');
  }

  // Verificação mais robusta para rotas públicas (incluindo sub-rotas e normalização mobile)
  const isPublicRoute = React.useMemo(() => {
    // Se não houver path, assume raiz
    if (!currentPath || currentPath === '' || currentPath === '/' || currentPath.includes('index.html')) {
      return true;
    }

    return publicRoutes.some(route =>
      route === '/' ? currentPath === '/' : currentPath.startsWith(route)
    );
  }, [currentPath, publicRoutes]);

  // LOGS DE DEPURAÇÃO PARA MOBILE
  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('📱 [Mobile Debug] Path:', currentPath);
      console.log('📱 [Mobile Debug] isPublicRoute:', isPublicRoute);
      console.log('📱 [Mobile Debug] Auth Loading:', authLoading);
      console.log('📱 [Mobile Debug] User:', user ? user.email : 'None');
    }
  }, [currentPath, isPublicRoute, authLoading, user]);

  // Mostrar loading enquanto verifica a sessão, exceto para rotas públicas
  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </div>


        <motion.div
          className="text-center relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-2xl"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <span className="text-3xl font-black text-white">ZK</span>
          </motion.div>
          <motion.div
            className="flex justify-center mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </motion.div>
          <motion.p
            className="text-white text-lg font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Carregando...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <DataProvider authUser={user}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0a1529', // Mais escuro para combinar com o app
            color: '#FFFFFF',
            borderRadius: '12px', // Reduced border-radius
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 12px', // Reduced padding
            fontSize: '11px', // Reduced font size
            fontWeight: '600', // Slightly reduced font weight
            boxShadow: '0 8px 12px -3px rgba(0, 0, 0, 0.3)', // Slightly reduced shadow
            textTransform: 'uppercase',
            letterSpacing: '0.08em', // Slightly reduced letter spacing
            maxWidth: '80vw', // Reduced max width
          },
          success: {
            icon: <ZKToastIcon />,
            style: {
              background: '#005BAA',
            }
          },
          error: {
            icon: <ZKToastIcon />,
            style: {
              background: '#991B1B', // Vermelho para erro, mas mantendo o ícone azul e branco
            }
          }
        }}
      />
      <StreamRegistryProvider>
        <Routes>
          <Route element={<MobileLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/winners" element={<WinnersPage />} />
            <Route path="/my-numbers" element={<MyNumbersPage />} />
            <Route path="/live-games" element={<LiveGamesPage />} />
            <Route path="/live-games/:gameId" element={<LiveParticipationPage />} />

            {/* Novas rotas de autenticação */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/forgot-email" element={<ForgotEmailPage />} />
            <Route path="/dashboard" element={
              <UserProtectedRoute>
                <UserDashboardPage />
              </UserProtectedRoute>
            } />
            <Route path="/live-raffle" element={
              <UserProtectedRoute>
                <LiveRafflePage />
              </UserProtectedRoute>
            } />
            <Route path="/free-raffles" element={
              <UserProtectedRoute>
                <FreeRafflesPage />
              </UserProtectedRoute>
            } />
            <Route path="/bio-editor" element={
              <UserProtectedRoute>
                <BioEditorPage />
              </UserProtectedRoute>
            } />

            {/* Profile / Configurações */}
            <Route path="/profile" element={
              <UserProtectedRoute>
                <ProfilePage />
              </UserProtectedRoute>
            } />

            <Route path="/zk-tv" element={<ZkTVPage />} />
            <Route path="/live/:channelName" element={<PublicLiveStreamPage />} />
            <Route path="/spotify" element={<SpotifyPage />} />
            <Route path="/zk-clips" element={<ZkClipsPage />} />

            {/* Competições e Tabelas */}
            <Route path="/competicoes" element={<CompetitionsPage />} />
            <Route path="/tabela/:competitionName" element={<StandingsPage />} />
            <Route path="/escalacao" element={<EscalacaoPage />} />

          </Route>

          {/* Rotas de Admin e Ferramentas (Fora do MobileLayout) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/register" element={<AdminRegisterPage />} />
          <Route path="/test-admin" element={<TestAdminPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/approvals"
            element={
              <ProtectedRoute>
                <AdminApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/raffles"
            element={
              <ProtectedRoute>
                <AdminRafflesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/raffles/create"
            element={
              <ProtectedRoute>
                <CreateRafflePageSimple />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/live-games"
            element={
              <ProtectedRoute>
                <AdminLiveGamesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/live-games/:gameId/control"
            element={
              <ProtectedRoute>
                <AdminLiveControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/live-stream"
            element={
              <ProtectedRoute>
                <AdminLiveStreamPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/zk-tv" element={
            <ProtectedRoute>
              <AdminZkTVPage />
            </ProtectedRoute>
          }
          />
          <Route path="/admin/spotify" element={
            <ProtectedRoute>
              <AdminSpotifyPage />
            </ProtectedRoute>
          }
          />

          {/* Link na Bio Público */}
          <Route path="/bio/:slug" element={<PublicBioPage />} />
          <Route
            path="/admin/banners"
            element={
              <ProtectedRoute>
                <AdminBannersPage />
              </ProtectedRoute>
            }
          />

          <Route path="/reporter" element={<ReporterPage />} />
          <Route path="/diagnostico-agora" element={<DiagnosticoAgoraPage />} />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        </Routes>
        <GlobalChatAndPollOverlay />
      </StreamRegistryProvider>
    </DataProvider>
  );
}

function AppContent() {
  return (
    <Router>
      <ChatProvider>
        <AppContentInner />
      </ChatProvider>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;