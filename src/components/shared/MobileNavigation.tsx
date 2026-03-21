import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Play, Store, Tv, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useData } from '../../context/DataContext';

const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, guestClub } = useData();
  const [showMediaSubmenu, setShowMediaSubmenu] = useState(false);
  const [hasActiveLive, setHasActiveLive] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const activeClub = currentUser?.club_slug || guestClub;
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

  useEffect(() => {
    const checkActiveLive = async () => {
      try {
        // ✅ REGRA: Badge de live no mobile SEMPRE verifica apenas Cruzeiro
        const { data } = await supabase
          .from('live_streams')
          .select('id')
          .eq('is_active', true)
          .eq('club_slug', 'cruzeiro')
          .limit(1)
          .maybeSingle();
        setHasActiveLive(!!data);
      } catch (err) {
        console.error('Erro ao verificar live:', err);
      }
    };

    checkActiveLive();

    const subscription = supabase
      .channel('mobile-nav-live-check')
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

  // ✅ Filtrar itens de navegação baseado no contexto do clube
  const allNavItems = [
    { id: 'home', label: 'Início', icon: Home, path: '/', galoOnly: false, hideForGalo: true },
    { id: 'zktv', label: 'ZK TV', icon: Tv, path: '/zk-tv', galoOnly: false, hideForGalo: false },
    { id: 'loja', label: 'Loja', icon: Store, path: '/loja', galoOnly: false, hideForGalo: true },
    { id: 'escalacao', label: 'Escalação', icon: Swords, path: '/escalacao', galoOnly: false, hideForGalo: false },
    { id: 'midia', label: 'Mídia', icon: Play, path: '/zk-clips', galoOnly: false, hideForGalo: true },
  ];

  const navItems = isGalo 
    ? allNavItems.filter(item => !item.hideForGalo) 
    : allNavItems;

  // Identificar item ativo baseando-se no path
  const activeTab = navItems.find(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )?.id || (isGalo ? 'zktv' : 'home');

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.id === 'midia') {
      setShowMediaSubmenu(!showMediaSubmenu);
    } else {
      setShowMediaSubmenu(false);
      // ✅ Se é Galo e clicou em ZK TV, preservar o canal via sessionStorage
      if (isGalo && item.id === 'zktv') {
        const savedChannel = sessionStorage.getItem('session_channel');
        if (savedChannel) {
          navigate(`/zk-tv?channel=${savedChannel}`);
          return;
        }
      }
      navigate(item.path);
    }
  };

  if (isLandscape) return null;

  return (
    <>
      {/* Media Submenu Backdrop */}
      <AnimatePresence>
        {showMediaSubmenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMediaSubmenu(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] md:hidden"
          />
        )}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#030712]/95 backdrop-blur-2xl border-t border-white/5 z-[100] pb-[calc(env(safe-area-inset-bottom,0px)+15px)] shadow-[0_-15px_50px_rgba(0,0,0,0.8)]">
        {/* Media Submenu - Agora só Músicas e ZK-Clips (sem Escalação) */}
      <AnimatePresence>
        {showMediaSubmenu && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-[100px] right-4 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-1 z-[110]"
          >
            <button
              onClick={() => {
                navigate('/spotify');
                setShowMediaSubmenu(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white transition-colors border border-transparent hover:border-white/5"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Play size={16} className="text-purple-400" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider">Músicas</span>
            </button>
            <button
              onClick={() => {
                navigate('/zk-clips?cat=clips');
                setShowMediaSubmenu(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white transition-colors border border-transparent hover:border-white/5"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Play size={16} className="text-blue-400" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider">Zk-Clips</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

        <div className="flex justify-around items-center h-20 px-2 relative">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className="relative flex flex-col items-center justify-center w-full h-full transition-all duration-300"
                aria-label={item.label}
              >
                <div className="flex flex-col items-center gap-1.5 pt-2">
                  <div className="relative">
                    <Icon
                      size={24}
                      className={`transition-all duration-500 ${isActive
                        ? "text-blue-500 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        : "text-white/30"
                        }`}
                    />
                    {item.id === 'zktv' && hasActiveLive && !isGalo && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-[#030712] animate-pulse" />
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabGlow"
                        className="absolute -inset-4 rounded-full -z-10 blur-md bg-blue-500/10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={`text-[9px] uppercase font-black tracking-[0.15em] transition-colors duration-500 ${isActive
                    ? "text-blue-500"
                    : "text-white/20"
                    }`}>
                    {item.label}
                  </span>
                </div>

                {isActive && (
                  <motion.div
                    className="absolute top-0 w-12 h-1 rounded-b-full shadow-lg bg-gradient-to-r from-blue-600 to-blue-400 shadow-blue-900/40"
                    layoutId="indicator"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNavigation;
