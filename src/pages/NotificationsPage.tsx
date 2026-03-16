import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, Calendar, CheckCircle2, Info, AlertTriangle, Smartphone, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/shared/Header';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'promotion';
  created_at: string;
  read: boolean;
  data?: any;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const sub = supabase
      .channel('notifications-page')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('id', id);

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      toast.success('Todas marcadas como lidas');
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('id', id);

      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notificação removida');
    } catch (err) {
      console.error('Erro ao deletar notificação:', err);
      toast.error('Erro ao remover notificação');
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', user.id);

      setNotifications([]);
      toast.success('Todas as notificações foram removidas');
    } catch (err) {
      console.error('Erro ao limpar notificações:', err);
      toast.error('Erro ao limpar notificações');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success': return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case 'warning': return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      case 'promotion': return { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
      default: return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={22} />;
      case 'warning': return <AlertTriangle size={22} />;
      default: return <Info size={22} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white pt-[calc(5rem+env(safe-area-inset-top,0px))] px-4 relative overflow-x-hidden pb-32">
      <Header />

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto relative z-10"
      >
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8 px-2">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">
              Alertas<span className="text-blue-500">.</span>
            </h1>
            <p className="text-blue-200/40 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Sua central de notificações</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all active:scale-95"
              >
                <Check size={12} />
                Ler Tudo
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-xl text-red-500/60 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95"
              >
                <Trash2 size={12} />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Badge de não-lidas */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Bell size={18} className="text-blue-400" />
            </div>
            <span className="text-sm font-bold text-blue-300">
              Você tem <span className="text-blue-400 font-black">{unreadCount}</span> notificação{unreadCount > 1 ? 'ões' : ''} não lida{unreadCount > 1 ? 's' : ''}
            </span>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
            <p className="text-sm text-white/30 font-bold uppercase tracking-widest">Carregando...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {notifications.length > 0 ? (
                notifications.map((notif, idx) => {
                  const styles = getTypeStyles(notif.type);
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: 20 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`group bg-white/[0.03] border ${notif.read ? 'border-white/5 opacity-60' : `border-white/10 ${styles.border}`} rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden transition-all hover:bg-white/[0.06]`}
                    >
                      {/* Glow para não-lida */}
                      {!notif.read && (
                        <div className={`absolute top-0 right-0 w-24 h-24 ${styles.bg} blur-[40px] opacity-30 pointer-events-none`} />
                      )}

                      <div className="flex items-start gap-3 relative z-10">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${styles.bg} ${styles.border} ${styles.color} flex-shrink-0 transition-transform group-hover:scale-110`}>
                          {getTypeIcon(notif.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h3 className={`font-black uppercase italic tracking-tight text-sm ${notif.read ? 'text-white/50' : 'text-white'}`}>
                              {notif.title}
                            </h3>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)] flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-white/30 font-medium leading-relaxed mb-2 line-clamp-2">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/15">
                              <Calendar size={10} />
                              {formatDate(notif.created_at)}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notif.read && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                                  title="Marcar como lida"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                title="Excluir"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 px-8 text-center"
                >
                  <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[3rem] flex items-center justify-center text-white/5 mb-6">
                    <Bell size={48} />
                  </div>
                  <h2 className="text-xl font-black uppercase italic text-white/40 mb-2">Silêncio Absoluto</h2>
                  <p className="text-sm text-white/10 font-medium uppercase tracking-widest max-w-[200px]">
                    Você não tem novas notificações no momento.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-12 bg-gradient-to-br from-blue-600/20 to-blue-900/40 border border-blue-500/30 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Smartphone size={150} />
          </div>
          <div className="relative z-10">
            <h4 className="text-lg font-black uppercase italic text-white mb-2">Notificações Push</h4>
            <p className="text-sm text-blue-100/60 font-medium leading-relaxed mb-4">
              Mantenha o app atualizado e as notificações ativas para não perder nenhum resultado de sorteio ou live!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotificationsPage;
