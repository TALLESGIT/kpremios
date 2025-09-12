import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminApprovalsPage from './pages/AdminApprovalsPage';
import AdminRafflesPage from './pages/AdminRafflesPage';
import WinnersPage from './pages/WinnersPage';
import MyNumbersPage from './pages/MyNumbersPage';
import TestAdminPage from './pages/TestAdminPage';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AdminRedirect from './components/shared/AdminRedirect';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AdminRedirect />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/winners" element={<WinnersPage />} />
            <Route path="/my-numbers" element={<MyNumbersPage />} />
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
              path="/admin/raffles" 
              element={
                <ProtectedRoute>
                  <AdminRafflesPage />
                </ProtectedRoute>
              } 
            />
            {/* Redirect /admin to /admin/login if not authenticated */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;