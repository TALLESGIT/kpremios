import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ZKLogo } from './ZKLogo';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentUser: currentAppUser, clearUserData } = useData();
  const { getPendingRequestsCount } = useData();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    try {

      // Limpar dados do usuário imediatamente
      clearUserData();
      
      // Fazer logout do Supabase
      await signOut();

      closeMenu();
      
      // Forçar navegação para a página inicial
      navigate('/', { replace: true });
      
    } catch (error) {

      // Mesmo com erro, limpar dados e redirecionar
      clearUserData();
      navigate('/', { replace: true });
    }
  };

  // Carregar contagem de solicitações pendentes para admins
  useEffect(() => {
    if (currentAppUser?.is_admin) {
      loadPendingCount();
    }
  }, [currentAppUser]);

  // Real-time subscription for pending requests count
  useEffect(() => {
    if (!currentAppUser?.is_admin) return;

    const subscription = supabase
      .channel('pending-requests-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'extra_number_requests' 
      }, () => {

        loadPendingCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentAppUser?.is_admin]);

  const loadPendingCount = async () => {
    try {
      const count = await getPendingRequestsCount();
      setPendingCount(count);
    } catch (error) {

    }
  };

  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur-md shadow-2xl sticky top-0 z-50 border-b border-amber-400/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center group" onClick={closeMenu}>
            <ZKLogo size="md" className="group-hover:scale-105 transition-transform duration-300" />
            <span className="ml-3 text-xl font-black bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              ZK Premios
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to={currentAppUser?.is_admin ? "/admin/dashboard" : "/"}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                (currentAppUser?.is_admin ? location.pathname === '/admin/dashboard' : location.pathname === '/')
                  ? 'text-amber-100 bg-amber-500/20 backdrop-blur-sm shadow-lg' 
                  : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm'
              }`}
            >
              Início
            </Link>
            <Link
              to="/winners"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                location.pathname === '/winners' 
                  ? 'text-amber-100 bg-amber-500/20 backdrop-blur-sm shadow-lg' 
                  : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm'
              }`}
            >
              Ganhadores
            </Link>
            
            {/* Live Games - disponível apenas para usuários não-admin */}
            {currentAppUser && !currentAppUser.is_admin && (
              <Link
                to="/live-games"
                className={`relative px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  location.pathname.startsWith('/live-games') 
                    ? 'text-white bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25' 
                    : 'text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-400/30 hover:scale-105'
                }`}
              >
                <span className="flex items-center gap-2">
                  🎮 Lives
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
                </span>
              </Link>
            )}
            
            {/* Admin buttons */}
            {currentAppUser && currentAppUser.is_admin && (
              <>
                <Link
                  to="/admin/approvals"
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 relative ${
                    location.pathname === '/admin/approvals' 
                      ? 'text-green-100 bg-green-500/20 backdrop-blur-sm shadow-lg' 
                      : 'text-slate-300 hover:text-green-400 hover:bg-slate-800/50 backdrop-blur-sm'
                  }`}
                >
                  Aprovações
                  {/* Badge para solicitações pendentes - Desktop */}
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/admin/raffles"
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                    location.pathname === '/admin/raffles' 
                      ? 'text-purple-100 bg-purple-500/20 backdrop-blur-sm shadow-lg' 
                      : 'text-slate-300 hover:text-purple-400 hover:bg-slate-800/50 backdrop-blur-sm'
                  }`}
                >
                  Sorteios
                </Link>
                <Link
                  to="/admin/live-games"
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                    location.pathname.startsWith('/admin/live-games') 
                      ? 'text-red-100 bg-red-500/20 backdrop-blur-sm shadow-lg' 
                      : 'text-slate-300 hover:text-red-400 hover:bg-slate-800/50 backdrop-blur-sm'
                  }`}
                >
                  Lives Admin
                </Link>
                <Link
                  to="/admin/live-stream"
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                    location.pathname.startsWith('/admin/live-stream') 
                      ? 'text-cyan-100 bg-cyan-500/20 backdrop-blur-sm shadow-lg' 
                      : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 backdrop-blur-sm'
                  }`}
                >
                  Transmitir Live
                </Link>

              </>
            )}
            
            {/* User button */}
            {currentAppUser && !currentAppUser.is_admin && (
              <Link
                to="/my-numbers"
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  location.pathname === '/my-numbers' 
                    ? 'text-amber-100 bg-amber-500/20 backdrop-blur-sm shadow-lg' 
                    : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm'
                }`}
              >
                Meus Números
              </Link>
            )}

            {/* Login/Register buttons - apenas quando usuário não estiver logado */}
            {!user && !currentAppUser && (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm"
                >
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-amber-500/25"
                >
                  Cadastrar
                </Link>
              </>
            )}

            {/* Botão Sair - desktop - sempre visível se usuário estiver logado */}
            {currentAppUser && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 text-red-300 hover:text-red-100 hover:bg-red-500/20 backdrop-blur-sm border border-red-500/30 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm transition-all duration-300"
            aria-expanded="false"
          >
            <span className="sr-only">Abrir menu</span>
            {isMenuOpen ? (
              <X className="block h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="block h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 md:hidden"
          onClick={closeMenu}
        >
          {/* Backdrop */}
          <div className={`absolute inset-0 bg-black transition-all duration-300 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0'
          }`} />
          
          {/* Slide-out Menu */}
          <div className={`absolute right-0 top-0 h-full w-80 max-w-sm bg-black shadow-2xl border-l border-amber-400/60 transform transition-all duration-300 ease-out ${
            isMenuOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
          }`}>
            {/* Menu Header */}
            <div className="flex items-center justify-center p-6 border-b border-amber-400/80 relative">
              <div className="flex items-center">
                <ZKLogo size="sm" className="mr-3" />
                <span className="text-lg font-black bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                  ZK Premios
                </span>
              </div>
              <button
                onClick={closeMenu}
                className="absolute right-4 p-2 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 transition-all duration-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Menu Items */}
            <nav className="p-6 space-y-4">
              <Link
                to={currentAppUser?.is_admin ? "/admin/dashboard" : "/"}
                className={`flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
                  (currentAppUser?.is_admin ? location.pathname === '/admin/dashboard' : location.pathname === '/')
                    ? 'text-amber-100 bg-amber-500/20 backdrop-blur-sm shadow-lg'
                    : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm'
                }`}
                onClick={closeMenu}
              >
                <span className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mr-3 text-slate-900 font-black">
                  🏠
                </span>
                Início
              </Link>
              
              <Link
                to="/winners"
                className={`flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
                  location.pathname === '/winners'
                    ? 'text-amber-100 bg-amber-500/20 backdrop-blur-sm shadow-lg'
                    : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm'
                }`}
                onClick={closeMenu}
              >
                <span className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mr-3 text-slate-900 font-black">
                  🏆
                </span>
                Ganhadores
              </Link>
              
              {/* Live Games - botão destacado apenas para usuários não-admin */}
              {currentAppUser && !currentAppUser.is_admin && (
                <Link
                  to="/live-games"
                  className={`relative flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
                    location.pathname.startsWith('/live-games')
                      ? 'text-white bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25'
                      : 'text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-400/30'
                  }`}
                  onClick={closeMenu}
                >
                  <span className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center mr-3 text-slate-900 font-black">
                    🎮
                  </span>
                  Lives
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
                </Link>
              )}
              
              {currentAppUser && !currentAppUser.is_admin && (
                <Link
                  to="/my-numbers"
                  className={`flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
                    location.pathname === '/my-numbers'
                      ? 'text-amber-100 bg-amber-500/20 backdrop-blur-sm shadow-lg'
                      : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm'
                  }`}
                  onClick={closeMenu}
                >
                  <span className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mr-3 text-slate-900 font-black">
                    🔢
                  </span>
                  Meus Números
                </Link>
              )}

              {currentAppUser && currentAppUser.is_admin && (
                <Link
                  to="/admin/approvals"
                  className={`flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
                    location.pathname === '/admin/approvals'
                      ? 'text-amber-100 bg-amber-500/20 backdrop-blur-sm shadow-lg'
                      : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm'
                  }`}
                  onClick={closeMenu}
                >
                  <span className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mr-3 text-slate-900 font-black">
                    ⚡
                  </span>
                  Aprovações
                  {/* Badge para solicitações pendentes */}
                  {pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              )}

              {currentAppUser && currentAppUser.is_admin && (
                <>
                  <Link
                    to="/admin/raffles"
                    className={`flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
                      location.pathname === '/admin/raffles'
                        ? 'text-amber-100 bg-amber-500/20 backdrop-blur-sm shadow-lg'
                        : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                    onClick={closeMenu}
                  >
                    <span className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mr-3 text-slate-900 font-black">
                      🎯
                    </span>
                    Sorteios
                  </Link>
                  <Link
                    to="/admin/live-games"
                    className={`flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
                      location.pathname.startsWith('/admin/live-games')
                        ? 'text-red-100 bg-red-500/20 backdrop-blur-sm shadow-lg'
                        : 'text-slate-300 hover:text-red-400 hover:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                    onClick={closeMenu}
                  >
                    <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3 text-white font-black">
                      🎮
                    </span>
                    Lives Admin
                  </Link>
                  <Link
                    to="/admin/live-stream"
                    className={`flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
                      location.pathname.startsWith('/admin/live-stream')
                        ? 'text-cyan-100 bg-cyan-500/20 backdrop-blur-sm shadow-lg'
                        : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                    onClick={closeMenu}
                  >
                    <span className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center mr-3 text-white font-black">
                      📡
                    </span>
                    Transmitir Live
                  </Link>

                </>
              )}

              {/* Botões de Login/Registro - apenas quando usuário não estiver logado */}
              {!user && !currentAppUser && (
                <>
                  <Link
                    to="/login"
                    className="flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 backdrop-blur-sm"
                    onClick={closeMenu}
                  >
                    <span className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mr-3 text-slate-900 font-black">
                      🔑
                    </span>
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-amber-500/25"
                    onClick={closeMenu}
                  >
                    <span className="w-8 h-8 bg-gradient-to-r from-amber-600 to-amber-700 rounded-lg flex items-center justify-center mr-3 text-white font-black">
                      ✨
                    </span>
                    Cadastrar
                  </Link>
                </>
              )}

              {/* Botão Sair - sempre visível se usuário estiver logado */}
              {currentAppUser && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 text-red-300 hover:text-red-100 hover:bg-red-500/20 backdrop-blur-sm border border-red-500/30"
                >
                  <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3 text-white">
                    <LogOut className="h-4 w-4" />
                  </span>
                  Sair
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
      </header>
      
      {/* Overlay para escurecer o fundo quando menu estiver aberto */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden" />
      )}
    </>
  );
}

export default Header;