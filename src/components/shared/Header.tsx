import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, ShoppingBag, Store, Bell, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ZKLogo } from './ZKLogo';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabase';
import { CartDrawer } from '../shop/CartDrawer';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasActiveLive, setHasActiveLive] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentUser: currentAppUser, clearUserData, guestClub } = useData();
  const { totalItems, setIsCartOpen } = useCart();
  const [isLandscape, setIsLandscape] = useState(false);
  
  const activeClub = currentAppUser?.club_slug || guestClub;
  const isGalo = activeClub === 'atletico-mg';


  useEffect(() => {
    const checkOrientation = () => {
      // Considera landscape apenas em dispositivos móveis (largura < 1024)
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 1024);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Bloquear scroll do body quando menu estiver aberto
  useEffect(() => {
    if (isMenuOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isMenuOpen]);



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
  }, [currentAppUser?.club_slug, guestClub]);

  // Contar notificações não lidas

  // Contar notificações não lidas
  useEffect(() => {
    if (!user) {
      setUnreadNotifCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);

        if (!error && count !== null) {
          setUnreadNotifCount(count);
        }
      } catch {
        // Tabela pode não existir ainda - sem problema
        setUnreadNotifCount(0);
      }
    };

    fetchUnreadCount();

    // Realtime para notificações
    const notifSub = supabase
      .channel('header-notif-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      notifSub.unsubscribe();
    };
  }, [user]);


  const checkActiveLive = async () => {
    try {
      // ✅ Verificar lives ATIVAS de qualquer clube (neutro)
      const { data, error } = await supabase
        .from('live_streams')
        .select('id, is_active, club_slug')
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


  if (isLandscape) return null;

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-gradient-to-r from-[#030712]/95 via-[#0c1220]/95 to-[#030712]/95 backdrop-blur-xl border-b border-amber-500/15 z-[100] shadow-2xl shadow-amber-900/10 pt-[env(safe-area-inset-top,20px)] md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Redireciona para ZK-TV quando no contexto Galo */}
            <Link to={isGalo ? "/zk-tv" : "/"} className="flex-shrink-0 flex items-center group" onClick={closeMenu}>
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
                  ? 'text-slate-900 bg-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
              >
                Início
              </Link>
              <Link
                to="/winners"
                className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname === '/winners'
                  ? 'text-slate-900 bg-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
              >
                Ganhadores
              </Link>
              <Link
                to="/escalacao"
                className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname === '/escalacao'
                  ? 'text-slate-900 bg-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
              >
                Escalar Time
              </Link>
              <Link
                to="/loja"
                className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname === '/loja'
                  ? 'text-slate-900 bg-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
              >
                Loja
              </Link>

              {/* Botão AO VIVO ou ZK-TV */}
              {!currentAppUser?.is_admin && (
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
                        Zk-TV
                      </span>
                    </Link>
                  ) : (
                  <Link
                    to="/zk-tv"
                    className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 ${location.pathname.startsWith('/zk-tv')
                      ? 'text-slate-900 bg-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    Zk-TV
                  </Link>
                  )}
                </>
              )}



              {/* Admin specific navigation links */}
              {currentAppUser?.is_admin && (
                <Link
                  to="/admin/live-stream"
                  className="ml-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-lg"
                >
                  📡 Transmitir
                </Link>
              )}

              {/* Botão Carrinho - Desktop */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 group"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black italic border-2 border-[#030712] animate-in zoom-in duration-300">
                    {totalItems}
                  </span>
                )}
                <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors" />
              </button>

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
                    className="px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all duration-300 bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-lg shadow-amber-500/20 hover:-translate-y-0.5"
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

              {/* Carrinho mobile movido para a seção mobile (ícones ao lado do hamburger) */}
            </nav>

            {/* Mobile: Perfil + Notificações + Carrinho + Hamburger */}
            <div className="md:hidden flex items-center gap-1">
              {/* Ícone de Notificações (Sino) */}
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black border-2 border-[#030712] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Ícone de Perfil */}
              <button
                onClick={() => navigate(user ? '/dashboard' : '/login')}
                className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
                aria-label="Perfil"
              >
                {currentAppUser ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-[10px] font-black text-white border border-white/20 overflow-hidden shadow-lg shadow-slate-500/20 active:scale-90 transition-transform">
                    {currentAppUser.avatar_url ? (
                      <img src={currentAppUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      currentAppUser.name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 border border-white/10 active:scale-90 transition-transform">
                    <User className="h-4.5 w-4.5" />
                  </div>
                )}
              </button>

               {/* Carrinho */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Carrinho"
              >
                <ShoppingBag className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black border-2 border-[#030712]">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Hamburger Menu */}
              <button
                onClick={toggleMenu}
                className="p-2 rounded-xl text-white hover:bg-white/10 transition-all duration-300"
                aria-expanded={isMenuOpen}
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
      </header>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-[150] md:hidden"
            onClick={closeMenu}
          >
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md transition-all duration-300" 
            />

            {/* Slide-out Menu */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 h-full w-80 max-w-[85%] bg-[#030712]/95 backdrop-blur-2xl shadow-2xl border-l border-white/10 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-slate-700/20 to-transparent pt-[calc(env(safe-area-inset-top,20px)+1.5rem)]">
                <div className="flex items-center">
                  <ZKLogo size="sm" className="mr-3 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
                  <span className="text-xl font-display font-black text-white tracking-tight uppercase italic">
                    Menu <span className="text-amber-400">ZK.</span>
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
              <nav className="flex-1 overflow-y-auto p-5 space-y-2.5 custom-scrollbar pb-[calc(env(safe-area-inset-bottom,20px)+3rem)]">
                <Link
                  to={currentAppUser?.is_admin ? "/admin/dashboard" : "/"}
                  className={`flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic transition-all duration-300 ${(currentAppUser?.is_admin ? location.pathname === '/admin/dashboard' : location.pathname === '/')
                    ? 'bg-slate-700 text-white shadow-[0_0_20px_rgba(51,65,85,0.4)] translate-x-1'
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
                    ? 'bg-slate-700 text-white shadow-[0_0_20px_rgba(51,65,85,0.4)] translate-x-1'
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
                    ? 'bg-slate-700 text-white shadow-[0_0_20px_rgba(51,65,85,0.4)] translate-x-1'
                    : 'text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1'
                    }`}
                  onClick={closeMenu}
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-white/10 transition-colors">
                    ⚽
                  </span>
                  Escalar Time
                </Link>

                <Link
                  to="/loja"
                  className={`flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic transition-all duration-300 ${location.pathname === '/loja'
                    ? 'bg-slate-700 text-white shadow-[0_0_20px_rgba(51,65,85,0.4)] translate-x-1'
                    : 'text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1'
                    }`}
                  onClick={closeMenu}
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-white/10 transition-colors">
                    <Store className="w-5 h-5 text-amber-400" />
                  </span>
                  Loja
                </Link>

                {/* Botão AO VIVO ou ZK-TV no mobile */}
                {!currentAppUser?.is_admin && (
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
                        Zk-TV
                      </Link>
                    ) : (
                      <Link
                        to="/zk-tv"
                        className={`flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic transition-all duration-300 ${location.pathname.startsWith('/zk-tv')
                          ? 'bg-slate-700 text-white shadow-[0_0_20px_rgba(51,65,85,0.4)] translate-x-1'
                          : 'text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1'
                          }`}
                        onClick={closeMenu}
                      >
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-white/10 transition-colors">
                          🎮
                        </span>
                        Zk-TV
                      </Link>
                    )}
                  </>
                )}

                {/* Mobile Admin Links */}
                {currentAppUser?.is_admin && (
                  <div className="py-4 space-y-2 border-t border-white/5 mt-4 pt-6">
                    <Link to="/admin/live-stream" onClick={closeMenu} className="flex items-center px-5 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all hover:translate-x-1 font-bold uppercase tracking-tight italic border border-amber-500/20 bg-amber-500/5 mt-4">
                      <span className="mr-4 text-xl">📡</span> Transmitir ao Vivo
                    </Link>
                  </div>
                )}

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
                      className="flex items-center justify-center px-4 py-4 rounded-2xl text-sm font-black uppercase italic bg-amber-500 text-slate-900 shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:bg-amber-400 transition-all tracking-wider"
                      onClick={closeMenu}
                    >
                      Cadastrar
                    </Link>
                  </div>
                )}

                {currentAppUser && (
                  <>
                    <Link
                      to={user ? "/dashboard" : "/login"}
                      className={`flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic transition-all duration-300 ${location.pathname === '/dashboard' || location.pathname === '/login'
                        ? 'bg-slate-700 text-white shadow-[0_0_20px_rgba(51,65,85,0.4)] translate-x-1'
                        : 'text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1'
                        }`}
                      onClick={closeMenu}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-white/10 overflow-hidden">
                        {currentAppUser?.avatar_url ? (
                          <img src={currentAppUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      {user ? 'Meu Perfil' : 'Entrar'}
                    </Link>

                    <div className="p-4 bg-white/[0.02] rounded-3xl mt-6 border border-white/5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-5 py-4 rounded-2xl text-base font-black uppercase italic text-red-400 hover:text-white hover:bg-red-500/20 transition-all border border-red-500/10 active:scale-95"
                      >
                        <LogOut className="h-5 w-5 mr-4" />
                        Sair da Conta
                      </button>
                    </div>
                  </>
                )}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gaveta do Carrinho */}
      <CartDrawer />
    </>
  );
}

export default Header;