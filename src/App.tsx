import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import DiagnosticoAgoraPage from './pages/DiagnosticoAgoraPage';

// Novas páginas de autenticação e sorteio ao vivo
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboardPage from './pages/UserDashboardPage';
import LiveRafflePage from './pages/LiveRafflePage';
import FreeRafflesPage from './pages/FreeRafflesPage';


import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import UserProtectedRoute from './components/ProtectedRoute';
import AdminRedirect from './components/shared/AdminRedirect';

function AppContent() {
  const { user, loading } = useAuth();

  // Mostrar loading enquanto verifica a sessão
  if (loading) {
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
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/winners" element={<WinnersPage />} />
          <Route path="/my-numbers" element={<MyNumbersPage />} />
          <Route path="/live-games" element={<LiveGamesPage />} />
          <Route path="/live-games/:gameId" element={<LiveParticipationPage />} />
          
          {/* Novas rotas de autenticação */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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

          {/* Rotas públicas de live streaming */}
          <Route path="/live/:channelName" element={<PublicLiveStreamPage />} />
          
          {/* Rota de diagnóstico do Agora.io */}
          <Route path="/diagnostico-agora" element={<DiagnosticoAgoraPage />} />

          {/* Redirect /admin to /admin/login if not authenticated */}
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </Router>
    </DataProvider>
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