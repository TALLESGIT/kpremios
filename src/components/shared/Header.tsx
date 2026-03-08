import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ZKLogo } from './ZKLogo';
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
      <header className="fixed top-0 left-0 w-full bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 z-[100] shadow-2xl pt-[env(safe-area-inset-top,20px)] md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center group" onClick={closeMenu}>
              <ZKLogo size="md" className="group-hover:scale-105 transition-transform duration-300 drop-shadow-md" />
              <span className="ml-3 text-2xl font-display font-black text-white tracking-tight group-hover:text-accent transition-colors">
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
              <>
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
                  to="/escalacao"
                  className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname === '/escalacao'
                    ? 'text-primary bg-white shadow-lg shadow-white/10 scale-105'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Escalar Time
                </Link>
              </>

              {/* Botão AO VIVO ou Lives Premiadas - dependendo se há live ativa */}
              {currentAppUser && !currentAppUser.is_admin && (
                <>
                  {hasActiveLive ? (
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
                  ) : (
                    <Link
                      to="/live-games"
                      className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname.startsWith('/live-games')
                        ? 'text-primary bg-white shadow-lg shadow-white/10 scale-105'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      Lives Premiadas
                    </Link>
                  )}
                </>
              )}

              {/* Links públicos */}
              <Link
                to="/spotify"
                className={`px-3 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname === '/spotify'
                  ? 'bg-white/10 text-white shadow-sm border border-white/20'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
              >
                Músicas
              </Link>
              <Link
                to="/zk-clips"
                className={`px-3 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname === '/zk-clips'
                  ? 'bg-white/10 text-white shadow-sm border border-white/20'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
              >
                Clipes
              </Link>

              {/* Admin specific navigation links */}
              {currentAppUser?.is_admin && (
                <Link
                  to="/admin/live-stream"
                  className="ml-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 bg-white text-primary hover:bg-gray-100 shadow-lg"
                >
                  Transmitir ao Vivo
                </Link>
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

            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-white hover:bg-white/10 transition-all duration-300"
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
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'
              }`} />

            {/* Slide-out Menu */}
            <div className={`absolute right-0 top-0 h-full w-80 max-w-[85%] bg-[#030712]/95 backdrop-blur-2xl shadow-2xl border-l border-white/10 transform transition-all duration-500 ease-[cubic-bezier(0.32,0,0.67,0)] ${isMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
              }`}>
              {/* Menu Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-blue-600/20 to-transparent pt-[calc(env(safe-area-inset-top,20px)+1.5rem)]">
                <div className="flex items-center">
                  <ZKLogo size="sm" className="mr-3 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                  <span className="text-xl font-display font-black text-white tracking-tight uppercase italic">
                    Menu <span className="text-blue-500">ZK.</span>
                  </span>
                </div>
                <button
                  onClick={closeMenu}
                  className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 border border-white/5"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="p-5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
                <Link
                  to={currentAppUser?.is_admin ? "/admin/dashboard" : "/"}
                  className={`flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic transition-all duration-300 ${(currentAppUser?.is_admin ? location.pathname === '/admin/dashboard' : location.pathname === '/')
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] translate-x-1'
                    : 'text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1'
                    }`}
                  onClick={closeMenu}
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-white/10 group-hover:bg-white/20 transition-colors">
                    🏠
                  </span>
                  Início
                </Link>

                <Link
                  to="/winners"
                  className={`flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic transition-all duration-300 ${location.pathname === '/winners'
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] translate-x-1'
                    : 'text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1'
                    }`}
                  onClick={closeMenu}
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-white/10 transition-colors">
                    🏆
                  </span>
                  Ganhadores
                </Link>

                <Link
                  to="/escalacao"
                  className={`flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic transition-all duration-300 ${location.pathname === '/escalacao'
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] translate-x-1'
                    : 'text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1'
                    }`}
                  onClick={closeMenu}
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-white/10 transition-colors">
                    ⚽
                  </span>
                  Escalar Time
                </Link>

                {/* Botão AO VIVO ou Lives Premiadas no mobile */}
                {currentAppUser && !currentAppUser.is_admin && (
                  <>
                    {hasActiveLive ? (
                      <Link
                        to="/zk-tv"
                        className={`flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic transition-all duration-300 border border-red-500/30 ${location.pathname.startsWith('/zk-tv')
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] translate-x-1'
                          : 'text-white bg-gradient-to-r from-red-600/40 to-red-700/40 hover:from-red-600 hover:to-red-700 hover:translate-x-1'
                          }`}
                        onClick={closeMenu}
                      >
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-white/10">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        </span>
                        Ao Vivo
                      </Link>
                    ) : (
                      <Link
                        to="/live-games"
                        className={`flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic transition-all duration-300 ${location.pathname.startsWith('/live-games')
                          ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] translate-x-1'
                          : 'text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1'
                          }`}
                        onClick={closeMenu}
                      >
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-white/10 transition-colors">
                          🎮
                        </span>
                        Lives Premiadas
                      </Link>
                    )}
                  </>
                )}

                {/* Mobile Admin and Public Links */}
                <div className="py-4 space-y-2 border-t border-white/5 mt-4 pt-6">
                  <p className="px-5 text-[10px] font-black uppercase text-blue-400/50 tracking-[0.2em] mb-3 leading-none italic">Social & Conteúdo</p>
                  <Link to="/spotify" onClick={closeMenu} className="flex items-center px-5 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all hover:translate-x-1 font-bold uppercase tracking-tight italic">
                    <span className="mr-4 text-xl">🎵</span> Músicas
                  </Link>
                  <Link to="/zk-clips" onClick={closeMenu} className="flex items-center px-5 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all hover:translate-x-1 font-bold uppercase tracking-tight italic">
                    <span className="mr-4 text-xl">🎬</span> Clipes
                  </Link>
                  {currentAppUser?.is_admin && (
                    <Link to="/admin/live-stream" onClick={closeMenu} className="flex items-center px-5 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all hover:translate-x-1 font-bold uppercase tracking-tight italic border border-blue-500/20 bg-blue-500/5">
                      <span className="mr-4 text-xl">📡</span> Transmitir ao Vivo
                    </Link>
                  )}
                </div>

                {!user && !currentAppUser && (
                  <div className="pt-6 mt-6 border-t border-white/5 space-y-3">
                    <Link
                      to="/login"
                      className="flex items-center justify-center px-4 py-4 rounded-2xl text-sm font-black uppercase italic text-white border border-white/10 hover:bg-white/10 transition-all tracking-wider"
                      onClick={closeMenu}
                    >
                      Entrar
                    </Link>
                    <Link
                      to="/register"
                      className="flex items-center justify-center px-4 py-4 rounded-2xl text-sm font-black uppercase italic bg-blue-600 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all tracking-wider"
                      onClick={closeMenu}
                    >
                      Cadastrar
                    </Link>
                  </div>
                )}

                {currentAppUser && (
                  <div className="pt-6 mt-6 border-t border-white/5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic text-red-400 hover:text-white hover:bg-red-500/20 transition-all border border-red-500/10 active:scale-95"
                    >
                      <LogOut className="h-5 w-5 mr-4" />
                      Sair da Conta
                    </button>
                  </div>
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