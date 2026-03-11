import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Tv, Layout, Play, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasActiveLive, setHasActiveLive] = useState(false);
  const [showMediaSubmenu, setShowMediaSubmenu] = useState(false);

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

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.id === 'midia') {
      if (location.pathname === '/zk-clips') {
        setShowMediaSubmenu(!showMediaSubmenu);
      } else {
        navigate(item.path);
        // Opcional: mostrar submenu após navegar
        setTimeout(() => setShowMediaSubmenu(true), 300);
      }
    } else {
      setShowMediaSubmenu(false);
      navigate(item.path);
    }
  };

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
        {/* Media Submenu */}
        <AnimatePresence>
          {showMediaSubmenu && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-[calc(100%+15px)] left-[60%] -translate-x-1/2 w-48 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-[110]"
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
                <span className="text-[11px] font-black uppercase tracking-wider">Clips</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-around items-center h-20 px-2 relative">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const isLiveItem = item.id === 'live';
            const showLiveDot = isLiveItem && hasActiveLive;

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
                        ? isLiveItem
                          ? "text-red-500 scale-110 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                          : "text-blue-500 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        : "text-white/30"
                        }`}
                    />
                    {/* ✅ Indicador Ao Vivo Melhorado */}
                    {showLiveDot && (
                      <span className="absolute -top-1 -right-2 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] border border-white/20" />
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabGlow"
                        className={`absolute -inset-4 rounded-full -z-10 blur-md ${isLiveItem ? "bg-red-500/15" : "bg-blue-500/10"}`}
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={`text-[9px] uppercase font-black tracking-[0.15em] transition-colors duration-500 ${isActive
                    ? isLiveItem ? "text-red-500" : "text-blue-500"
                    : "text-white/20"
                    }`}>
                    {item.label}
                  </span>
                </div>

                {isActive && (
                  <motion.div
                    className={`absolute top-0 w-12 h-1 rounded-b-full shadow-lg ${isLiveItem
                      ? "bg-gradient-to-r from-red-600 to-red-400 shadow-red-900/40"
                      : "bg-gradient-to-r from-blue-600 to-blue-400 shadow-blue-900/40"
                      }`}
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
