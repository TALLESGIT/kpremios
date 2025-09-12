import { CheckCircle, X, Trophy, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  selectedNumber?: number;
  autoClose?: boolean;
  autoCloseTime?: number;
}

function SuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  selectedNumber,
  autoClose = true,
  autoCloseTime = 5000 
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
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl transform animate-scale overflow-hidden">
        {/* Header with close button */}
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>
          
          {/* Animated background */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 px-8 pt-8 pb-6">
            <div className="text-center">
              {/* Success icon with animation */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-lg">
                <CheckCircle className="h-10 w-10 text-white animate-bounce" />
                {/* Sparkle effects */}
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-spin" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {title}
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {selectedNumber && (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-6 mb-6 border border-amber-200">
              <div className="text-center">
                <Trophy className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <p className="text-amber-800 font-semibold mb-1">Seu Número da Sorte</p>
                <span className="text-4xl font-bold text-amber-600">#{selectedNumber}</span>
              </div>
            </div>
          )}
          
          <p className="text-gray-600 text-center leading-relaxed mb-6">
            {message}
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Continuar
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {autoClose && (
          <div className="px-8 pb-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Fechando automaticamente</span>
              <span>{Math.ceil(timeLeft)}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
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