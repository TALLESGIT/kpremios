import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  User, Lock, Bell, HelpCircle, Info, LogOut,
  ChevronRight, Ticket, Gamepad2, Edit3, Fingerprint,
  Instagram, Youtube, MessageCircle, ExternalLink, Star,
  Globe, Music
} from 'lucide-react';
import { BiometricService } from '../services/BiometricService';
import SocialModal from '../components/SocialModal';

const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { currentUser, reloadUserData } = useData();
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [socialLinks, setSocialLinks] = useState<any>({
    instagram: '',
    youtube: '',
    facebook: '',
    soundcloud: '',
    spotify: '',
    whatsapp: ''
  });
  const [showSocialModal, setShowSocialModal] = useState(false);

  useEffect(() => {
    checkBiometric();
    loadSocialLinks();

    // Recarregar dados do usuário para garantir que os contadores de palpites/vitórias estejam atualizados
    reloadUserData();
  }, []);

  const loadSocialLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'social_links')
        .maybeSingle();

      if (!error && data && data.value) {
        setSocialLinks(data.value);
      }
    } catch (err) {
      console.error('Erro ao carregar links sociais:', err);
    }
  };

  const isNative = Capacitor.isNativePlatform();

  const checkBiometric = async () => {
    if (isNative) {
      try {
        const isAvailable = await BiometricService.isAvailable();
        if (isAvailable) {
          const isEnabled = await BiometricService.isBiometricEnabled();
          setBiometricEnabled(isEnabled);
        }
      } catch (e) {
        console.error('Erro biometria:', e);
      }
    }
  };

  const toggleBiometric = async () => {
    if (biometricEnabled) {
      await BiometricService.disableBiometrics();
      setBiometricEnabled(false);
    } else {
      const success = await BiometricService.enableBiometrics();
      if (success) {
        setBiometricEnabled(true);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const getInitials = () => {
    if (currentUser?.name) {
      const parts = currentUser.name.split(' ');
      return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'ZK';
  };

  interface MenuItemProps {
    icon: React.ElementType;
    label: string;
    subtitle?: string;
    onClick?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
    accent?: boolean;
  }

  const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, subtitle, onClick, rightElement, danger, accent }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 active:scale-[0.98] ${danger
        ? 'bg-red-500/10 hover:bg-red-500/20'
        : accent
          ? 'bg-accent/10 hover:bg-accent/20'
          : 'bg-white/5 hover:bg-white/10'
        } `}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-red-500/20 text-red-400' :
        accent ? 'bg-accent/20 text-accent' :
          'bg-primary-light/30 text-white'
        } `}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 text-left">
        <p className={`font-semibold text-sm ${danger ? 'text-red-400' : 'text-white'} `}>{label}</p>
        {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      {rightElement || <ChevronRight className="w-4 h-4 text-white/30" />}
    </button>
  );

  const ToggleSwitch: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`relative w-12 h-7 rounded-full transition-all duration-300 ${enabled ? 'bg-accent' : 'bg-white/20'
        } `}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${enabled ? 'left-6' : 'left-1'
        } `} />
    </button>
  );

  return (
    <div className="min-h-screen pb-20 bg-[#0a1529]">
      {/* Header / Profile Info */}
      <div className="relative pt-12 pb-8 px-6 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-blue-600/10 blur-[100px] -z-10"></div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${currentUser?.is_vip ? 'from-yellow-400 to-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'from-blue-600 to-blue-500'} flex items-center justify-center text-3xl font-black text-white shadow-xl`}>
              {getInitials()}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-lg border-4 border-[#0a1529] hover:scale-110 transition-transform">
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">{currentUser?.name || 'Carregando...'}</h2>
            <p className="text-white/40 text-sm font-medium">{currentUser?.email}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="glass-panel bg-white/5 border border-white/10 rounded-3xl p-4 text-center">
            <Ticket className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
            <p className="text-xl font-black text-white italic">{currentUser?.total_bets || 0}</p>
            <p className="text-[10px] uppercase font-black text-white/40 tracking-widest">Palpites</p>
          </div>

          <div className={`glass-panel border rounded-3xl p-4 text-center transition-all ${currentUser?.is_vip ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30' : 'bg-white/5 border-white/10'}`}>
            <Star className={`w-5 h-5 mx-auto mb-2 ${currentUser?.is_vip ? 'text-yellow-400' : 'text-blue-400'}`} />
            <p className={`text-xl font-black italic ${currentUser?.is_vip ? 'text-yellow-400' : 'text-white'}`}>
              {currentUser?.is_vip ? 'VIP' : 'FREE'}
            </p>
            <p className="text-[10px] uppercase font-black text-white/40 tracking-widest">Plano</p>
          </div>

          <div className="glass-panel bg-white/5 border border-white/10 rounded-3xl p-4 text-center">
            <Gamepad2 className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-xl font-black text-white italic">{currentUser?.total_wins || 0}</p>
            <p className="text-[10px] uppercase font-black text-white/40 tracking-widest">Acertos</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Minha Conta */}
        <section>
          <h3 className="text-xs font-bold uppercase text-white/40 tracking-wider px-2 mb-3">Minha Conta</h3>
          <div className="space-y-2">
            <MenuItem
              icon={User}
              label="Editar Perfil"
              subtitle="Nome, telefone, foto"
              onClick={() => navigate('/dashboard')}
            />
            <MenuItem
              icon={Ticket}
              label="Meus Palpites"
              subtitle="Ver histórico no Bolão"
              onClick={() => navigate('/my-numbers')}
            />
          </div>
        </section>

        {/* Notificações */}
        <section>
          <h3 className="text-xs font-bold uppercase text-white/40 tracking-wider px-2 mb-3">Notificações</h3>
          <div className="space-y-2">
            <MenuItem
              icon={Bell}
              label="Notificações Push"
              subtitle="Receber alertas de sorteios"
              onClick={() => setPushEnabled(!pushEnabled)}
              rightElement={<ToggleSwitch enabled={pushEnabled} onToggle={() => setPushEnabled(!pushEnabled)} />}
            />
            <MenuItem
              icon={MessageCircle}
              label="WhatsApp"
              subtitle="Resultados por WhatsApp"
              onClick={() => window.open('https://wa.me/5531972393341', '_blank')}
            />
          </div>
        </section>

        {/* Segurança */}
        <section>
          <h3 className="text-xs font-bold uppercase text-white/40 tracking-wider px-2 mb-3">Segurança</h3>
          <div className="space-y-2">
            <MenuItem
              icon={Lock}
              label="Alterar Senha"
              subtitle="Atualizar sua senha"
              onClick={() => navigate('/forgot-password')}
            />
            {isNative && (
              <MenuItem
                icon={Fingerprint}
                label="Biometria"
                subtitle={biometricEnabled ? 'Ativada' : 'Login com digital/face'}
                onClick={toggleBiometric}
                rightElement={<ToggleSwitch enabled={biometricEnabled} onToggle={toggleBiometric} />}
              />
            )}
          </div>
        </section>

        {/* Redes Sociais */}
        <section>
          <h3 className="text-xs font-bold uppercase text-white/40 tracking-wider px-2 mb-3">Redes Sociais</h3>
          <div className="space-y-2">
            <MenuItem
              icon={Instagram}
              label="Siga-nos nas Redes Sociais"
              subtitle="Instagram, YouTube, Spotify e mais"
              accent
              onClick={() => setShowSocialModal(true)}
              rightElement={
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[#0a1529] bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                    <Instagram className="w-4 h-4 text-white" />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#0a1529] bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                    <Youtube className="w-4 h-4 text-white" />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#0a1529] bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <Music className="w-4 h-4 text-white" />
                  </div>
                </div>
              }
            />
          </div>
        </section>

        {/* Suporte & Sobre */}
        <section>
          <h3 className="text-xs font-bold uppercase text-white/40 tracking-wider px-2 mb-3">Suporte & Sobre</h3>
          <div className="space-y-2">
            <MenuItem
              icon={HelpCircle}
              label="Central de Suporte"
              subtitle="Dúvidas e ajuda via WhatsApp"
              onClick={() => window.open('https://wa.me/5531972393341', '_blank')}
            />
            <MenuItem
              icon={Globe}
              label="Site Oficial"
              subtitle="itallozkpremios.com.br"
              onClick={() => window.open('https://www.itallozkpremios.com.br', '_blank')}
            />
            <MenuItem
              icon={Info}
              label="Versão do App"
              subtitle="1.1.0"
              rightElement={<span className="text-xs text-white/30 font-mono">v1.1.0</span>}
            />
          </div>
        </section>

        {/* Sair */}
        <section className="pb-10">
          <MenuItem
            icon={LogOut}
            label="Sair da Conta"
            subtitle="Desconectar e voltar ao login"
            danger
            onClick={() => setShowLogoutConfirm(true)}
          />
        </section>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-[#0a1529] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-black text-white">Sair da Conta?</h3>
              <p className="text-sm text-white/50 mt-2">Você precisará fazer login novamente para acessar sua conta.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full py-3.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all active:scale-[0.98]"
              >
                SIM, SAIR
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3.5 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all active:scale-[0.98]"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Media Modal */}
      <SocialModal
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
        socialLinks={socialLinks}
      />
    </div>
  );
};

export default ProfilePage;
