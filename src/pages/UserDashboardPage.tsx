import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  X, Bell, Trophy, Ticket, Phone, AlertCircle, Settings,
  ChevronRight, ChevronDown, Fingerprint, ShoppingBag,
  Instagram, Youtube, Facebook, Globe, MessageCircle,
  ShieldCheck, Info, LogOut, Camera, Calendar, Share2,
  User, Zap, Loader2
} from 'lucide-react';
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

interface StoreOrder {
  id: string;
  status: string;
  total: number;
  created_at: string;
  items_count?: number;
}

const UserDashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { currentUser: currentAppUser, clearUserData, reloadUserData } = useData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isBioActive, setIsBioActive] = useState(localStorage.getItem('zk_biometrics_active') === 'true');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAppUser?.avatar_url || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (currentAppUser?.avatar_url) {
      setAvatarUrl(currentAppUser.avatar_url);
    }
  }, [currentAppUser]);

  useEffect(() => {
    if (user) {
      setLoading(false);
      checkVipExpiration();
    } else {
      setLoading(false);
    }
    checkBioAvailability();
  }, [user]);

  const checkVipExpiration = async () => {
    if (!currentAppUser?.is_vip || !currentAppUser?.vip_expires_at || !user) return;

    const expiresAt = new Date(currentAppUser.vip_expires_at);
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      // Verificar se já enviamos essa notificação recentemente (opcional, para não fludar)
      // Por simplicidade, vamos apenas garantir que a notificação apareça na central
      const title = "Seu VIP está vencendo!";
      const message = diffDays === 0 
        ? "Seu acesso VIP expira hoje! Renove agora para não perder os benefícios exclusivos."
        : `Seu acesso VIP expira em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}. Renove agora e continue na elite!`;

      // Verificar se essa msg já existe para evitar duplicatas na sessão
      const { data: existing } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', title)
        .eq('read', false)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('user_notifications').insert({
          user_id: user.id,
          title,
          message,
          type: 'warning',
          data: { path: '/loja' }
        });
      }
    }
  };

  const handleAvatarClick = () => {
    document.getElementById('avatar-input')?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para fazer o upload.');
      }

      if (!user) throw new Error('Usuário não autenticado.');

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pegar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Atualizar no banco (ambas as tabelas para garantir persistência)
      const { error: updateError1 } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      const { error: updateError2 } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError1 && updateError2) throw (updateError1 || updateError2);

      // Recarregar dados locais
      if (reloadUserData) await reloadUserData();

      setAvatarUrl(publicUrl);
      toast.success('Foto de perfil atualizada!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const checkBioAvailability = async () => {
    try {
      const result = await NativeBiometric.isAvailable();
      setBioAvailable(result.isAvailable);
    } catch (e) {
      setBioAvailable(false);
    }
  };

  const handleToggleBiometrics = async () => {
    if (!isBioActive) {
      try {
        await NativeBiometric.verifyIdentity({
          reason: "Para ativar o login biométrico",
          title: "Ativar Biometria",
        });
        localStorage.setItem('zk_biometrics_active', 'true');
        setIsBioActive(true);
        toast.success("Biometria ativada!");
      } catch (e) {
        toast.error("Falha ao verificar identidade.");
      }
    } else {
      localStorage.removeItem('zk_biometrics_active');
      setIsBioActive(false);
      toast.success("Biometria desativada.");
    }
  };

  const loadStoreOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('store_orders')
        .select('id, status, total, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setStoreOrders(data);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleShowOrders = () => {
    if (!showOrders) {
      loadStoreOrders();
    }
    setShowOrders(!showOrders);
  };

  const formatWhatsApp = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  const handleUpdateWhatsapp = async () => {
    if (!whatsappNumber.trim() || whatsappNumber.length < 10) return;
    if (!user) return;

    setUpdating(true);
    try {
      const cleanWhatsapp = formatWhatsApp(whatsappNumber);
      
      // Atualizar em ambas as tabelas
      const { error: err1 } = await supabase
        .from('profiles')
        .update({ whatsapp: cleanWhatsapp })
        .eq('id', user.id);
        
      const { error: err2 } = await supabase
        .from('users')
        .update({ whatsapp: cleanWhatsapp })
        .eq('id', user.id);

      if (err1 && err2) throw (err1 || err2);
      
      if (reloadUserData) await reloadUserData();
      
      toast.success('WhatsApp atualizado com sucesso!');
      setShowWhatsAppModal(false);
    } catch (err) {
      console.error('Error updating WhatsApp:', err);
    } finally {
      setUpdating(false);
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return { label: 'Pago', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'pending': return { label: 'Pendente', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
      case 'shipped': return { label: 'Enviado', color: 'text-blue-400', bg: 'bg-blue-500/20' };
      case 'delivered': return { label: 'Entregue', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'cancelled': return { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/20' };
      default: return { label: status, color: 'text-white/40', bg: 'bg-white/10' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] relative overflow-hidden pt-[calc(5rem+env(safe-area-inset-top,0px))] pb-32">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <Header />

      <div className="flex-grow max-w-lg mx-auto px-4 py-6 w-full relative z-10">

        {/* ═══════ CARTÃO DO PERFIL (Topo) ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-[2.5rem] p-7 mb-6 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 -mr-20 -mt-20 rounded-full blur-[60px] pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            {/* Avatar */}
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-900/40 border border-white/10 overflow-hidden relative">
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  currentAppUser?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'
                )}
                
                {/* Overlay Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              
              {/* Botão flutuante editar */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-xl flex items-center justify-center border-2 border-[#030712] shadow-lg">
                <Camera size={14} className="text-white" />
              </div>
            </div>

            <input
              type="file"
              id="avatar-input"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-blue-200/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Bem-vindo de volta</p>
              <p className="text-xl font-black truncate text-white uppercase italic tracking-tight leading-tight">
                {currentAppUser?.name || user?.email?.split('@')[0] || 'Usuário'}
              </p>
              {/* Badge VIP / FREE */}
              <div className="mt-2">
                {currentAppUser?.is_vip ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                    <Zap size={12} className="text-yellow-400" />
                    <span className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">Sócio VIP</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <User size={12} className="text-white/40" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">Free</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botão Compartilhar */}
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Share2 size={16} className="text-white/40" />
            </button>
          </div>
        </motion.div>

        {/* Alerta de WhatsApp */}
        {currentAppUser && (!currentAppUser.whatsapp || currentAppUser.whatsapp.trim() === '') && (
          <div className="mb-6 bg-yellow-500/10 backdrop-blur-xl p-5 rounded-2xl border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm mb-1">WhatsApp não cadastrado</h3>
                <p className="text-yellow-200/80 text-xs mb-3">
                  Adicione seu WhatsApp para recuperar sua conta.
                </p>
                <button
                  onClick={() => {
                    setWhatsappNumber(currentAppUser.whatsapp || '');
                    setShowWhatsAppModal(true);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 px-4 rounded-xl text-sm transition-all"
                >
                  Adicionar WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ MINHA CONTA (primeiro item, destaque) ═══════ */}
        <div className="mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-blue-200/20 font-black mb-4 ml-4">Minha Conta</h2>
          <div className="space-y-3">
            <button
              onClick={() => {
                setWhatsappNumber(currentAppUser?.whatsapp || '');
                setShowWhatsAppModal(true);
              }}
              className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 hover:border-blue-500/30 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-inner">
                  <Settings size={22} />
                </div>
                <div className="text-left">
                  <span className="font-bold text-white block">Meus Dados</span>
                  <span className="text-[10px] text-blue-200/30 font-medium uppercase tracking-wider">WhatsApp e informações</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Bolões */}
            <button
              onClick={() => navigate('/my-numbers')}
              className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 hover:border-blue-500/30 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform shadow-inner">
                  <Ticket size={22} />
                </div>
                <div className="text-left">
                  <span className="font-bold text-white block">Meus Bolões</span>
                  <span className="text-[10px] text-blue-200/30 font-medium uppercase tracking-wider">Apostas e participações</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Minhas Compras - Expandível */}
            <div>
              <button
                onClick={handleShowOrders}
                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 hover:border-emerald-500/30 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-inner">
                    <ShoppingBag size={22} />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-white block">Minhas Compras</span>
                    <span className="text-[10px] text-blue-200/30 font-medium uppercase tracking-wider">Pedidos na Loja ZK</span>
                  </div>
                </div>
                <ChevronDown size={18} className={`text-white/10 group-hover:text-emerald-400 transition-all ${showOrders ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showOrders && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 ml-4 pl-4 border-l-2 border-emerald-500/20 space-y-2">
                      {loadingOrders ? (
                        <div className="py-6 flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent"></div>
                        </div>
                      ) : storeOrders.length > 0 ? (
                        storeOrders.map(order => {
                          const statusInfo = getStatusLabel(order.status);
                          return (
                            <div key={order.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-white">Pedido #{order.id.slice(0, 8)}</p>
                                <p className="text-[10px] text-white/20 mt-0.5">
                                  {new Date(order.created_at).toLocaleDateString('pt-BR')} • R$ {order.total?.toFixed(2) || '0.00'}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusInfo.bg} ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center">
                          <ShoppingBag size={24} className="mx-auto text-white/10 mb-2" />
                          <p className="text-xs text-white/20">Nenhum pedido encontrado</p>
                          <button
                            onClick={() => navigate('/loja')}
                            className="mt-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                          >
                            Ir para Loja
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Biometrics Toggle */}
        {bioAvailable && (
          <div className="mb-6 bg-white/5 border border-white/10 p-5 rounded-[1.8rem] backdrop-blur-xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400">
                <Fingerprint size={22} />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Login Biométrico</h3>
                <p className="text-blue-200/30 text-[10px] uppercase tracking-wider font-medium">Digital ou face</p>
              </div>
            </div>
            <button
              onClick={handleToggleBiometrics}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isBioActive ? 'bg-cyan-500' : 'bg-white/10'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isBioActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        {/* ═══════ ZK OFICIAL ═══════ */}
        <div className="mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-blue-200/20 font-black mb-4 ml-4">ZK Oficial</h2>
          <div className="space-y-3">
            {[
              { icon: Trophy, label: 'Ganhadores', path: '/winners', color: 'text-emerald-400', bg: 'bg-emerald-500/10', desc: 'Veja os sortudos' },
              { icon: Calendar, label: 'Competições', path: '/competicoes', color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Campeonatos e torneios' },
              { icon: Bell, label: 'Notificações', path: '/notifications', color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Central de alertas' },
            ].map((item: any) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
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

        {/* ═══════ REDES SOCIAIS (Botão expansível) ═══════ */}
        <div className="mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-blue-200/20 font-black mb-4 ml-4">Mídia</h2>
          <div>
            <button
              onClick={() => setShowSocial(!showSocial)}
              className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 hover:border-pink-500/30 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform shadow-inner border border-pink-500/10">
                  <Globe size={22} />
                </div>
                <div className="text-left">
                  <span className="font-bold text-white block">Redes Sociais</span>
                  <span className="text-[10px] text-blue-200/30 font-medium uppercase tracking-wider">Siga o ZK nas redes</span>
                </div>
              </div>
              <ChevronDown size={18} className={`text-white/10 group-hover:text-pink-400 transition-all ${showSocial ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showSocial && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 ml-4 pl-4 border-l-2 border-pink-500/20 space-y-2">
                    {[
                      { icon: Instagram, label: 'Instagram', url: 'https://www.instagram.com/itallozkoficial', color: 'text-pink-500' },
                      { icon: Youtube, label: 'YouTube', url: 'https://www.youtube.com/channel/UCyP-ZyjtM-I-J2mfI-utNtw', color: 'text-red-500' },
                      { icon: Facebook, label: 'Facebook', url: 'https://www.facebook.com/itallozkoficial', color: 'text-blue-500' },
                      { icon: Globe, label: 'SoundCloud', url: 'https://soundcloud.com/itallo-zk', color: 'text-orange-500' },
                      { icon: Camera, label: 'Spotify', url: 'https://open.spotify.com/artist/0yP-ZyjtM-I-J2mfI-utNtw', color: 'text-green-500' },
                    ].map((social) => (
                      <button
                        key={social.label}
                        onClick={() => window.open(social.url, '_blank')}
                        className="w-full flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/5 rounded-xl transition-all group active:scale-[0.98]"
                      >
                        <social.icon size={18} className={social.color} />
                        <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">{social.label}</span>
                        <ChevronRight size={14} className="ml-auto text-white/10" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ═══════ SEGURANÇA & SUPORTE ═══════ */}
        <div className="mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-blue-200/20 font-black mb-4 ml-4">Segurança & Suporte</h2>
          <div className="space-y-3">
            <button
              onClick={() => window.open('https://wa.me/5531972393341', '_blank')}
              className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 hover:border-emerald-500/30 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-inner">
                  <MessageCircle size={22} />
                </div>
                <div className="text-left">
                  <span className="font-bold text-white block">Suporte VIP</span>
                  <span className="text-[10px] text-blue-200/30 font-medium uppercase tracking-wider">Falar com atendente</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/10 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </button>
            <button
              onClick={() => navigate('/termos')}
              className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 hover:border-blue-500/30 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform shadow-inner">
                  <ShieldCheck size={22} />
                </div>
                <span className="font-bold text-white">Termos de Uso</span>
              </div>
              <ChevronRight size={18} className="text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="mb-6 py-5 px-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
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

        {/* Botão Sair */}
        <button
          onClick={async () => {
            clearUserData();
            await signOut();
            navigate('/', { replace: true });
          }}
          className="w-full bg-red-500/5 border border-red-500/10 text-red-500 rounded-[2rem] p-5 flex items-center justify-center gap-3 font-black uppercase italic hover:bg-red-500/10 hover:border-red-500/20 transition-all mb-6 shadow-xl active:scale-95 group"
        >
          <LogOut size={22} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
          Encerrar Sessão
        </button>
      </div>

      {/* WhatsApp Modal */}
      <AnimatePresence>
        {showWhatsAppModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 mx-auto">
                <Phone className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white text-center mb-2 uppercase italic">
                Atualizar <span className="text-emerald-400">WhatsApp</span>
              </h2>
              <p className="text-blue-200/60 text-center mb-8 text-sm">
                Informe seu número para receber notificações exclusivas e suporte.
              </p>
              <div className="space-y-4">
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-white placeholder:text-blue-200/20 focus:border-emerald-500/50 outline-none transition-all"
                />
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowWhatsAppModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all">
                    Cancelar
                  </button>
                  <button onClick={handleUpdateWhatsapp} disabled={updating} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-4 rounded-2xl transition-all uppercase italic">
                    {updating ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default UserDashboardPage;
