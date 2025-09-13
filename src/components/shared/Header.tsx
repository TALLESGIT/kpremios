import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import ZKLogo from './ZKLogo';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentAppUser, signOut } = useAuth();
  const { getPendingRequestsCount } = useData();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    await signOut();
    closeMenu();
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin/login');
    } else {
      navigate('/');
    }
  };

  // Carregar contagem de solicitações pendentes para admins
  useEffect(() => {
    if (currentAppUser?.is_admin) {
      loadPendingCount();
    }
  }, [currentAppUser]);

  const loadPendingCount = async () => {
    try {
      const count = await getPendingRequestsCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error loading pending count:', error);
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
              to="/"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                location.pathname === '/' 
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
            
            {/* Admin buttons */}
            {currentAppUser && currentAppUser.is_admin && (
              <>
                <Link
                  to="/admin/approvals"
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                    location.pathname === '/admin/approvals' 
                      ? 'text-green-100 bg-green-500/20 backdrop-blur-sm shadow-lg' 
                      : 'text-slate-300 hover:text-green-400 hover:bg-slate-800/50 backdrop-blur-sm'
                  }`}
                >
                  Aprovações
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
                to="/"
                className={`flex items-center px-4 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
                  location.pathname === '/'
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