import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { X, QrCode, Clock, Trophy, CheckCircle, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import CustomToast from '../shared/CustomToast';
import TeamLogo from '../TeamLogo';
import { getContextualHome } from '../../utils/navigation';

interface PoolBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId: string;
  matchTitle: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  accumulatedAmount?: number;
  totalPoolAmount?: number;
}

const PoolBetModal: React.FC<PoolBetModalProps> = ({
  isOpen,
  onClose,
  poolId,
  matchTitle,
  homeTeam,
  awayTeam,
  homeLogo,
  awayLogo,
  accumulatedAmount = 0,
  totalPoolAmount = 0
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
  const [userBets, setUserBets] = useState<any[]>([]);
  const [currentBetId, setCurrentBetId] = useState<string | null>(null); // Guardar o ID da aposta atual sendo paga
  const [paymentStartTime, setPaymentStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutos em segundos
  const timeoutTriggered = useRef(false);

  const totalPrize = (totalPoolAmount * 0.70) + accumulatedAmount;

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

    timeoutTriggered.current = false;

    const interval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - paymentStartTime) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0 && !timeoutTriggered.current) {
        timeoutTriggered.current = true;
        clearInterval(interval);

        // Timeout atingido - cancelar aposta pendente
        if (user) {
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


  // Realtime subscription to detect when payment is approved
  useEffect(() => {
    if (!isOpen || !user || !poolId) return;

    const channel = supabase
      .channel(`pool_bet_status_${poolId}_${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pool_bets',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.new.pool_id === poolId && payload.new.payment_status === 'approved') {
          // Aposta foi aprovada!
          checkExistingBet();
          
          // Se for a aposta que o usuário acabou de fazer, mostrar tela de sucesso
          if (payload.new.id === currentBetId) {
            setPaymentCompleted(true);
            setShowPixPayment(false);
            
            // Limpar localStorage
            const storageKey = `pool_payment_${poolId}_${user.id}`;
            localStorage.removeItem(storageKey);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user, poolId, currentBetId]);

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

      if (approvedBets && !error) {
        setUserBets(approvedBets);
        
        // Limpar localStorage se a aposta recente foi aprovada
        const storageKey = `pool_payment_${poolId}_${user.id}`;
        localStorage.removeItem(storageKey);
      }
    } catch (err) {
      console.error('Erro ao verificar aposta:', err);
    }
  };

  const handleBet = async () => {
    if (!user) {
      toast.custom(() => (
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

      // 🛑 Verificar se o usuário já tem uma aposta APROVADA com este MESMO PLACAR
      const { data: duplicateBet, error: checkError } = await supabase
        .from('pool_bets')
        .select('id')
        .eq('pool_id', poolId)
        .eq('user_id', user.id)
        .eq('predicted_home_score', home)
        .eq('predicted_away_score', away)
        .eq('payment_status', 'approved')
        .maybeSingle();

      if (checkError) throw checkError;

      if (duplicateBet) {
        toast.error('Você já fez uma aposta com este placar!');
        setLoading(false);
        return;
      }

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

      setCurrentBetId(betData.id); // Guardar o ID desta aposta para monitorar approval

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
            amount: 6.00
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
              const response = await fetch(`${(supabase as any).supabaseUrl}/functions/v1/create-pool-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  user_id: user.id,
                  user_email: user.email,
                  user_name: currentUser?.name || user.email?.split('@')[0] || 'Usuário',
                  bet_id: betData.id,
                  pool_id: poolId,
                  amount: 6.00
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

        toast.custom(() => (
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


  if (paymentCompleted) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-2 md:p-4" onClick={onClose}>
        <div
          className="relative w-full md:max-w-[420px] bg-slate-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Success */}
          <div className="relative p-2 md:p-3 border-b border-green-500/20 bg-gradient-to-br from-green-600/20 to-transparent flex-shrink-0">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h2 className="text-sm md:text-base font-black text-white uppercase italic">Aposta Confirmada!</h2>
              </div>
              <button onClick={onClose} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto animate-pulse" />
            <h3 className="text-lg md:text-xl font-black text-white">Obrigado por participar!</h3>
            <p className="text-xs md:text-sm text-slate-300">Sua aposta foi registrada com sucesso.</p>
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
              onClick={() => {
                setPaymentCompleted(false);
                setHomeScore('');
                setAwayScore('');
              }}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
            >
              Fazer outra aposta
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
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
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => {
        setShowPixPayment(false);
        onClose();
        navigate(getContextualHome(currentUser));
      }}>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border-2 border-blue-500/30 shadow-2xl max-w-[90vw] sm:max-w-[340px] w-full overflow-hidden max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-yellow-300" />
              <h2 className="text-xl font-black text-white uppercase">Pagamento PIX</h2>
            </div>
            <button
              onClick={() => {
                setShowPixPayment(false);
                onClose();
                navigate(getContextualHome(currentUser));
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-4 sm:p-5 space-y-2 sm:space-y-3">
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
                  Valor: R$ 6,00
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-2 md:p-4" onClick={onClose}>
      <div
        className="relative w-full md:max-w-[420px] bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Ultra compact */}
        <div className="relative p-2 md:p-3 border-b border-white/5 bg-gradient-to-br from-blue-600/20 to-transparent flex-shrink-0">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm md:text-lg font-black text-white uppercase italic leading-none">Bolão Pro</h2>
                <p className="text-[9px] md:text-[10px] text-blue-400 font-bold uppercase tracking-wider">{matchTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
          {/* Prize Section - Compact */}
          <div className="bg-slate-800/50 p-2 md:p-3 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">Prêmio Estimado</span>
              <div className="px-1.5 py-0.5 bg-green-500/10 rounded-md">
                <span className="text-[8px] md:text-[9px] text-green-400 font-black uppercase">Acumulado</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg md:text-2xl font-black text-white italic">R$ {totalPrize.toFixed(2)}</span>
            </div>
            <p className="text-[8px] md:text-[9px] text-slate-500 mt-1">
              Base: R$ {(totalPoolAmount * 0.70).toFixed(2)} + Acumulado: R$ {accumulatedAmount.toFixed(2)}
            </p>
          </div>

          {/* User Bets Section - New */}
          {userBets.length > 0 && (
            <div className="bg-emerald-500/10 p-3 md:p-4 rounded-2xl border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs md:text-sm font-black text-white uppercase tracking-wider">Você já participou!</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {userBets.map((bet, idx) => (
                    <div key={bet.id || idx} className="bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-2">
                      <span className="text-xs md:text-sm font-black text-white">
                        {bet.predicted_home_score} x {bet.predicted_away_score}
                      </span>
                    </div>
                  ))}
                </div>
                
                <p className="text-[10px] md:text-xs text-emerald-400 font-bold uppercase tracking-tight">
                  Aguarde o resultado do jogo!
                </p>
                
                <div className="h-[1px] w-full bg-emerald-500/20 my-1" />
                
                <p className="text-[9px] md:text-[10px] text-slate-400 leading-tight">
                  Você pode fazer novas apostas com resultados diferentes cada uma custa apenas <span className="text-white font-bold">R$ 6,00</span>.
                </p>
              </div>
            </div>
          )}

          {/* Teams - Small Logos */}
          <div className="flex items-center justify-center gap-4 md:gap-8 py-1 md:py-2 relative">
            <div className="text-center group">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-800 rounded-xl md:rounded-2xl border border-white/5 flex items-center justify-center mb-1 group-hover:border-blue-500/50 transition-all shadow-xl p-1.5 md:p-2">
                <TeamLogo teamName={homeTeam} customLogo={homeLogo} className="w-full h-full object-contain" />
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-white uppercase truncate w-14 md:w-16">{homeTeam}</p>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-lg md:text-xl font-black text-blue-500 italic">VS</span>
            </div>

            <div className="text-center group">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-800 rounded-xl md:rounded-2xl border border-white/5 flex items-center justify-center mb-1 group-hover:border-blue-500/50 transition-all shadow-xl p-1.5 md:p-2">
                <TeamLogo teamName={awayTeam} customLogo={awayLogo} className="w-full h-full object-contain" />
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-white uppercase truncate w-14 md:w-16">{awayTeam}</p>
            </div>
          </div>

          {/* Inputs - Compact Grid */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 bg-slate-800/30 p-3 md:p-4 rounded-2xl border border-white/5">
            <div className="space-y-1">
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase text-center truncate">{homeTeam}</p>
              <input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2 md:py-3 text-center text-lg md:text-2xl font-black text-white focus:border-blue-500/50 outline-none"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase text-center truncate">{awayTeam}</p>
              <input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2 md:py-3 text-center text-lg md:text-2xl font-black text-white focus:border-blue-500/50 outline-none"
                placeholder="0"
              />
            </div>
          </div>

          <button
            onClick={handleBet}
            disabled={loading || !homeScore || !awayScore}
            className="w-full group relative flex-shrink-0"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 md:py-4 rounded-xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase italic tracking-wider text-xs md:text-sm">Fazer Aposta Agora</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/10 rounded-md">
                    <span className="text-[10px] md:text-xs">R$ 5,00</span>
                  </div>
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoolBetModal;

