import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Ticket,
  Trophy,
  Calendar,
  Fingerprint,
  LogOut,
  ChevronRight,
  Instagram,
  Youtube,
  Facebook,
  Music,
  Globe,
  MessageCircle,
  Camera,
  Share2,
  Bell,
  ShieldCheck,
  Smartphone,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Header from '../components/shared/Header';
import { LucideIcon } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  color: string;
  bg: string;
  isExternal?: boolean;
  isNative?: boolean;
  desc?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { currentUser } = useData();

  const menuSections: MenuSection[] = [
    {
      title: 'Minha Conta',
      items: [
        { id: 'profile', label: 'Meu Perfil', icon: User, path: '/dashboard', color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { id: 'numbers', label: 'Meus Bolões', icon: Ticket, path: '/my-numbers', color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Minhas apostas e participações' },
      ]
    },
    {
      title: 'ZK Oficial',
      items: [
        { id: 'winners', label: 'Ganhadores', icon: Trophy, path: '/winners', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { id: 'competitions', label: 'Competições', icon: Calendar, path: '/competicoes', color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { id: 'notifications', label: 'Notificações', icon: Bell, path: '/notifications', color: 'text-accent', bg: 'bg-accent/10' },
      ]
    },
    {
      title: 'Redes Sociais',
      items: [
        { id: 'instagram', label: 'Instagram', icon: Instagram, path: 'https://www.instagram.com/itallozkoficial', color: 'text-pink-500', bg: 'bg-pink-500/10', isExternal: true },
        { id: 'youtube', label: 'YouTube', icon: Youtube, path: 'https://www.youtube.com/channel/UCyP-ZyjtM-I-J2mfI-utNtw', color: 'text-red-500', bg: 'bg-red-500/10', isExternal: true },
        { id: 'facebook', label: 'Facebook', icon: Facebook, path: 'https://www.facebook.com/itallozkoficial', color: 'text-blue-500', bg: 'bg-blue-500/10', isExternal: true },
        { id: 'soundcloud', label: 'SoundCloud', icon: Info, path: 'https://soundcloud.com/itallo-zk', color: 'text-orange-500', bg: 'bg-orange-500/10', isExternal: true },
        { id: 'spotify', label: 'Spotify', icon: Camera, path: 'https://open.spotify.com/artist/0yP-ZyjtM-I-J2mfI-utNtw', color: 'text-green-500', bg: 'bg-green-500/10', isExternal: true },
      ]
    },
    {
      title: 'Segurança e Suporte',
      items: [
        { id: 'biometrics', label: 'Biometria', icon: Fingerprint, path: '#', color: 'text-cyan-400', bg: 'bg-cyan-500/10', isNative: true, desc: 'Ativar acesso digital' },
        { id: 'support', label: 'Suporte VIP', icon: MessageCircle, path: 'https://wa.me/5531972393341', color: 'text-emerald-400', bg: 'bg-emerald-500/10', isExternal: true, desc: 'Falar com atendente' },
        { id: 'terms', label: 'Termos de Uso', icon: ShieldCheck, path: '/termos', color: 'text-slate-400', bg: 'bg-slate-500/10' },
      ]
    }
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleBiometricSetup = async () => {
    try {
      const result = await NativeBiometric.isAvailable();
      if (!result.isAvailable) {
        toast.error('Biometria não disponível neste dispositivo');
        return;
      }

      await NativeBiometric.verifyIdentity({
        reason: "Para ativar o acesso rápido por biometria",
        title: "Autenticação ZK",
        subtitle: "Use sua digital ou rosto",
        description: "Confirme sua identidade para ativar a biometria",
      });

      localStorage.setItem('zk_biometrics_active', 'true');
      toast.success('Biometria ativada com sucesso!');
    } catch (error: any) {
      if (error.message !== 'User cancelled') {
        toast.error('Erro ao configurar biometria');
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'ZK Oficial Prêmios',
        text: 'Participe dos melhores sorteios e bolões na ZK Oficial!',
        url: window.location.origin,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white pt-[calc(7rem+env(safe-area-inset-top,0px))] px-4 relative overflow-x-hidden">
      <Header />
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/10 blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto relative z-10"
      >
        <div className="flex justify-between items-center mb-10 px-2">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
              Mais<span className="text-blue-500">.</span>
            </h1>
            <p className="text-blue-200/40 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Configurações & Redes</p>
          </div>
          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors group"
          >
            <Share2 size={20} className="text-white/60 group-hover:text-blue-400 transition-colors" />
          </button>
        </div>

        {/* User Card */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 mb-10 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
            <Smartphone size={120} className="text-white" />
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-900/40 border border-white/10">
                {currentUser?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-xl border-4 border-[#030712] flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Camera size={14} className="text-white" />
              </button>
            </div>
            <div>
              {currentUser?.is_vip && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full mb-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Sócio VIP</span>
                </div>
              )}
              <p className="text-2xl font-black truncate max-w-[200px] leading-tight text-white uppercase italic tracking-tight">
                {currentUser?.name || user?.email?.split('@')[0] || 'Usuário'}
              </p>
              <p className="text-xs font-mono text-blue-200/20 mt-1 uppercase">ID: {user?.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-10">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h2 className="text-[10px] uppercase tracking-[0.3em] text-blue-200/20 font-black mb-5 ml-4">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'biometrics') {
                        handleBiometricSetup();
                        return;
                      }
                      item.isExternal ? window.open(item.path, '_blank') : navigate(item.path);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 hover:border-blue-500/30 transition-all group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-inner`}>
                        <item.icon size={22} />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-white block">{item.label}</span>
                        {item.desc && <span className="text-[10px] text-blue-200/30 font-medium uppercase tracking-wider">{item.desc}</span>}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* App Info */}
          <div className="py-6 px-4 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-bold text-white">Versão do App</p>
                <p className="text-xs text-blue-200/40">v2.1.0 - Estável</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
              <span className="text-[10px] font-black text-emerald-400 uppercase">Atualizado</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full bg-red-500/5 border border-red-500/10 text-red-500 rounded-[2rem] p-6 flex items-center justify-center gap-3 font-black uppercase italic hover:bg-red-500/10 hover:border-red-500/20 transition-all mt-6 shadow-xl active:scale-95 group"
          >
            <LogOut size={22} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
            Encerrar Sessão
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MenuPage;
