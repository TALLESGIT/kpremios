import React, { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';

interface VipMessage {
  id: string;
  user_name: string;
  message: string;
  created_at: string;
}

interface VipMessageOverlayProps {
  messages: VipMessage[];
}

const VipMessageOverlay: React.FC<VipMessageOverlayProps> = ({ messages }) => {
  const [currentMessage, setCurrentMessage] = useState<VipMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (messages.length === 0) {
      setIsVisible(false);
      return;
    }

    // Pegar a última mensagem VIP
    const lastVipMessage = messages[messages.length - 1];
    
    // Mostrar mensagem
    setCurrentMessage(lastVipMessage);
    setIsVisible(true);

    // Ocultar após 5 segundos
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentMessage(null);
      }, 500); // Aguardar animação de fade out
    }, 5000);

    return () => clearTimeout(timer);
  }, [messages]);

  if (!currentMessage || !isVisible) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
      style={{ maxWidth: '90%', width: '600px' }}
    >
      <div className="bg-gradient-to-r from-amber-500/95 to-amber-600/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border-2 border-amber-400/50 animate-pulse-border">
        <div className="flex items-start gap-4">
          {/* Ícone VIP */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg">
              <Crown className="text-white" size={24} />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-white text-lg">
                {currentMessage.user_name}
              </span>
              <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full font-bold flex items-center gap-1">
                <Crown size={12} />
                VIP
              </span>
            </div>
            <p className="text-white text-base leading-relaxed break-words">
              {currentMessage.message}
            </p>
          </div>
        </div>

        {/* Efeito de brilho */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none"></div>
      </div>

      <style>{`
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4);
          }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default VipMessageOverlay;

