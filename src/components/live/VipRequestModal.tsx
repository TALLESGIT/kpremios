import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { X, Copy, Check, Crown, QrCode } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface VipRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VipRequestModal: React.FC<VipRequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'request' | 'payment' | 'confirm'>('request');

  const VIP_PRICE = 29.90; // Valor do VIP (pode ser configurável)

  // Gerar solicitação VIP
  const handleRequestVip = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para se tornar VIP');
      return;
    }

    setLoading(true);
    try {
      // Buscar user_id da tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        toast.error('Erro ao buscar dados do usuário');
        return;
      }

      // Gerar código de confirmação usando função SQL
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_vip_confirmation_code');

      if (codeError) {
        toast.error('Erro ao gerar código');
        return;
      }

      const confirmationCode = codeData || `VIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Criar registro de pagamento
      const { data: payment, error: paymentError } = await supabase
        .from('vip_payments')
        .insert({
          user_id: userData.id,
          amount: VIP_PRICE,
          status: 'pending',
          confirmation_code: confirmationCode,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Erro ao criar pagamento:', paymentError);
        toast.error('Erro ao criar solicitação de VIP');
        return;
      }

      setPaymentData(payment);
      setConfirmationCode(confirmationCode);
      setStep('payment');
      toast.success('Solicitação criada! Complete o pagamento.');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar pagamento com código
  const handleConfirmPayment = async () => {
    if (!confirmationCode.trim()) {
      toast.error('Digite o código de confirmação');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('confirm_vip_payment', {
          p_confirmation_code: confirmationCode.trim().toUpperCase()
        });

      if (error) {
        console.error('Erro:', error);
        toast.error('Erro ao confirmar pagamento');
        return;
      }

      if (data && (data as any).success) {
        toast.success('VIP ativado com sucesso! 🎉');
        onSuccess();
        onClose();
        setStep('request');
        setConfirmationCode('');
        setPaymentData(null);
      } else {
        toast.error((data as any).message || 'Código inválido ou expirado');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao confirmar pagamento');
    } finally {
      setLoading(false);
    }
  };

  // Copiar código PIX (simulado - você pode integrar com API real)
  const copyPixCode = () => {
    // Aqui você pode gerar um QR Code PIX real ou usar um código estático
    const pixCode = `00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865802BR5925ZK PREMIOS VIP6009SAO PAULO62070503***6304${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 rounded-2xl p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-amber-500/30 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crown className="text-amber-400" size={28} />
            <h2 className="text-2xl font-bold text-white">Tornar-se VIP</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Step 1: Solicitação */}
        {step === 'request' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-xl p-6 border border-amber-500/30">
              <h3 className="text-xl font-bold text-white mb-4">Benefícios VIP</h3>
              <ul className="space-y-2 text-slate-200">
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✨</span>
                  Mensagens destacadas no topo da tela
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">👑</span>
                  Badge VIP no chat
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">🎨</span>
                  Destaque visual nas mensagens
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">⚡</span>
                  Prioridade em sorteios
                </li>
              </ul>
            </div>

            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400 mb-2">
                R$ {VIP_PRICE.toFixed(2)}
              </p>
              <p className="text-slate-400 text-sm">Válido por 30 dias</p>
            </div>

            <button
              onClick={handleRequestVip}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Crown size={20} />
                  Solicitar VIP
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Pagamento */}
        {step === 'payment' && paymentData && (
          <div className="space-y-6">
            <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
              <h3 className="text-lg font-bold text-white mb-4">Instruções de Pagamento</h3>
              <ol className="space-y-3 text-slate-200 text-sm">
                <li className="flex gap-3">
                  <span className="font-bold text-amber-400">1.</span>
                  <span>Abra seu app de pagamento (banco, PicPay, etc.)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-amber-400">2.</span>
                  <span>Escaneie o QR Code ou copie o código PIX</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-amber-400">3.</span>
                  <span>Pague o valor de <strong className="text-amber-400">R$ {VIP_PRICE.toFixed(2)}</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-amber-400">4.</span>
                  <span>Após pagar, volte aqui e digite o código de confirmação</span>
                </li>
              </ol>
            </div>

            {/* QR Code Placeholder */}
            <div className="bg-white p-3 md:p-4 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <QrCode className="w-32 h-32 md:w-40 md:h-40 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">QR Code PIX</p>
                <p className="text-xs text-slate-400 mt-2">
                  (Integre com API de geração de QR Code PIX)
                </p>
              </div>
            </div>

            {/* Código PIX */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Código PIX (Copiar e Colar)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865802BR5925ZK PREMIOS VIP6009SAO PAULO62070503***6304ABCD"
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 text-xs"
                />
                <button
                  onClick={copyPixCode}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Código de Confirmação */}
            <div className="bg-amber-500/20 rounded-xl p-4 border border-amber-500/30">
              <p className="text-sm text-amber-300 mb-2">
                <strong>Seu código de confirmação:</strong>
              </p>
              <p className="text-2xl font-bold text-amber-400 font-mono">
                {confirmationCode}
              </p>
              <p className="text-xs text-amber-300/70 mt-2">
                Guarde este código! Você precisará dele após o pagamento.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('request');
                  setPaymentData(null);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 rounded-xl font-bold transition-all"
              >
                Já Paguei
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmação */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
              <h3 className="text-lg font-bold text-white mb-4">Confirmar Pagamento</h3>
              <p className="text-slate-300 text-sm mb-4">
                Digite o código de confirmação que você recebeu:
              </p>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                placeholder="VIP-XXXXXX"
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-xl border border-slate-600 focus:border-amber-500 focus:outline-none font-mono text-center text-lg"
                maxLength={10}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('payment')}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={loading || !confirmationCode.trim()}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VipRequestModal;

