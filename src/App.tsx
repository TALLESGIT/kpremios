import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
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
import PublicLiveStreamPage from './pages/PublicLiveStreamPage';
// import DiagnosticoAgoraPage from './pages/DiagnosticoAgoraPage';
// import ReporterPage from './pages/ReporterPage';

// Novas páginas de autenticação e sorteio ao vivo
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboardPage from './pages/UserDashboardPage';
import LiveRafflePage from './pages/LiveRafflePage';
import FreeRafflesPage from './pages/FreeRafflesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForgotEmailPage from './pages/ForgotEmailPage';

// ZK TV
import ZkTVPage from './pages/ZkTVPage';
import AdminZkTVPage from './pages/admin/AdminZkTVPage';

// Banners
import AdminBannersPage from './pages/admin/AdminBannersPage';

// Competições e Tabelas
import CompetitionsPage from './pages/CompetitionsPage';
import StandingsPage from './pages/StandingsPage';


import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import UserProtectedRoute from './components/ProtectedRoute';
import { ChatProvider } from './features/chat/ChatProvider';
import { ChatHost } from './features/chat/ChatHost';
import { StreamIdProvider, useStreamId } from './features/chat/StreamIdProvider';
import { PollOverlay } from './features/polls/PollOverlay';

// Componente interno que usa useStreamId (deve estar dentro do StreamIdProvider)
function GlobalChatAndPollOverlay() {
  const currentStreamId = useStreamId();
  return (
    <>
      {/* ChatHost global - renderiza chat no slot ativo */}
      <ChatHost streamId={currentStreamId} />
      {/* PollOverlay global - overlay temporário para enquetes */}
      <PollOverlay streamId={currentStreamId} />
    </>
  );
}

function AppContentInner() {
  const { user, loading } = useAuth();

  // Rotas públicas que podem ser acessadas durante o loading
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/forgot-email'];
  
  // Verificar rota atual usando window.location (já que ainda não estamos dentro do Router)
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPublicRoute = publicRoutes.includes(currentPath);

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
            background: '#005BAA',
            color: '#FFFFFF',
            borderRadius: '12px',
            border: '2px solid #FFFFFF',
            padding: '16px 20px',
            fontSize: '14px',
            fontWeight: '800',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
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
      <Router>
        <StreamIdProvider>
          <Routes>
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

            <Route path="/zk-tv" element={<ZkTVPage />} />

            {/* Competições e Tabelas */}
            <Route path="/competicoes" element={<CompetitionsPage />} />
            <Route path="/tabela/:competitionName" element={<StandingsPage />} />

            {/* Rotas antigas do admin */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/register" element={<AdminRegisterPage />} />
            <Route path="/test-admin" element={<TestAdminPage />} />
            <Route path="/loading-demo" element={<LoadingDemo />} />
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
            <Route
              path="/admin/zk-tv"
              element={
                <ProtectedRoute>
                  <AdminZkTVPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/banners"
              element={
                <ProtectedRoute>
                  <AdminBannersPage />
                </ProtectedRoute>
              }
            />

            {/* Rotas públicas de live streaming */}
            <Route path="/live/:channelName" element={<PublicLiveStreamPage />} />
            {/* <Route path="/reporter" element={<ReporterPage />} /> */}

            {/* Rota de diagnóstico do Agora.io */}
            {/* <Route path="/diagnostico-agora" element={<DiagnosticoAgoraPage />} /> */}

            {/* Redirect /admin to /admin/login if not authenticated */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          </Routes>
          {/* ChatHost e PollOverlay - renderizados dentro do StreamIdProvider e Router */}
          <GlobalChatAndPollOverlay />
        </StreamIdProvider>
      </Router>
    </DataProvider>
  );
}

function AppContent() {
  return (
    <ChatProvider>
      <AppContentInner />
    </ChatProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;