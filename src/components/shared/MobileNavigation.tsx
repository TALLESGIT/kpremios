import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Store, Tv, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useData } from '../../context/DataContext';

const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, guestClub } = useData();
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
  ];

  const navItems = isGalo 
    ? allNavItems.filter(item => !item.hideForGalo) 
    : allNavItems;

  // Identificar item ativo baseando-se no path
  const activeTab = navItems.find(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )?.id || (isGalo ? 'zktv' : 'home');

  const handleNavClick = (item: typeof navItems[0]) => {
    // ✅ Se é Galo e clicou em ZK TV, preservar o canal via sessionStorage
    if (isGalo && item.id === 'zktv') {
      const savedChannel = sessionStorage.getItem('session_channel');
      if (savedChannel) {
        navigate(`/zk-tv?channel=${savedChannel}`);
        return;
      }
    }
    navigate(item.path);
  };

  if (isLandscape) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#030712]/95 backdrop-blur-2xl border-t border-white/5 z-[100] pb-[calc(env(safe-area-inset-bottom,0px)+15px)] shadow-[0_-15px_50px_rgba(0,0,0,0.8)]">
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
                        ? "text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        : "text-white/30"
                        }`}
                    />
                    {item.id === 'zktv' && hasActiveLive && !isGalo && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-[#030712] animate-pulse" />
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabGlow"
                        className="absolute -inset-4 rounded-full -z-10 blur-md bg-amber-500/10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={`text-[9px] uppercase font-black tracking-[0.15em] transition-colors duration-500 ${isActive
                    ? "text-amber-500"
                    : "text-white/20"
                    }`}>
                    {item.label}
                  </span>
                </div>

                {isActive && (
                  <motion.div
                    className="absolute top-0 w-12 h-1 rounded-b-full shadow-lg bg-gradient-to-r from-amber-600 to-amber-400 shadow-amber-900/40"
                    layoutId="indicator"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
  );
};

export default MobileNavigation;
