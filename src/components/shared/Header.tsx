import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Music, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasActiveLive, setHasActiveLive] = useState(false);
  const [hasUserBets, setHasUserBets] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentUser: currentAppUser, clearUserData } = useData();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleNotificationClick = () => {
    if (hasActiveLive) {
      navigate('/zk-tv');
    } else {
      // Opcional: mostrar mensagem que não há live ou ir para notificações
      navigate('/profile');
    }
  };

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

  // Verificar se há live ativa
  useEffect(() => {
    checkActiveLive();

    // Subscription para atualizações em tempo real
    const subscription = supabase
      .channel('live-streams-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_streams'
      }, () => {
        checkActiveLive();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Verificar se usuário tem apostas aprovadas
  useEffect(() => {
    if (user && !currentAppUser?.is_admin) {
      checkUserBets();

      // Subscription para atualizações em tempo real
      const subscription = supabase
        .channel('user-bets-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'pool_bets',
          filter: `user_id=eq.${user.id}`
        }, () => {
          checkUserBets();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setHasUserBets(false);
    }
  }, [user, currentAppUser]);

  const checkUserBets = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('pool_bets')
        .select('id')
        .eq('user_id', user.id)
        .eq('payment_status', 'approved')
        .limit(1)
        .maybeSingle();

      setHasUserBets(!error && data !== null);
    } catch (err) {
      setHasUserBets(false);
    }
  };

  const checkActiveLive = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('id, is_active')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setHasActiveLive(true);
      } else {
        setHasActiveLive(false);
      }
    } catch (err) {
      console.error('Erro ao verificar live:', err);
      setHasActiveLive(false);
    }
  };

  return (
    <>
      <header className="bg-gradient-to-r from-primary via-primary to-primary-dark shadow-2xl sticky top-0 z-50 border-b border-primary-light/30 safe-top-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center group" onClick={closeMenu}>
              <span className="text-2xl mr-2">⚽</span>
              <span className="ml-1 text-2xl font-display font-black text-white tracking-tight group-hover:text-accent transition-colors">
                ZK Oficial
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-4">
              <Link
                to={currentAppUser?.is_admin ? "/admin/dashboard" : "/"}
                className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${(currentAppUser?.is_admin ? location.pathname === '/admin/dashboard' : location.pathname === '/')
                  ? 'text-primary bg-white shadow-lg shadow-white/10 scale-105'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
              >
                Início
              </Link>
              <Link
                to="/winners"
                className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname === '/winners'
                  ? 'text-primary bg-white shadow-lg shadow-white/10 scale-105'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
              >
                Ganhadores
              </Link>

              <Link
                to="/spotify"
                className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname === '/spotify'
                  ? 'text-primary bg-white shadow-lg shadow-white/10 scale-105'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
              >
                Músicas
              </Link>

              {/* Bolão e outros links para usuários */}
              {currentAppUser && !currentAppUser.is_admin && (
                <div className="flex items-center gap-2">
                  {/* Se houver live, mostrar Ao Vivo */}
                  {hasActiveLive && (
                    <Link
                      to="/zk-tv"
                      className={`relative px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 border border-red-500/50 ${location.pathname.startsWith('/zk-tv')
                        ? 'text-white bg-gradient-to-r from-red-600 to-red-700 shadow-lg shadow-red-600/40'
                        : 'text-white bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-500 hover:to-red-600 shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        Ao Vivo
                      </span>
                    </Link>
                  )}
                </div>
              )}

              {/* Admin buttons - Simplified mapping */}
              {currentAppUser && currentAppUser.is_admin && (
                <>
                  <Link
                    to="/admin/live-stream"
                    className="ml-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 bg-white text-primary hover:bg-gray-100 shadow-lg"
                  >
                    Transmitir
                  </Link>
                  <Link
                    to="/admin/spotify"
                    className={`ml-2 px-3 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 relative ${location.pathname.startsWith('/admin/spotify')
                      ? 'bg-white/10 text-white shadow-sm border border-white/20'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    Spotify
                  </Link>
                </>
              )}

              {/* User buttons */}
              {currentAppUser && !currentAppUser.is_admin && (
                <>
                  {/* Botão Minhas Apostas - apenas para usuários que NÃO estão participando do bolão */}
                  {!hasUserBets && (
                    <Link
                      to="/my-numbers"
                      className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 border border-blue-500/50 ${location.pathname === '/my-numbers'
                        ? 'bg-blue-500/20 text-white shadow-lg border-blue-500'
                        : 'text-white hover:bg-blue-500/10 hover:border-blue-500/70'
                        }`}
                    >
                      Minhas Apostas
                    </Link>
                  )}
                </>
              )}

              {/* Login/Register buttons */}
              {!user && !currentAppUser && (
                <div className="flex items-center gap-3 ml-2 pl-2 border-l border-white/10">
                  <Link
                    to="/login"
                    className="px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all duration-300 text-white hover:text-accent hover:bg-white/10"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all duration-300 bg-white text-primary hover:bg-gray-100 shadow-lg hover:shadow-white/20 hover:-translate-y-0.5"
                  >
                    Cadastrar
                  </Link>
                </div>
              )}

              {/* Botão Sair - desktop */}
              {currentAppUser && (
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              )}
            </nav>

            {/* Mobile menu and Notification Bell */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={handleNotificationClick}
                className="p-2 rounded-xl text-white hover:bg-white/10 transition-all duration-300 relative"
                aria-label="Notificações"
              >
                <Bell className={`h-6 w-6 ${hasActiveLive ? 'text-accent animate-pulse' : 'text-white/70'}`} />
                {hasActiveLive && (
                  <span className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </button>

              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-xl text-white hover:bg-white/10 transition-all duration-300"
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
        </div>

        {/* Mobile Navigation Overlay */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-50 md:hidden"
            onClick={closeMenu}
          >
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'
              }`} />

            {/* Slide-out Menu */}
            <div className={`absolute right-0 top-0 h-full w-80 max-w-sm bg-primary-dark shadow-2xl border-l border-white/10 transform transition-all duration-300 ease-out ${isMenuOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
              }`}>
              {/* Menu Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-primary">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⚽</span>
                  <span className="text-xl font-display font-black text-white">
                    ZK Oficial
                  </span>
                </div>
                <button
                  onClick={closeMenu}
                  className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-80px)]">
                <Link
                  to={currentAppUser?.is_admin ? "/admin/dashboard" : "/"}
                  className={`flex items-center px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${(currentAppUser?.is_admin ? location.pathname === '/admin/dashboard' : location.pathname === '/')
                    ? 'bg-white text-primary shadow-lg'
                    : 'text-white hover:bg-white/10'
                    }`}
                  onClick={closeMenu}
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-current/10">
                    🏠
                  </span>
                  Início
                </Link>

                <Link
                  to="/winners"
                  className={`flex items-center px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${location.pathname === '/winners'
                    ? 'bg-white text-primary shadow-lg'
                    : 'text-white hover:bg-white/10'
                    }`}
                  onClick={closeMenu}
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-current/10">
                    🏆
                  </span>
                  Ganhadores
                </Link>

                <Link
                  to="/spotify"
                  className={`flex items-center px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${location.pathname === '/spotify'
                    ? 'bg-white text-primary shadow-lg'
                    : 'text-white hover:bg-white/10'
                    }`}
                  onClick={closeMenu}
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-current/10">
                    <Music className="w-5 h-5" />
                  </span>
                  Músicas
                </Link>

                {/* Links para usuários no mobile */}
                {currentAppUser && !currentAppUser.is_admin && (
                  <>
                    {hasActiveLive && (
                      <Link
                        to="/zk-tv"
                        className={`flex items-center px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 border border-red-500/50 ${location.pathname.startsWith('/zk-tv')
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                          : 'text-white bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-500 hover:to-red-600'
                          }`}
                        onClick={closeMenu}
                      >
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-current/10">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        </span>
                        Ao Vivo
                      </Link>
                    )}
                  </>
                )}

                {/* Mobile Admin Links */}
                {currentAppUser && currentAppUser.is_admin && (
                  <div className="py-2 space-y-2 border-t border-white/10 mt-2 pt-4">
                    <p className="px-4 text-xs font-bold uppercase text-white/50 tracking-wider mb-2">Administração</p>
                    <Link to="/admin/live-stream" onClick={closeMenu} className="flex items-center px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-lg">
                      <span className="mr-3">📡</span> Transmitir
                    </Link>
                    <Link to="/admin/spotify" onClick={closeMenu} className="flex items-center px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-lg">
                      <span className="mr-3">🎵</span> Spotify
                    </Link>
                  </div>
                )}

                {!user && !currentAppUser && (
                  <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
                    <Link
                      to="/login"
                      className="flex items-center justify-center px-4 py-3 rounded-xl text-base font-bold text-white border border-white/20 hover:bg-white/10 transition-all"
                      onClick={closeMenu}
                    >
                      Entrar
                    </Link>
                    <Link
                      to="/register"
                      className="flex items-center justify-center px-4 py-3 rounded-xl text-base font-bold bg-white text-primary shadow-lg hover:bg-gray-100 transition-all"
                      onClick={closeMenu}
                    >
                      Cadastrar
                    </Link>
                  </div>
                )}

                {currentAppUser && (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 mt-4 rounded-xl text-base font-bold text-red-100 hover:text-white hover:bg-red-500/20 transition-all border border-red-500/20"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
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
