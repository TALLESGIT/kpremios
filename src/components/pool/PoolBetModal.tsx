import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { X, Target, Copy, QrCode, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface PoolBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId: string;
  matchTitle: string;
  homeTeam: string;
  awayTeam: string;
}

const PoolBetModal: React.FC<PoolBetModalProps> = ({
  isOpen,
  onClose,
  poolId,
  matchTitle,
  homeTeam,
  awayTeam
}) => {
  const { user } = useAuth();
  const { currentUser } = useData();
  const [loading, setLoading] = useState(false);
  const [homeScore, setHomeScore] = useState<string>('');
  const [awayScore, setAwayScore] = useState<string>('');
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [hasBet, setHasBet] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      checkExistingBet();
    }
  }, [isOpen, user, poolId]);

  const checkExistingBet = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('pool_bets')
        .select('*')
        .eq('pool_id', poolId)
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setHasBet(true);
        setHomeScore(data.predicted_home_score.toString());
        setAwayScore(data.predicted_away_score.toString());
      } else {
        setHasBet(false);
      }
    } catch (err) {
      console.error('Erro ao verificar aposta:', err);
    }
  };

  const handleBet = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para participar do bolão');
      return;
    }

    // Verificar se o bolão ainda está ativo
    const { data: poolData, error: poolError } = await supabase
      .from('match_pools')
      .select('is_active')
      .eq('id', poolId)
      .single();

    if (poolError || !poolData?.is_active) {
      toast.error('Este bolão está bloqueado. As apostas foram encerradas.');
      onClose();
      return;
    }

    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      toast.error('Digite placares válidos (números inteiros maiores ou iguais a zero)');
      return;
    }

    try {
      setLoading(true);

      // Criar aposta no banco (status pending)
      const { data: betData, error: betError } = await supabase
        .from('pool_bets')
        .insert({
          pool_id: poolId,
          user_id: user.id,
          predicted_home_score: home,
          predicted_away_score: away,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (betError) {
        if (betError.code === '23505') {
          toast.error('Você já participou deste bolão!');
          return;
        }
        throw betError;
      }

      // Criar pagamento PIX via Edge Function
      let paymentData: any;
      let paymentError: any;
      
      try {
        const result = await supabase.functions.invoke('create-pool-payment', {
          body: {
            user_id: user.id,
            user_email: user.email,
            user_name: currentUser?.name || user.email?.split('@')[0] || 'Usuário',
            bet_id: betData.id,
            pool_id: poolId,
            amount: 2.00
          }
        });
        
        paymentData = result.data;
        paymentError = result.error;
        
        // Se houver erro, tentar obter mais detalhes da resposta
        if (paymentError) {
          console.error('Erro retornado pelo Supabase SDK:', paymentError);
          
          // Tentar fazer uma chamada direta para obter mais detalhes
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const response = await fetch(`${supabaseUrl}/functions/v1/create-pool-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
                },
                body: JSON.stringify({
                  user_id: user.id,
                  user_email: user.email,
                  user_name: currentUser?.name || user.email?.split('@')[0] || 'Usuário',
                  bet_id: betData.id,
                  pool_id: poolId,
                  amount: 2.00
                })
              });
              
              if (!response.ok) {
                let errorBody: any;
                try {
                  errorBody = await response.json();
                } catch {
                  errorBody = await response.text();
                }
                
                console.error('Resposta HTTP de erro:', {
                  status: response.status,
                  statusText: response.statusText,
                  body: errorBody
                });
                
                // Adicionar detalhes ao erro
                if (errorBody) {
                  paymentError = {
                    ...paymentError,
                    httpStatus: response.status,
                    httpStatusText: response.statusText,
                    responseBody: errorBody,
                    message: errorBody.message || errorBody.error || paymentError.message
                  };
                }
              }
            }
          } catch (fetchError: any) {
            console.error('Erro ao tentar obter detalhes via fetch direto:', fetchError);
          }
        }
      } catch (invokeError: any) {
        console.error('Erro ao invocar Edge Function:', invokeError);
        paymentError = invokeError;
      }

      if (paymentError) {
        console.error('Erro na Edge Function:', paymentError);
        console.error('Tipo do erro:', typeof paymentError);
        console.error('Detalhes completos do erro:', JSON.stringify(paymentError, Object.getOwnPropertyNames(paymentError), 2));
        
        // Tentar extrair detalhes do erro
        let errorMessage = 'Erro ao criar pagamento';
        let errorDetails: any = {};
        
        if (paymentError.message) {
          errorMessage = paymentError.message;
        }
        
        if (paymentError.context) {
          errorDetails = paymentError.context;
          if (paymentError.context.message) {
            errorMessage = paymentError.context.message;
          }
          if (paymentError.context.error) {
            errorMessage = paymentError.context.error;
          }
        }
        
        if (paymentError.error) {
          errorMessage = paymentError.error;
        }
        
        if (paymentError.details) {
          errorDetails = { ...errorDetails, ...paymentError.details };
        }
        
        console.error('Mensagem de erro extraída:', errorMessage);
        console.error('Detalhes adicionais:', errorDetails);
        
        // Se der erro no pagamento, remover a aposta criada
        await supabase.from('pool_bets').delete().eq('id', betData.id);
        
        // Construir mensagem de erro mais informativa
        if (errorDetails.message) {
          errorMessage = errorDetails.message;
        } else if (errorDetails.error) {
          errorMessage = errorDetails.error;
        }
        
        throw new Error(errorMessage || 'Erro ao criar pagamento');
      }

      if (!paymentData) {
        console.error('Resposta vazia da Edge Function');
        await supabase.from('pool_bets').delete().eq('id', betData.id);
        throw new Error('Resposta vazia da Edge Function');
      }

      // Verificar se recebeu dados do PIX
      if (paymentData.qr_code && paymentData.qr_code_text) {
        setPixQrCode(paymentData.qr_code);
        setPixCode(paymentData.qr_code_text);
        setShowPixPayment(true);
        toast.success('QR Code PIX gerado! Complete o pagamento para confirmar sua aposta.');
      } else {
        throw new Error('Dados de pagamento não recebidos');
      }
    } catch (error: any) {
      console.error('Erro ao criar aposta:', error);
      console.error('Detalhes completos do erro:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        data: error.data
      });
      
      // Mensagem de erro mais detalhada
      let errorMessage = 'Erro ao participar do bolão. Tente novamente.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
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

  if (!isOpen) return null;

  if (hasBet) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-blue-500/30 shadow-2xl max-w-sm w-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-yellow-300" />
              <h2 className="text-xl font-black text-white uppercase">Você já participou!</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-6 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
            <p className="text-white font-bold">Sua aposta:</p>
            <div className="text-4xl font-black text-blue-400">
              {homeScore} x {awayScore}
            </div>
            <p className="text-sm text-slate-400">Aguarde o resultado do jogo!</p>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-green-500/30 shadow-2xl max-w-sm w-full overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-white" />
              <h2 className="text-xl font-black text-white uppercase">Aposta Confirmada!</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-6 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto animate-pulse" />
            <h3 className="text-2xl font-black text-white">Obrigado por participar!</h3>
            <p className="text-slate-300">Sua aposta foi registrada com sucesso.</p>
            <div className="bg-slate-700/50 rounded-xl p-4 border border-green-500/20">
              <p className="text-sm text-slate-400 mb-2">Sua aposta:</p>
              <div className="text-3xl font-black text-green-400">
                {homeScore} x {awayScore}
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Boa sorte! O resultado será divulgado após o jogo.
            </p>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showPixPayment) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-blue-500/30 shadow-2xl max-w-sm w-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-yellow-300" />
              <h2 className="text-xl font-black text-white uppercase">Pagamento PIX</h2>
            </div>
            <button
              onClick={() => {
                setShowPixPayment(false);
                setPixQrCode(null);
                setPixCode(null);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <QrCode className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-black text-blue-300 uppercase">
                  Valor: R$ 2,00
                </h3>
              </div>

              {pixQrCode && (
                <div className="bg-white p-3 rounded-xl mx-auto w-fit">
                  <img 
                    src={`data:image/png;base64,${pixQrCode}`} 
                    alt="QR Code PIX" 
                    className="w-48 h-48"
                  />
                </div>
              )}

              {pixCode && (
                <div className="space-y-2">
                  <label className="block text-xs font-black text-blue-300 uppercase">
                    Código PIX (Copiar e Colar)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pixCode}
                      readOnly
                      className="flex-1 px-3 py-2 bg-slate-800 border border-blue-500/30 rounded-lg text-white text-xs font-mono break-all"
                    />
                    <button
                      onClick={copyPixCode}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center"
                      title="Copiar código PIX"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-slate-700/50 rounded-lg p-3 border border-blue-500/20">
                <p className="text-xs text-slate-400 text-center">
                  📱 Escaneie o QR Code ou copie o código PIX
                  <br />
                  ⏱️ Após o pagamento, sua aposta será confirmada automaticamente
                </p>
              </div>

              <button
                onClick={() => {
                  setShowPixPayment(false);
                  setPixQrCode(null);
                  setPixCode(null);
                }}
                className="w-full px-6 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-sm"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-blue-500/30 shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-yellow-300" />
            <h2 className="text-xl font-black text-white uppercase">Participar do Bolão</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-2">{matchTitle}</p>
            <div className="flex items-center justify-center gap-4 text-lg font-black text-white">
              <span>{homeTeam}</span>
              <span className="text-blue-400">vs</span>
              <span>{awayTeam}</span>
            </div>
          </div>

                <div className="bg-slate-700/50 rounded-xl p-4 border border-blue-500/20">
                  <p className="text-xs text-slate-400 text-center mb-3">
                    💰 Valor da aposta: <span className="text-green-400 font-black">R$ 2,00</span>
                  </p>
                  <p className="text-xs text-slate-400 text-center">
                    🎯 Acerte o placar exato e divida o prêmio com outros ganhadores!
                  </p>
                </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-blue-300 uppercase mb-2">
                Placar - {homeTeam}
              </label>
              <input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-blue-500/30 rounded-xl text-white text-center text-2xl font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div className="text-center text-blue-400 font-black text-xl">x</div>

            <div>
              <label className="block text-xs font-black text-blue-300 uppercase mb-2">
                Placar - {awayTeam}
              </label>
              <input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-blue-500/30 rounded-xl text-white text-center text-2xl font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <button
            onClick={handleBet}
            disabled={loading || !homeScore || !awayScore}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black rounded-xl uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Target className="w-5 h-5" />
                Apostar R$ 2,00
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
      </div>
    </div>
  );
};

export default PoolBetModal;

