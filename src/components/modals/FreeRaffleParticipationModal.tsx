import React, { useState } from 'react';
import { X, Gift, Star, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface FreeRaffle {
  id: string;
  title: string;
  description: string;
  prize: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  max_participants: number;
  current_participants: number;
  created_at: string;
}

interface FreeRaffleParticipationModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffle: FreeRaffle;
  onParticipate: (raffleId: string) => Promise<{ success: boolean; message: string }>;
}

const FreeRaffleParticipationModal: React.FC<FreeRaffleParticipationModalProps> = ({
  isOpen,
  onClose,
  raffle,
  onParticipate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleParticipate = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await onParticipate(raffle.id);
      setResult(response);
      
      if (response.success) {
        // Fechar modal após 2 segundos se sucesso
        setTimeout(() => {
          onClose();
          setResult(null);
        }, 2000);
      }
    } catch (error) {
      setResult({ success: false, message: 'Erro inesperado. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setResult(null);
    }
  };

  const progressPercentage = Math.round((raffle.current_participants / raffle.max_participants) * 100);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md border border-slate-600/30 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">Participar do Sorteio</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="w-8 h-8 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50"
          >
            <X className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        {/* Conteúdo do Sorteio */}
        <div className="space-y-4 sm:space-y-6">
          {/* Título e Descrição */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{raffle.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{raffle.description}</p>
          </div>

          {/* Prêmio */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-xl p-4 border border-amber-400/20">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-amber-200 text-sm">Prêmio</span>
            </div>
            <p className="text-white font-bold text-base sm:text-lg">{raffle.prize}</p>
          </div>

          {/* Participantes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 text-sm font-medium">Participantes</span>
              <span className="text-white font-bold text-sm">
                {raffle.current_participants} / {raffle.max_participants}
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-slate-400 text-xs mt-1">{progressPercentage}% das vagas preenchidas</p>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400 font-medium block mb-1">Início</span>
              <p className="text-white font-bold">
                {new Date(raffle.start_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block mb-1">Fim</span>
              <p className="text-white font-bold">
                {new Date(raffle.end_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Resultado da Ação */}
          {result && (
            <div className={`p-4 rounded-xl border ${
              result.success 
                ? 'bg-emerald-500/10 border-emerald-400/20' 
                : 'bg-red-500/10 border-red-400/20'
            }`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                <p className={`text-sm font-medium ${
                  result.success ? 'text-emerald-200' : 'text-red-200'
                }`}>
                  {result.message}
                </p>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 font-bold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleParticipate}
              disabled={isLoading || result?.success}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Participando...
                </>
              ) : result?.success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Participação Confirmada!
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  Participar Agora
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeRaffleParticipationModal;