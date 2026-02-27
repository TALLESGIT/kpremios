import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { X, Target, Copy, QrCode, Loader2, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import CustomToast from '../shared/CustomToast';
import TeamLogo from '../TeamLogo';

interface PoolBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId: string;
  matchTitle: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

const PoolBetModal: React.FC<PoolBetModalProps> = ({
  isOpen,
  onClose,
  poolId,
  matchTitle,
  homeTeam,
  awayTeam,
  homeTeamLogo,
  awayTeamLogo
}) => {
  const { user } = useAuth();
  const { currentUser } = useData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [homeScore, setHomeScore] = useState<string>('');
  const [awayScore, setAwayScore] = useState<string>('');
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [hasBet, setHasBet] = useState(false);
  const [paymentStartTime, setPaymentStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutos em segundos

  useEffect(() => {
    if (isOpen && user) {
      checkExistingBet();
      restorePaymentFromStorage();
    }
  }, [isOpen, user, poolId]);

  // Restaurar dados de pagamento do localStorage se houver
  const restorePaymentFromStorage = () => {
    if (!user) return;

    const storageKey = `pool_payment_${poolId}_${user.id}`;
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      try {
        const { qrCode, pixCode, startTime } = JSON.parse(storedData);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, 300 - elapsed);

        if (remaining > 0 && qrCode && pixCode) {
          // Ainda está dentro dos 5 minutos
          setPixQrCode(qrCode);
          setPixCode(pixCode);
          setPaymentStartTime(startTime);
          setTimeRemaining(remaining);
          setShowPixPayment(true);
        } else {
          // Timeout expirado, limpar localStorage
          localStorage.removeItem(storageKey);
        }
      } catch (err) {
        console.error('Erro ao restaurar pagamento do localStorage:', err);
        localStorage.removeItem(storageKey);
      }
    }
  };

  // Contador regressivo de 5 minutos
  useEffect(() => {
    if (!showPixPayment || !paymentStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - paymentStartTime) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Timeout atingido - cancelar aposta pendente
        if (user) {
          const cancelBet = async () => {
            try {
              // Cancelar aposta pendente no banco de dados
              await supabase
                .from('pool_bets')
                .update({ payment_status: 'cancelled' })
                .eq('pool_id', poolId)
                .eq('user_id', user.id)
                .eq('payment_status', 'pending');

              // Limpar localStorage
              const storageKey = `pool_payment_${poolId}_${user.id}`;
              localStorage.removeItem(storageKey);

              // Fechar modal de pagamento
              setShowPixPayment(false);
              setPixQrCode(null);
              setPixCode(null);
              setPaymentStartTime(null);

              toast.error('Tempo de pagamento expirado. A aposta foi cancelada. Você pode fazer uma nova aposta.');
            } catch (err) {
              console.error('Erro ao cancelar aposta:', err);
              // Mesmo com erro, limpar o estado local
              setShowPixPayment(false);
              setPixQrCode(null);
              setPixCode(null);
              setPaymentStartTime(null);
              const storageKey = `pool_payment_${poolId}_${user.id}`;
              localStorage.removeItem(storageKey);
              toast.error('Tempo de pagamento expirado. Você pode fazer uma nova aposta.');
            }
          };
          cancelBet();
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
  }, [showPixPayment, paymentStartTime]);


  const checkExistingBet = async () => {
    if (!user) return;
    try {
      // Verificar se há apostas pendentes antigas (mais de 5 minutos) e cancelá-las
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Cancelar apostas pendentes antigas deste usuário neste bolão
      await supabase
        .from('pool_bets')
        .update({ payment_status: 'cancelled' })
        .eq('pool_id', poolId)
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .lt('created_at', fiveMinutesAgo);

      // Buscar todas as apostas aprovadas (pagas) para mostrar
      const { data: approvedBets, error } = await supabase
        .from('pool_bets')
        .select('*')
        .eq('pool_id', poolId)
        .eq('user_id', user.id)
        .eq('payment_status', 'approved')
        .order('created_at', { ascending: false });

      // Se houver pelo menos uma aposta aprovada, mostrar a mais recente
      if (approvedBets && approvedBets.length > 0 && !error) {
        const mostRecentBet = approvedBets[0];
        setHasBet(true);
        setHomeScore(mostRecentBet.predicted_home_score.toString());
        setAwayScore(mostRecentBet.predicted_away_score.toString());

        // Limpar localStorage se a aposta foi aprovada
        const storageKey = `pool_payment_${poolId}_${user.id}`;
        localStorage.removeItem(storageKey);
      } else {
        setHasBet(false);
      }
    } catch (err) {
      console.error('Erro ao verificar aposta:', err);
      setHasBet(false);
    }
  };

  const handleBet = async () => {
    if (!user) {
      toast.custom((t) => (
        <CustomToast
          type="warning"
          title="LOGIN NECESSÁRIO"
          message="Faça login ou cadastre-se para participar do bolão."
        />
      ), { duration: 4000 });

      // Pequeno delay para mostrar a mensagem antes de redirecionar
      setTimeout(() => {
        navigate('/login', {
          state: {
            returnTo: window.location.pathname,
            message: 'Faça login para participar do bolão'
          }
        });
        onClose(); // Fechar modal antes de redirecionar
      }, 1500);
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

      // Verificar e gerenciar apostas existentes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Buscar todas as apostas existentes deste usuário neste bolão
      const { data: existingBets } = await supabase
        .from('pool_bets')
        .select('*')
        .eq('pool_id', poolId)
        .eq('user_id', user.id);

      if (existingBets && existingBets.length > 0) {
        // Verificar se há aposta pendente recente (menos de 5 minutos) - não permite nova aposta pendente
        const recentPendingBet = existingBets.find(
          bet => bet.payment_status === 'pending' && new Date(bet.created_at) > new Date(fiveMinutesAgo)
        );
        if (recentPendingBet) {
          toast.error('Você já tem uma aposta pendente. Complete o pagamento primeiro!');
          setLoading(false);
          return;
        }

        // Deletar apostas pendentes antigas (mais de 5 minutos), canceladas ou falhadas
        // Isso permite que o usuário faça novas apostas
        const betsToDelete = existingBets.filter(
          bet =>
            bet.payment_status === 'cancelled' ||
            bet.payment_status === 'failed' ||
            (bet.payment_status === 'pending' && new Date(bet.created_at) <= new Date(fiveMinutesAgo))
        );

        if (betsToDelete.length > 0) {
          await supabase
            .from('pool_bets')
            .delete()
            .in('id', betsToDelete.map(bet => bet.id));
        }
      }

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
          toast.error('Erro ao criar aposta. Tente novamente em alguns segundos.');
          setLoading(false);
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
        const startTime = Date.now();
        setPixQrCode(paymentData.qr_code);
        setPixCode(paymentData.qr_code_text);
        setPaymentStartTime(startTime);
        setTimeRemaining(300);
        setShowPixPayment(true);

        // Salvar no localStorage para recuperar depois
        if (user) {
          const storageKey = `pool_payment_${poolId}_${user.id}`;
          localStorage.setItem(storageKey, JSON.stringify({
            qrCode: paymentData.qr_code,
            pixCode: paymentData.qr_code_text,
            startTime: startTime
          }));
        }

        toast.custom((t) => (
          <CustomToast
            type="success"
            title="QR CODE PIX GERADO!"
            message="Complete o pagamento para confirmar sua aposta."
          />
        ), { duration: 4000 });
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

  // Formatar tempo restante (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  if (hasBet) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border-2 border-blue-500/30 shadow-2xl max-w-[90vw] sm:max-w-sm w-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
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
          <div className="p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mx-auto" />
            <p className="text-white font-bold text-sm sm:text-base">Sua aposta:</p>
            <div className="text-3xl sm:text-4xl font-black text-blue-400">
              {homeScore} x {awayScore}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Aguarde o resultado do jogo!</p>
            <button
              onClick={onClose}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
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
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border-2 border-green-500/30 shadow-2xl max-w-[90vw] sm:max-w-sm w-full overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
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
          <div className="p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mx-auto animate-pulse" />
            <h3 className="text-xl sm:text-2xl font-black text-white">Obrigado por participar!</h3>
            <p className="text-sm sm:text-base text-slate-300">Sua aposta foi registrada com sucesso.</p>
            <div className="bg-slate-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-500/20">
              <p className="text-xs sm:text-sm text-slate-400 mb-2">Sua aposta:</p>
              <div className="text-2xl sm:text-3xl font-black text-green-400">
                {homeScore} x {awayScore}
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Boa sorte! O resultado será divulgado após o jogo.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
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
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border-2 border-blue-500/30 shadow-2xl max-w-[90vw] sm:max-w-sm w-full overflow-hidden max-h-[95vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-yellow-300" />
              <h2 className="text-xl font-black text-white uppercase">Pagamento PIX</h2>
            </div>
            <button
              onClick={() => {
                // Ao clicar no X, fecha o modal e redireciona para home (sem recarregar)
                setShowPixPayment(false);
                onClose();
                // Redirecionar para home usando React Router (sem recarregar página)
                navigate('/');
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-4 sm:p-5 space-y-2 sm:space-y-3">
            {/* Contador de tempo - dentro do modal */}
            {paymentStartTime && (
              <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-lg p-3 flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-xl font-black text-amber-400 font-mono">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-xs sm:text-sm text-amber-300">para completar o pagamento</span>
              </div>
            )}

            <div className="text-center space-y-2 sm:space-y-3">
              <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                <h3 className="text-sm sm:text-base font-black text-blue-300 uppercase">
                  Valor: R$ 2,00
                </h3>
              </div>

              {pixQrCode && (
                <div className="bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl mx-auto w-fit">
                  <img
                    src={`data:image/png;base64,${pixQrCode}`}
                    alt="QR Code PIX"
                    className="w-40 h-40 sm:w-48 sm:h-48"
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

              {/* Botão "Voltar" removido - apenas o X está disponível durante o pagamento pendente */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border-2 border-blue-500/30 shadow-2xl max-w-[90vw] sm:max-w-sm w-full overflow-hidden max-h-[95vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
            <h2 className="text-base sm:text-xl font-black text-white uppercase">Participar do Bolão</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-4">{matchTitle}</p>
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex flex-col items-center gap-2">
                <TeamLogo teamName={homeTeam} customLogo={homeTeamLogo} size="lg" showName={false} />
                <span className="text-sm font-black text-white uppercase tracking-tight">{homeTeam}</span>
              </div>
              <div className="text-xl font-black italic text-slate-600 self-center mt-[-20px]">VS</div>
              <div className="flex flex-col items-center gap-2">
                <TeamLogo teamName={awayTeam} customLogo={awayTeamLogo} size="lg" showName={false} />
                <span className="text-sm font-black text-white uppercase tracking-tight">{awayTeam}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-500/20">
            <p className="text-xs text-slate-400 text-center mb-2 sm:mb-3">
              💰 Valor da aposta: <span className="text-green-400 font-black">R$ 2,00</span>
            </p>
            <p className="text-xs text-slate-400 text-center">
              🎯 Acerte o placar exato e divida o prêmio com outros ganhadores!
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs font-black text-blue-300 uppercase mb-1.5 sm:mb-2">
                Placar - {homeTeam}
              </label>
              <input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-800 border border-blue-500/30 rounded-lg sm:rounded-xl text-white text-center text-xl sm:text-2xl font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div className="text-center text-blue-400 font-black text-lg sm:text-xl">x</div>

            <div>
              <label className="block text-xs font-black text-blue-300 uppercase mb-1.5 sm:mb-2">
                Placar - {awayTeam}
              </label>
              <input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-800 border border-blue-500/30 rounded-lg sm:rounded-xl text-white text-center text-xl sm:text-2xl font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <button
            onClick={handleBet}
            disabled={loading || !homeScore || !awayScore}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black rounded-lg sm:rounded-xl uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 text-sm sm:text-base"
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
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoolBetModal;

