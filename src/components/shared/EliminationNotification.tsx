import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EliminationNotificationProps {
  participant: {
    user_name: string;
    lucky_number: number;
    eliminated_at: string;
  };
  onClose: () => void;
}

const EliminationNotification: React.FC<EliminationNotificationProps> = ({
  participant,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar notificação com delay para animação
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-fechar após 5 segundos
    const autoCloseTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Delay para animação de saída
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoCloseTimer);
    };
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg border border-red-500 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💀</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">
              Eliminação!
            </h3>
            <p className="text-sm">
              <span className="font-semibold">{participant.user_name}</span> 
              {' '}(Número {participant.lucky_number}) foi eliminado!
            </p>
            <p className="text-xs text-red-200 mt-1">
              {new Date(participant.eliminated_at).toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-red-200 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EliminationNotification;
