import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { X, Crown, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface VipSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyPrice?: number;
}

const DEFAULT_VIP_PRICE = 10.00; // Valor padrão: R$ 10,00

const VipSubscriptionModal: React.FC<VipSubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  monthlyPrice = DEFAULT_VIP_PRICE 
}) => {
  const { user } = useAuth();
  const { currentUser } = useData();
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para assinar VIP');
      return;
    }

    try {
      setLoading(true);

      // Chamar Edge Function usando o cliente Supabase (gerencia autenticação e CORS automaticamente)
      const { data, error } = await supabase.functions.invoke('create-vip-payment', {
        body: {
          user_id: user.id,
          user_email: user.email,
          user_name: currentUser?.name || user.email?.split('@')[0] || 'Usuário'
        }
      });

      if (error) {
        console.error('Erro na Edge Function:', error);
        throw new Error(error.message || 'Erro ao criar pagamento');
      }

      if (!data) {
        throw new Error('Resposta vazia da Edge Function');
      }

      if (data.payment_link) {
        // Abrir link de pagamento em nova aba
        window.open(data.payment_link, '_blank');
        setPaymentLink(data.payment_link);
        toast.success('Redirecionando para o pagamento...');
      } else {
        throw new Error(data.error || 'Link de pagamento não recebido');
      }
    } catch (error: any) {
      console.error('Erro ao criar pagamento:', error);
      const errorMessage = error.message || 'Erro ao criar pagamento. Tente novamente.';
      toast.error(`Erro ao criar pagamento: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    '💎 Mensagens destacadas no chat',
    '🎤 3 mensagens de áudio por live',
    '📺 Mensagens na tela durante a transmissão',
    '🎨 10 cores personalizadas',
    '✨ 12 emojis exclusivos',
    '📝 1.500 caracteres por mensagem',
    '⚡ Slow mode reduzido pela metade',
    '🔗 Pode enviar links e telefones',
    '💬 Acesso ao grupo VIP no WhatsApp'
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-purple-500/30 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-yellow-300" />
            <h2 className="text-xl font-black text-white uppercase">Assinar VIP</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price */}
          <div className="text-center">
            <div className="text-4xl font-black text-purple-400 mb-2">
              R$ {monthlyPrice.toFixed(2).replace('.', ',')}
            </div>
            <p className="text-sm text-slate-400 font-bold">por mês</p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-purple-300 uppercase mb-3">
              Benefícios VIP:
            </h3>
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-slate-700/50 rounded-xl p-4 border border-purple-500/20">
            <p className="text-xs text-slate-400 text-center">
              💳 Pagamento seguro via Mercado Pago
              <br />
              🔄 Renovação automática mensal
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-black rounded-xl uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  Assinar VIP Agora
                </>
              )}
            </button>
            
            {paymentLink && (
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all text-center"
              >
                Abrir Link de Pagamento
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipSubscriptionModal;

