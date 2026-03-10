import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Tv, Layout, Play, MoreHorizontal, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasActiveLive, setHasActiveLive] = useState(false);

  // ✅ Verificar se há live ativa e escutar mudanças em tempo real
  useEffect(() => {
    const checkLive = async () => {
      const { data } = await supabase
        .from('live_streams')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      setHasActiveLive(!!data);
    };

    checkLive();

    const channel = supabase
      .channel('mobile-nav-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => checkLive())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const navItems = [
    { id: 'home', label: 'Início', icon: Home, path: '/' },
    { id: 'live', icon: Tv, label: 'Ao Vivo', path: '/zk-tv' },
    { id: 'escalacao', icon: Layout, label: 'Escalação', path: '/escalacao' },
    { id: 'midia', icon: Play, label: 'Mídia', path: '/zk-clips' },
    { id: 'menu', icon: MoreHorizontal, label: 'Mais', path: '/menu' }
  ];

  // Identificar item ativo baseando-se no path
  const activeTab = navItems.find(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )?.id || 'home';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#030712]/90 backdrop-blur-2xl border-t border-white/5 z-[100] pb-[calc(env(safe-area-inset-bottom,0px)+20px)] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center h-20 px-2 relative">

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const showLiveDot = item.id === 'live' && hasActiveLive;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center w-full h-full transition-all duration-300"
              aria-label={item.label}
            >
              <div className="flex flex-col items-center gap-1.5 pt-2">
                <div className="relative">
                  <Icon
                    size={22}
                    className={`transition-all duration-500 ${isActive ? "text-blue-500 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : showLiveDot ? "text-red-400" : "text-white/30"}`}
                  />
                  {/* ✅ Ponto vermelho pulsante quando live ativa */}
                  {showLiveDot && (
                    <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute -inset-4 bg-blue-500/10 rounded-full -z-10 blur-md"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className={`text-[9px] uppercase font-black tracking-[0.15em] transition-colors duration-500 ${isActive ? "text-blue-500" : showLiveDot ? "text-red-400" : "text-white/20"}`}>
                  {showLiveDot && !isActive ? '🔴 Ao Vivo' : item.label}
                </span>
              </div>

              {isActive && (
                <motion.div
                  className="absolute top-0 w-10 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-b-full shadow-[0_2px_10px_rgba(59,130,246,0.5)]"
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
