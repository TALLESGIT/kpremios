import { Crown, Sparkles, Gift, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VipGrantedModalProps {
  isOpen: boolean;
  onClose: () => void;
  expiresAt?: string;
}

function VipGrantedModal({ isOpen, onClose, expiresAt }: VipGrantedModalProps) {
  const [progress, setProgress] = useState(100);
  const [timeLeft, setTimeLeft] = useState(10); // 10 segundos

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / 100); // 1% a cada 100ms = 10s total
        if (newProgress <= 0) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return newProgress;
      });

      setTimeLeft((prev) => {
        const newTime = prev - 0.1;
        return newTime < 0 ? 0 : newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setProgress(100);
      setTimeLeft(10);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Formatar data de expiração
  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return '01/02/2026';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '01/02/2026';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl max-w-md w-full shadow-2xl transform animate-scale overflow-hidden border-2 border-purple-500/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <Sparkles className="absolute top-2 left-2 h-8 w-8 text-yellow-300 animate-pulse" />
            <Sparkles className="absolute top-4 right-4 h-6 w-6 text-yellow-300 animate-pulse delay-300" />
            <Sparkles className="absolute bottom-2 left-1/2 h-5 w-5 text-yellow-300 animate-pulse delay-500" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Crown className="h-6 w-6 text-yellow-300" />
              </div>
              <h2 className="text-xl font-bold">Parabéns! 🎉</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* VIP Badge */}
          <div className="text-center mb-6">
            <div className="inline-block bg-gradient-to-br from-yellow-400 to-amber-500 text-purple-900 px-6 py-3 rounded-full mb-4 shadow-lg">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6" />
                <span className="text-lg font-bold">VIP GRÁTIS ATIVADO!</span>
              </div>
            </div>
            <p className="text-purple-100 text-sm">
              Você foi um dos <strong className="text-yellow-300">103 primeiros usuários</strong>!
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
            <h3 className="text-purple-200 font-semibold mb-3 flex items-center gap-2">
              <Gift className="h-5 w-5 text-yellow-300" />
              Seus Benefícios VIP:
            </h3>
            <ul className="space-y-2 text-purple-100 text-sm">
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-yellow-300 mt-0.5 flex-shrink-0" />
                <span>💎 Mensagens destacadas no chat</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-yellow-300 mt-0.5 flex-shrink-0" />
                <span>🎤 3 mensagens de áudio por live</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-yellow-300 mt-0.5 flex-shrink-0" />
                <span>📺 Mensagens na tela durante a transmissão</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-yellow-300 mt-0.5 flex-shrink-0" />
                <span>🎨 Cores personalizadas para suas mensagens</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-yellow-300 mt-0.5 flex-shrink-0" />
                <span>💬 Acesso ao grupo VIP no WhatsApp</span>
              </li>
            </ul>
          </div>

          {/* Expiry Info */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
            <p className="text-yellow-200 text-xs text-center">
              <strong>Válido até:</strong> {formatExpiryDate(expiresAt)}
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Começar a usar VIP!
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between text-xs text-purple-300 mb-2">
            <span>Fechando automaticamente</span>
            <span>{Math.ceil(timeLeft)}s</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VipGrantedModal;

