import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Novas páginas de autenticação e sorteio ao vivo
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboardPage from './pages/UserDashboardPage';
import LiveRafflePage from './pages/LiveRafflePage';

import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import UserProtectedRoute from './components/ProtectedRoute';
import AdminRedirect from './components/shared/AdminRedirect';

function AppContent() {
  const { user } = useAuth();
  
  return (
    <DataProvider authUser={user}>
      <Router>
        <AdminRedirect />
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