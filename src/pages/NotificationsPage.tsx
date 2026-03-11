import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronLeft, Trash2, Calendar, CheckCircle2, Info, AlertTriangle, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/shared/Header';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'promotion';
  date: string;
  read: boolean;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Bem-vindo ao ZK Oficial!',
      message: 'Participe dos nossos bolões e concorra a prêmios incríveis toda semana.',
      type: 'success',
      date: '2024-03-20',
      read: false
    },
    {
      id: '2',
      title: 'Dica de Segurança',
      message: 'Nunca compartilhe sua senha ou código PIX com ninguém. O suporte oficial nunca pedirá seus dados de acesso.',
      type: 'info',
      date: '2024-03-19',
      read: false
    }
  ]);

  const clearAll = () => setNotifications([]);
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'warning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white pt-[calc(5rem+env(safe-area-inset-top,0px))] px-4 relative overflow-x-hidden">
      <Header />

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto relative z-10"
      >
        <div className="flex justify-between items-end mb-10 px-2">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
              Alertas<span className="text-blue-500">.</span>
            </h1>
            <p className="text-blue-200/40 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Sua central de notificações</p>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/5 border border-red-500/10 rounded-xl text-red-500/60 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95"
            >
              <Trash2 size={14} />
              Limpar Tudo
            </button>
          )}
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {notifications.length > 0 ? (
              notifications.map((notif, idx) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => markAsRead(notif.id)}
                  className={`group bg-white/5 border ${notif.read ? 'border-white/5 opacity-60' : 'border-white/10'} rounded-[2rem] p-6 backdrop-blur-xl relative overflow-hidden transition-all hover:bg-white/10 cursor-pointer`}
                >
                  <div className="flex items-start gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${getTypeStyles(notif.type)} transition-transform group-hover:scale-110`}>
                      {notif.type === 'success' ? <CheckCircle2 size={24} /> :
                        notif.type === 'warning' ? <AlertTriangle size={24} /> :
                          <Info size={24} />}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-black uppercase italic tracking-tight ${notif.read ? 'text-white/60' : 'text-white'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        )}
                      </div>
                      <p className="text-sm text-blue-200/40 font-medium leading-relaxed mb-3">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-200/20">
                        <Calendar size={10} />
                        {new Date(notif.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
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

        {/* Info Card */}
        <div className="mt-12 bg-gradient-to-br from-blue-600/20 to-blue-900/40 border border-blue-500/30 rounded-[2.5rem] p-8 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Smartphone size={150} />
          </div>
          <div className="relative z-10">
            <h4 className="text-lg font-black uppercase italic text-white mb-2">Notificações Push</h4>
            <p className="text-sm text-blue-100/60 font-medium leading-relaxed mb-6">
              Mantenha o app atualizado e as notificações ativas para não perder nenhum resultado de sorteio!
            </p>
            <button className="bg-white text-blue-900 px-6 py-3 rounded-2xl font-black uppercase italic text-xs tracking-widest shadow-xl hover:bg-blue-50 transition-colors active:scale-95">
              Configurar no Sistema
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotificationsPage;
