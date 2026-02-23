import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { X, Crown, Check, Loader2, Copy, QrCode, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import CustomToast from '../shared/CustomToast';

interface VipSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyPrice?: number;
}

const DEFAULT_VIP_PRICE = 5.00; // Valor padrão: R$ 5,00

const VipSubscriptionModal: React.FC<VipSubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  monthlyPrice = DEFAULT_VIP_PRICE 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser } = useData();
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [paymentStartTime, setPaymentStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutos em segundos

  // Formatar tempo restante (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Contador regressivo de 5 minutos
  useEffect(() => {
    if (!showPixPayment || !paymentStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - paymentStartTime) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Timeout atingido - limpar localStorage
        if (user) {
          const vipPaymentKey = `vip_payment_${user.id}`;
          localStorage.removeItem(vipPaymentKey);
          
          // Fechar modal de pagamento
          setShowPixPayment(false);
          setPixQrCode(null);
          setPixCode(null);
          setPaymentStartTime(null);
          
          toast.custom((t) => (
            <CustomToast 
              type="error"
              title="TEMPO DE PAGAMENTO EXPIRADO"
              message="Você pode fazer uma nova assinatura."
            />
          ), { duration: 5000 });
        } else {
          // Se não houver usuário, apenas limpar o estado
          setShowPixPayment(false);
          setPixQrCode(null);
          setPixCode(null);
          setPaymentStartTime(null);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showPixPayment, paymentStartTime, user]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    if (!user) {
      toast.custom((t) => (
        <CustomToast 
          type="warning"
          title="LOGIN NECESSÁRIO"
          message="Faça login ou cadastre-se para assinar VIP."
        />
      ), { duration: 4000 });
      
      // Pequeno delay para mostrar a mensagem antes de redirecionar
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            returnTo: window.location.pathname,
            message: 'Faça login para assinar VIP'
          } 
        });
        onClose(); // Fechar modal antes de redirecionar
      }, 1500);
      return;
    }

    try {
      setLoading(true);

      // Verificar timeout de 5 minutos usando localStorage
      const vipPaymentKey = `vip_payment_${user.id}`;
      const lastPaymentTime = localStorage.getItem(vipPaymentKey);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

      if (lastPaymentTime && parseInt(lastPaymentTime) > fiveMinutesAgo) {
        toast.custom((t) => (
          <CustomToast 
            type="error"
            title="VOCÊ JÁ INICIOU UM PAGAMENTO"
            message="Aguarde 5 minutos ou complete o pagamento anterior."
          />
        ), { duration: 5000 });
        setLoading(false);
        return;
      }

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

      // Salvar timestamp do pagamento no localStorage
      localStorage.setItem(vipPaymentKey, Date.now().toString());

      // Verificar se recebeu dados do PIX
      if (data.qr_code && data.qr_code_text) {
        const startTime = Date.now();
        setPixQrCode(data.qr_code);
        setPixCode(data.qr_code_text);
        setPaymentStartTime(startTime);
        setTimeRemaining(300);
        setShowPixPayment(true);
        toast.custom((t) => (
          <CustomToast 
            type="success"
            title="QR CODE PIX GERADO!"
            message="Complete o pagamento para ativar seu VIP."
          />
        ), { duration: 4000 });
        
        // Limpar localStorage após 5 minutos (timeout automático)
        setTimeout(() => {
          localStorage.removeItem(vipPaymentKey);
        }, 5 * 60 * 1000);
      } else if (data.payment_link) {
        // Fallback: se não tiver PIX, usar link de pagamento
        window.open(data.payment_link, '_blank');
        setPaymentLink(data.payment_link);
        toast.success('Redirecionando para o pagamento...');
        
        // Limpar localStorage após 5 minutos (timeout automático)
        setTimeout(() => {
          localStorage.removeItem(vipPaymentKey);
        }, 5 * 60 * 1000);
      } else {
        throw new Error(data.error || 'Dados de pagamento não recebidos');
      }
    } catch (error: any) {
      console.error('Erro ao criar pagamento:', error);
      const errorMessage = error.message || 'Erro ao criar pagamento. Tente novamente.';
      toast.error(`Erro ao criar pagamento: ${errorMessage}`);
      
      // Limpar localStorage em caso de erro
      if (user) {
        localStorage.removeItem(`vip_payment_${user.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixCode) {
      try {
        await navigator.clipboard.writeText(pixCode);
        toast.success('Código PIX copiado!');
      } catch (err) {
        toast.error('Erro ao copiar código');
      }
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border-2 border-purple-500/30 shadow-2xl max-w-[90vw] sm:max-w-sm w-full overflow-hidden max-h-[95vh] overflow-y-auto">
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
        <div className="p-5 space-y-4 overflow-hidden">
          {!showPixPayment ? (
            <>
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

                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              {/* PIX Payment Display */}
              <div className="text-center space-y-3">
                {/* Contador de tempo - dentro do modal */}
                {paymentStartTime && timeRemaining > 0 && (
                  <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-lg p-3 flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span className="text-xl font-black text-amber-400 font-mono">
                      {formatTime(timeRemaining)}
                    </span>
                    <span className="text-xs sm:text-sm text-amber-300">para completar o pagamento</span>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-2 mb-2">
                  <QrCode className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-black text-purple-300 uppercase">
                    Pagamento PIX
                  </h3>
                </div>

                {/* QR Code */}
                {pixQrCode && (
                  <div className="bg-white p-3 rounded-xl mx-auto w-fit">
                    <img 
                      src={`data:image/png;base64,${pixQrCode}`} 
                      alt="QR Code PIX" 
                      className="w-48 h-48"
                    />
                  </div>
                )}

                {/* PIX Code Copy */}
                {pixCode && (
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-purple-300 uppercase">
                      Código PIX (Copiar e Colar)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pixCode}
                        readOnly
                        className="flex-1 px-3 py-2 bg-slate-800 border border-purple-500/30 rounded-lg text-white text-xs font-mono break-all"
                      />
                      <button
                        onClick={copyPixCode}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all flex items-center"
                        title="Copiar código PIX"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Payment Info */}
                <div className="bg-slate-700/50 rounded-lg p-3 border border-purple-500/20">
                  <p className="text-xs text-slate-400 text-center">
                    📱 Escaneie o QR Code ou copie o código PIX
                    <br />
                    ⏱️ O pagamento será processado automaticamente
                  </p>
                </div>

                {/* Botão "Voltar" removido - apenas o X está disponível durante o pagamento pendente */}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VipSubscriptionModal;

