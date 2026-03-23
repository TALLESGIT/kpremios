import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, X, Save, Zap, Info, AlertTriangle, Loader2 
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useWhatsApp } from '../../hooks/useWhatsApp';

interface WhatsAppNotificationPanelProps {
  onClose: () => void;
}

export const WhatsAppNotificationPanel: React.FC<WhatsAppNotificationPanelProps> = ({ onClose }) => {
  const { notifyAllUsersAboutNewRaffle } = useData();
  const { loading, error } = useWhatsApp();
  const [raffleData, setRaffleData] = useState({
    title: '',
    prize: '',
    startDate: '',
    endDate: ''
  });
  const [notificationResult, setNotificationResult] = useState<any>(null);

  const handleSendNotification = async () => {
    if (!raffleData.title || !raffleData.prize || !raffleData.startDate || !raffleData.endDate) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      const result = await notifyAllUsersAboutNewRaffle(raffleData);
      setNotificationResult(result);
      
      if (result.success) {
        alert(`Notificação enviada com sucesso! ${result.notified}/${result.total} usuários notificados.`);
      } else {
        alert(`Erro ao enviar notificação: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao enviar notificação');
    }
  };

  const handleTestMessage = async () => {
    // Teste com dados fictícios
    const testData = {
      title: 'Teste de Notificação',
      prize: 'iPhone 15 Pro Max',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    try {
      const result = await notifyAllUsersAboutNewRaffle(testData);
      setNotificationResult(result);
      alert(`Teste enviado! ${result.notified}/${result.total} usuários notificados.`);
    } catch (error) {
      alert('Erro ao enviar teste');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl shadow-black/50 overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
              <MessageCircle className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Notificações</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-4">
              Título do Sorteio
            </label>
            <input
              type="text"
              value={raffleData.title}
              onChange={(e) => setRaffleData({ ...raffleData, title: e.target.value })}
              className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-amber-500/50 transition-all text-sm"
              placeholder="Ex: Sorteio iPhone 15 Pro Max"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-4">
              Prêmio
            </label>
            <input
              type="text"
              value={raffleData.prize}
              onChange={(e) => setRaffleData({ ...raffleData, prize: e.target.value })}
              className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-amber-500/50 transition-all text-sm"
              placeholder="Ex: iPhone 15 Pro Max 256GB"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-4">
                Início
              </label>
              <input
                type="date"
                value={raffleData.startDate}
                onChange={(e) => setRaffleData({ ...raffleData, startDate: e.target.value })}
                className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-amber-500/50 transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-4">
                Término
              </label>
              <input
                type="date"
                value={raffleData.endDate}
                onChange={(e) => setRaffleData({ ...raffleData, endDate: e.target.value })}
                className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-amber-500/50 transition-all text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleSendNotification}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? 'Enviando...' : 'Disparar Notificação'}
            </button>
            
            <button
              onClick={handleTestMessage}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              Enviar Mensagem de Teste
            </button>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              <strong className="text-amber-500 uppercase tracking-wider">Atenção:</strong> Esta ação enviará uma notificação para <span className="text-white font-bold italic">todos os usuários</span> cadastrados no sistema via Twilio WhatsApp API.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
