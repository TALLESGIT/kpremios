import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Tv, User, Music, Users } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const MobileBottomNav = () => {
  const location = useLocation();

  const handleImpact = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Haptics not available in browser
    }
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Início' },
    { path: '/escalacao', icon: Users, label: 'Escale' },
    { path: '/zk-tv', icon: Tv, label: 'Ao Vivo' },
    { path: '/spotify', icon: Music, label: 'Músicas' },
    { path: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary-dark/95 backdrop-blur-lg border-t border-white/10 z-[100] flex items-center justify-around px-2"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        height: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 8px)',
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={handleImpact}
            className={`flex flex-col items-center justify-center w-full transition-all duration-300 ${isActive ? 'text-accent' : 'text-white/60'
              }`}
            style={{ paddingTop: '8px' }}
          >
            <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-1 font-bold uppercase tracking-tighter">
              {item.label}
            </span>
            {isActive && (
              <span className="w-1 h-1 bg-accent rounded-full mt-0.5"></span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
