import { CheckCircle, X, Trophy, Sparkles, Gift } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  selectedNumber?: number;
  autoClose?: boolean;
  autoCloseTime?: number;
  showUpsell?: boolean;
  onUpsellClick?: () => void;
}

function SuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  selectedNumber,
  autoClose = true,
  autoCloseTime = 5000,
  showUpsell = false,
  onUpsellClick
}: SuccessModalProps) {
  const [progress, setProgress] = useState(100);
  const [timeLeft, setTimeLeft] = useState(autoCloseTime / 1000);

  useEffect(() => {
    if (!isOpen || !autoClose) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (autoCloseTime / 100));
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
  }, [isOpen, onClose, autoClose, autoCloseTime]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setProgress(100);
      setTimeLeft(autoCloseTime / 1000);
    }
  }, [isOpen, autoCloseTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl transform animate-scale overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <h2 className="text-lg font-bold">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {selectedNumber && (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4 mb-4 border border-amber-200">
              <div className="text-center">
                <Trophy className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                <p className="text-amber-800 font-semibold text-sm mb-1">Seu Número da Sorte</p>
                <span className="text-3xl font-bold text-amber-600">#{selectedNumber}</span>
              </div>
            </div>
          )}
          
          <p className="text-gray-600 text-center text-sm leading-relaxed mb-4">
            {message}
          </p>

          {/* Upsell Section */}
          {showUpsell && (
            <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
              <div className="text-center">
                <Gift className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                <h3 className="text-base font-bold text-amber-800 mb-2">
                  Quer mais chances de ganhar?
                </h3>
                <p className="text-amber-700 text-xs mb-3">
                  Solicite seus números extras e multiplique suas chances!
                </p>
                <div className="text-xs text-amber-600 space-y-1">
                  <p>• Cada R$ 10,00 = 100 números extras</p>
                  <p>• Números atribuídos automaticamente</p>
                  <p>• Aprovação rápida pelo admin</p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {showUpsell && onUpsellClick ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-all duration-200 text-sm"
                >
                  Depois
                </button>
                <button
                  onClick={onUpsellClick}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-2 px-4 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                >
                  Solicitar Números Extras
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
              >
                Continuar
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {autoClose && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Fechando automaticamente</span>
              <span>{Math.ceil(timeLeft)}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuccessModal;