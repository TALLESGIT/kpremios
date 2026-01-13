import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { Users, Hash, Trophy, RotateCcw, AlertTriangle, BarChart, Settings, CheckCircle, MessageSquare, Trash2, Video, Tv, Image as ImageIcon, X, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CustomToast from '../components/shared/CustomToast';

import { WhatsAppTestPanel } from '../components/admin/WhatsAppTestPanel';
import QuickTest from '../components/admin/QuickTest';
import WhatsAppMonitoringPanelSimple from '../components/admin/WhatsAppMonitoringPanelSimple';
import LiveRaffleControlPage from './admin/LiveRaffleControlPage';
import UserManagementPanel from '../components/admin/UserManagementPanel';

export default function AdminDashboardPage() {
  const {
    currentUser,
    getAvailableNumbersCount,
    getTakenNumbersCount,
    getPendingRequestsCount,
    cleanupOrphanedNumbers,
    resetAllNumbers,
    loadNumbers,
    loadRaffles
  } = useData();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDrawConfirm, setShowDrawConfirm] = useState(false);
  const [showResetNumbersConfirm, setShowResetNumbersConfirm] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [showFinishedRafflesCleanup, setShowFinishedRafflesCleanup] = useState(false);
  const [gameStatus, setGameStatus] = useState<'open' | 'closed'>('open');
  const [eliminatedNumbers, setEliminatedNumbers] = useState<number[]>([]);
  const [manualDrawNumber, setManualDrawNumber] = useState<string>('');
  const [showWhatsAppTest, setShowWhatsAppTest] = useState(false);
  const [showQuickTest, setShowQuickTest] = useState(false);
  const [showWhatsAppMonitoring, setShowWhatsAppMonitoring] = useState(false);
  const [showLiveRaffleControl, setShowLiveRaffleControl] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showDrawAnimation, setShowDrawAnimation] = useState(false);
  const [realtimeNotification, setRealtimeNotification] = useState<{ message: string, type: 'success' | 'info' | 'warning' } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [availableNumbersCount, setAvailableNumbersCount] = useState(0);
  const [takenNumbersCount, setTakenNumbersCount] = useState(0);
  const [totalRaffleNumbers, setTotalRaffleNumbers] = useState(5000);
  const [showDrawResult, setShowDrawResult] = useState(false);
  const [winnerData, setWinnerData] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [activePoolParticipants, setActivePoolParticipants] = useState(0);
  const [vipPromo103Count, setVipPromo103Count] = useState(0);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [poolParticipants, setPoolParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [activePoolId, setActivePoolId] = useState<string | null>(null);

  // Load pending requests count
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const count = await getPendingRequestsCount();
        setPendingCount(count);
      } catch (error) {

        setPendingCount(0);
      }
    };

    loadPendingCount();
  }, [getPendingRequestsCount]);

  // Load available numbers count
  useEffect(() => {
    const loadAvailableNumbersCount = async () => {
      try {
        const count = await getAvailableNumbersCount();
        setAvailableNumbersCount(count);
      } catch (error) {
        console.error('Erro ao carregar números disponíveis:', error);
        setAvailableNumbersCount(0);
      }
    };

    loadAvailableNumbersCount();
  }, [getAvailableNumbersCount]);

  // Load taken numbers count
  useEffect(() => {
    const loadTakenNumbersCount = async () => {
      try {
        const count = await getTakenNumbersCount();
        setTakenNumbersCount(count);
      } catch (error) {
        console.error('Erro ao carregar números selecionados:', error);
        setTakenNumbersCount(0);
      }
    };

    loadTakenNumbersCount();
  }, [getTakenNumbersCount]);

  // Load all dashboard data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        console.log('AdminDashboardPage - Carregando todos os dados do dashboard...');

        // Carregar participantes do bolão ativo
        const { data: activePool } = await supabase
          .from('match_pools')
          .select('id, total_participants')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activePool) {
          setActivePoolParticipants(activePool.total_participants || 0);
          setActivePoolId(activePool.id);
        } else {
          setActivePoolParticipants(0);
          setActivePoolId(null);
        }

        // Carregar contagem da promoção VIP 103 (quantos slots ainda disponíveis)
        // A promoção é para 103 primeiros usuários até 01/02/2026
        // Mostrar: 103 - (quantos já receberam VIP grátis até 01/02/2026)
        const { count: vipGrantedCount, error: vipError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_vip', true)
          .not('vip_expires_at', 'is', null)
          .lte('vip_expires_at', '2026-02-01T23:59:59.999Z');

        if (!vipError && vipGrantedCount !== null) {
          // Calcular quantos slots ainda estão disponíveis (103 - quantos já receberam)
          const availableSlots = Math.max(0, 103 - vipGrantedCount);
          setVipPromo103Count(availableSlots);
        } else {
          // Se houver erro, assumir que todos os 103 slots estão disponíveis
          setVipPromo103Count(103);
        }

        const [availableCount, takenCount, pendingCount] = await Promise.all([
          getAvailableNumbersCount(),
          getTakenNumbersCount(),
          getPendingRequestsCount()
        ]);

        setAvailableNumbersCount(availableCount);
        setTakenNumbersCount(takenCount);
        setPendingCount(pendingCount);

        console.log('AdminDashboardPage - Dados carregados:', {
          activePoolParticipants: activePool?.total_participants || 0,
          vipPromo103Count: vipCount || 0,
          availableCount,
          takenCount,
          pendingCount
        });
      } catch (error) {
        console.error('AdminDashboardPage - Erro ao carregar dados:', error);
      }
    };

    loadAllData();
  }, [getAvailableNumbersCount, getTakenNumbersCount, getPendingRequestsCount]);

  // Real-time updates for counters every 5 seconds
  useEffect(() => {
    const updateCounters = async () => {
      try {
        console.log('AdminDashboardPage - Atualizando contadores em tempo real...');
        
        // Carregar participantes do bolão ativo
        const { data: activePool } = await supabase
          .from('match_pools')
          .select('id, total_participants')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activePool) {
          setActivePoolParticipants(activePool.total_participants || 0);
          setActivePoolId(activePool.id);
        } else {
          setActivePoolParticipants(0);
          setActivePoolId(null);
        }

        // Carregar contagem da promoção VIP 103 (quantos slots ainda disponíveis)
        const { count: vipGrantedCount, error: vipError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_vip', true)
          .not('vip_expires_at', 'is', null)
          .lte('vip_expires_at', '2026-02-01T23:59:59.999Z');

        if (!vipError && vipGrantedCount !== null) {
          // Calcular quantos slots ainda estão disponíveis (103 - quantos já receberam)
          const availableSlots = Math.max(0, 103 - vipGrantedCount);
          setVipPromo103Count(availableSlots);
        } else {
          // Se houver erro, assumir que todos os 103 slots estão disponíveis
          setVipPromo103Count(103);
        }

        const [availableCount, takenCount, pendingCount] = await Promise.all([
          getAvailableNumbersCount(),
          getTakenNumbersCount(),
          getPendingRequestsCount()
        ]);

        setAvailableNumbersCount(availableCount);
        setTakenNumbersCount(takenCount);
        setPendingCount(pendingCount);

        console.log('AdminDashboardPage - Contadores atualizados:', {
          activePoolParticipants: activePool?.total_participants || 0,
          vipPromo103Count: vipCount || 0,
          availableCount,
          takenCount,
          pendingCount
        });
      } catch (error) {
        console.error('AdminDashboardPage - Erro ao atualizar contadores:', error);
      }
    };

    // Atualizar imediatamente
    updateCounters();

    // Configurar intervalo de atualização a cada 5 segundos
    const interval = setInterval(updateCounters, 5000);

    return () => clearInterval(interval);
  }, [getAvailableNumbersCount, getTakenNumbersCount, getPendingRequestsCount]);

  // Real-time subscription for dashboard updates
  useEffect(() => {
    console.log('AdminDashboardPage - Configurando subscriptions em tempo real...');

    const subscription = supabase
      .channel('dashboard-pending-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'extra_number_requests'
      }, async (payload) => {
        console.log('AdminDashboardPage - Mudança detectada em extra_number_requests:', payload);
        console.log('AdminDashboardPage - Evento:', payload.eventType);

        try {
          const count = await getPendingRequestsCount();
          setPendingCount(count);
          console.log('AdminDashboardPage - Contador de solicitações atualizado:', count);

          // Mostrar notificação de mudança em tempo real
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            if (newData?.status === 'approved') {
              setRealtimeNotification({
                message: `✅ Solicitação aprovada por outro admin!`,
                type: 'success'
              });
            } else if (newData?.status === 'rejected') {
              setRealtimeNotification({
                message: `❌ Solicitação rejeitada por outro admin!`,
                type: 'warning'
              });
            }
          } else if (payload.eventType === 'INSERT') {
            setRealtimeNotification({
              message: `📝 Nova solicitação de números extras!`,
              type: 'info'
            });
          }

          // Remover notificação após 5 segundos
          setTimeout(() => setRealtimeNotification(null), 5000);
        } catch (error) {
          console.error('AdminDashboardPage - Erro ao atualizar contador de solicitações:', error);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'numbers'
      }, async (payload) => {
        console.log('AdminDashboardPage - Mudança detectada em numbers:', payload);
        console.log('AdminDashboardPage - Evento:', payload.eventType);

        try {
          const [availableCount, takenCount] = await Promise.all([
            getAvailableNumbersCount(),
            getTakenNumbersCount()
          ]);
          setAvailableNumbersCount(availableCount);
          setTakenNumbersCount(takenCount);
          console.log('AdminDashboardPage - Contadores de números atualizados:', { availableCount, takenCount });
        } catch (error) {
          console.error('AdminDashboardPage - Erro ao atualizar contadores de números:', error);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'raffles'
      }, async (payload) => {
        console.log('AdminDashboardPage - Mudança detectada em raffles:', payload);
        console.log('AdminDashboardPage - Evento:', payload.eventType);

        try {
          // Recarregar total de números do sorteio ativo
          const { data: activeRaffle } = await supabase
            .from('raffles')
            .select('total_numbers')
            .eq('is_active', true)
            .eq('status', 'active')
            .limit(1)
            .single();

          if (activeRaffle) {
            setTotalRaffleNumbers(activeRaffle.total_numbers);
            console.log('AdminDashboardPage - Total de números do sorteio atualizado:', activeRaffle.total_numbers);
          }
        } catch (error) {
          console.error('AdminDashboardPage - Erro ao atualizar total de números do sorteio:', error);
        }
      })
      .subscribe((status) => {
        console.log('AdminDashboardPage - Status das subscriptions:', status);
      });

    return () => {
      console.log('AdminDashboardPage - Desconectando subscriptions...');
      subscription.unsubscribe();
    };
  }, [getPendingRequestsCount, getAvailableNumbersCount, getTakenNumbersCount]);



  const handleReset = async () => {
    try {

      // Reset all numbers first
      await resetAllNumbers();

      // Delete only non-admin users from the users table
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('is_admin', false); // Delete only non-admin users

      if (usersError) {

        throw new Error('Erro ao deletar usuários');
      }

      // Delete all extra number requests
      const { error: requestsError } = await supabase
        .from('extra_number_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (requestsError) {

        // Don't throw error for this, as it's not critical
      }

      // Delete all draw results
      const { error: drawResultsError } = await supabase
        .from('draw_results')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (drawResultsError) {

        // Don't throw error for this, as it's not critical
      }

      setShowResetConfirm(false);

      // Force logout to clear user session
      await supabase.auth.signOut();

      // Reload the page to refresh all data
      window.location.reload();

    } catch (error) {

      alert('Erro ao resetar o sistema. Verifique o console para mais detalhes.');
    }
  };

  const handleResetNumbers = async () => {
    try {
      await resetAllNumbers();

      // Reset approved extra number requests to pending status
      // This ensures that when numbers are reset, approved requests are also reset
      const { error: resetApprovedRequestsError } = await supabase
        .from('extra_number_requests')
        .update({
          status: 'pending',
          processed_at: null,
          processed_by: null,
          extra_numbers: null
        })
        .eq('status', 'approved');

      if (resetApprovedRequestsError) {
        console.warn('Erro ao resetar solicitações aprovadas:', resetApprovedRequestsError);
        // Don't throw error, as this is not critical for the main reset operation
      }

      // Reset user extra_numbers field for all users
      const { error: resetUserExtraNumbersError } = await supabase
        .from('users')
        .update({ extra_numbers: null })
        .not('extra_numbers', 'is', null);

      if (resetUserExtraNumbersError) {
        console.warn('Erro ao resetar números extras dos usuários:', resetUserExtraNumbersError);
        // Don't throw error, as this is not critical for the main reset operation
      }

      setShowResetNumbersConfirm(false);
    } catch (error) {
      console.error('Erro ao resetar números:', error);
      alert('Erro ao resetar números. Verifique o console para mais detalhes.');
    }
  };

  const handleDraw = async () => {
    try {
      setShowDrawConfirm(false);
      setShowDrawAnimation(true);
      setCountdown(5);

      // Contagem regressiva
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            performDraw();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {

      setShowDrawAnimation(false);
    }
  };

  const performDraw = async () => {
    try {
      // Buscar todos os números selecionados com dados dos usuários
      const { data: selectedNumbers, error } = await supabase
        .from('numbers')
        .select(`
          number,
          selected_by,
          users (
            id,
            name,
            email,
            whatsapp,
            free_number,
            extra_numbers
          )
        `)
        .eq('is_available', false)
        .not('selected_by', 'is', null);

      if (error) {
        console.error('Error fetching selected numbers:', error);
        throw error;
      }

      if (!selectedNumbers || selectedNumbers.length === 0) {
        throw new Error('Nenhum número selecionado encontrado');
      }

      // Seleção aleatória justa
      const randomIndex = Math.floor(Math.random() * selectedNumbers.length);
      const winnerNumber = selectedNumbers[randomIndex];
      const winner = Array.isArray(winnerNumber.users) ? winnerNumber.users[0] : winnerNumber.users;

      // Preparar dados do ganhador (camuflados)
      const maskedEmail = typeof winner.email === 'string' ? winner.email.replace(/(.{2}).*(@.*)/, '$1***$2') : '';
      const maskedWhatsapp = typeof winner.whatsapp === 'string' ? winner.whatsapp.replace(/(.{2}).*(.{2})/, '$1***$2') : '';

      const winnerInfo = {
        number: winnerNumber.number,
        name: winner.name, // Nome não camuflado
        email: maskedEmail,
        whatsapp: maskedWhatsapp,
        userId: winner?.id || null,
        freeNumber: winner.free_number ?? null,
        extraNumbers: winner?.extra_numbers ?? []
      };

      // Registrar resultado no banco de dados
      const { error: drawError } = await supabase
        .from('draw_results')
        .insert({
          winner_id: winner.id,
          winning_number: winnerNumber.number,
          prize_amount: 0, // Valor do prêmio (pode ser configurado)
          draw_date: new Date().toISOString(),
          created_by: currentUser?.id || 'system'
        });

      if (drawError) {
        console.error('Error saving draw result:', drawError);
        // Continuar mesmo com erro de registro
      }

      // Atualizar status do usuário como ganhador usando função RPC
      const { error: updateError } = await supabase
        .rpc('update_user_winner_status', {
          user_id: winner.id,
          is_winner: true,
          won_prize: 'Sorteio Principal'
        });

      if (updateError) {
        console.error('Error updating winner status:', updateError);
      }

      // Marcar sorteio atual como finalizado
      const { error: raffleUpdateError } = await supabase
        .from('raffles')
        .update({
          status: 'finished',
          is_active: false,
          winner_id: winner.id,
          finished_at: new Date().toISOString()
        })
        .eq('is_active', true)
        .eq('status', 'active');

      if (raffleUpdateError) {
        console.error('Error updating raffle status:', raffleUpdateError);
        throw new Error(`Erro ao finalizar sorteio: ${raffleUpdateError.message}`);
      }

      console.log('Sorteio finalizado com sucesso! Status alterado para finished e is_active para false');

      // Limpar automaticamente todas as solicitações de números extras do sorteio finalizado
      try {
        console.log('Limpando solicitações de números extras do sorteio finalizado...');
        const { error: cleanupError } = await supabase
          .from('extra_number_requests')
          .delete()
          .in('status', ['pending', 'approved']);

        if (cleanupError) {
          console.error('Erro ao limpar solicitações:', cleanupError);
        } else {
          console.log('Solicitações de números extras limpas com sucesso');
        }
      } catch (cleanupError) {
        console.error('Erro na limpeza automática:', cleanupError);
      }

      // Enviar notificação WhatsApp para o ganhador
      try {
        const { whatsappPersonalService } = await import('../services/whatsappPersonalService');
        await whatsappPersonalService.sendWinnerNotification({
          name: winner.name,
          whatsapp: winner.whatsapp,
          winningNumber: winnerNumber.number,
          prize: 'Sorteio Principal'
        });
      } catch (whatsappError) {
        console.error('WhatsApp notification error:', whatsappError);
        // Não falha a operação se o WhatsApp falhar
      }

      setWinnerData(winnerInfo);
      setShowDrawAnimation(false);
      setShowDrawResult(true);

      // Recarregar dados para refletir mudanças
      console.log('Recarregando dados após sorteio...');
      try {
        await loadNumbers();
        await loadRaffles();

        // Atualizar contadores
        const [availableCount, takenCount] = await Promise.all([
          getAvailableNumbersCount(),
          getTakenNumbersCount()
        ]);
        setAvailableNumbersCount(availableCount);
        setTakenNumbersCount(takenCount);

        console.log('Dados recarregados com sucesso após sorteio');
      } catch (reloadError) {
        console.error('Erro ao recarregar dados após sorteio:', reloadError);
      }

    } catch (error) {
      console.error('Draw error:', error);
      setShowDrawAnimation(false);
      alert(`Erro ao realizar sorteio: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleCleanup = async () => {
    try {
      await cleanupOrphanedNumbers();

      setShowCleanupConfirm(false);
    } catch (error) {

    }
  };

  const handleFinishedRafflesCleanup = async () => {
    try {
      console.log('Limpando solicitações de sorteios finalizados...');

      // Buscar sorteios finalizados
      const { data: finishedRaffles, error: rafflesError } = await supabase
        .from('raffles')
        .select('id')
        .eq('status', 'finished')
        .eq('is_active', false);

      if (rafflesError) {
        throw new Error(`Erro ao buscar sorteios finalizados: ${rafflesError.message}`);
      }

      if (!finishedRaffles || finishedRaffles.length === 0) {
        alert('Nenhum sorteio finalizado encontrado para limpeza.');
        setShowFinishedRafflesCleanup(false);
        return;
      }

      // Limpar solicitações de números extras de sorteios finalizados
      const { error: cleanupError } = await supabase
        .from('extra_number_requests')
        .delete()
        .in('raffle_id', finishedRaffles.map(r => r.id));

      if (cleanupError) {
        throw new Error(`Erro ao limpar solicitações: ${cleanupError.message}`);
      }

      console.log(`Solicitações de ${finishedRaffles.length} sorteio(s) finalizado(s) limpas com sucesso`);
      alert(`✅ Limpeza concluída!\n\nSolicitações de ${finishedRaffles.length} sorteio(s) finalizado(s) foram removidas.`);

      // Recarregar dados
      await loadRaffles();
      const count = await getPendingRequestsCount();
      setPendingCount(count);

      setShowFinishedRafflesCleanup(false);
    } catch (error) {
      console.error('Erro ao limpar sorteios finalizados:', error);
      alert(`Erro ao limpar sorteios finalizados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Funções para controle do "Resta Um"
  const toggleGameStatus = async (newStatus: 'open' | 'closed') => {
    try {
      // Buscar sorteio ativo
      const { data: activeRaffle } = await supabase
        .from('raffles')
        .select('id')
        .eq('is_active', true)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!activeRaffle) {
        alert('Nenhum sorteio ativo encontrado!');
        return;
      }

      const { data: result, error } = await supabase
        .rpc('toggle_game_status', {
          raffle_id_param: activeRaffle.id,
          new_status: newStatus
        });

      if (error) {
        throw new Error(`Erro na chamada RPC: ${error.message}`);
      }

      if (!result || !result.success) {
        throw new Error(result?.message || 'Erro ao alterar status do jogo');
      }

      setGameStatus(newStatus);
      alert(`✅ Jogo ${newStatus === 'closed' ? 'fechado' : 'aberto'} com sucesso!\n\n${newStatus === 'closed' ? 'Usuários não podem mais escolher números. Agora você pode fazer o sorteio manual.' : 'Usuários podem escolher números novamente.'}`);

    } catch (error) {
      console.error('Erro ao alterar status do jogo:', error);
      alert(`Erro ao alterar status do jogo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const eliminateNumber = async () => {
    if (!manualDrawNumber || isNaN(parseInt(manualDrawNumber))) {
      alert('Por favor, digite um número válido para eliminar.');
      return;
    }

    const numberToEliminate = parseInt(manualDrawNumber);

    if (numberToEliminate < 1 || numberToEliminate > totalRaffleNumbers) {
      alert(`Número deve estar entre 1 e ${totalRaffleNumbers}`);
      return;
    }

    if (eliminatedNumbers.includes(numberToEliminate)) {
      alert('Este número já foi eliminado!');
      return;
    }

    try {
      // Buscar sorteio ativo
      const { data: activeRaffle } = await supabase
        .from('raffles')
        .select('id')
        .eq('is_active', true)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!activeRaffle) {
        alert('Nenhum sorteio ativo encontrado!');
        return;
      }

      const { data: result, error } = await supabase
        .rpc('eliminate_number', {
          raffle_id_param: activeRaffle.id,
          number_to_eliminate: numberToEliminate
        });

      if (error) {
        throw new Error(`Erro na chamada RPC: ${error.message}`);
      }

      if (!result || !result.success) {
        throw new Error(result?.message || 'Erro ao eliminar número');
      }

      // Atualizar estado local
      setEliminatedNumbers(prev => [...prev, numberToEliminate]);
      setManualDrawNumber('');

      alert(`✅ Número ${numberToEliminate} eliminado com sucesso!\n\nTotal de números eliminados: ${result.total_eliminated}`);

    } catch (error) {
      console.error('Erro ao eliminar número:', error);
      alert(`Erro ao eliminar número: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Notificação em tempo real */}
      {realtimeNotification && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className={`px-6 py-4 rounded-lg shadow-lg border-l-4 ${realtimeNotification.type === 'success'
            ? 'bg-green-50 border-green-500 text-green-800'
            : realtimeNotification.type === 'warning'
              ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
              : 'bg-blue-50 border-blue-500 text-blue-800'
            }`}>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {realtimeNotification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : realtimeNotification.type === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <p className="font-bold">{realtimeNotification.message}</p>
                <p className="text-sm opacity-75">Atualização em tempo real</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow w-full overflow-x-hidden">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 py-6 sm:py-8 lg:py-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-2 sm:mb-4 tracking-tight" style={{
                textShadow: '2px 2px 0px rgba(251, 191, 36, 0.8)'
              }}>PAINEL ADMINISTRATIVO</h1>
              <p className="text-blue-100 text-sm sm:text-base lg:text-lg xl:text-xl font-medium">Gerencie o sistema de bolões ZK Oficial</p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 pt-4 sm:pt-6">

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { 
                label: 'Participantes', 
                value: activePoolParticipants, 
                icon: Users, 
                color: 'from-blue-600 to-blue-400', 
                shadow: 'shadow-blue-500/20',
                clickable: true,
                onClick: async () => {
                  if (!activePoolId) {
                    toast.error('Nenhum bolão ativo encontrado');
                    return;
                  }
                  setLoadingParticipants(true);
                  setShowParticipantsModal(true);
                  try {
                    const { data, error } = await supabase
                      .from('pool_bets')
                      .select(`
                        id,
                        users!inner (
                          name,
                          whatsapp
                        ),
                        predicted_home_score,
                        predicted_away_score,
                        payment_status,
                        created_at
                      `)
                      .eq('pool_id', activePoolId)
                      .eq('payment_status', 'approved')
                      .order('created_at', { ascending: false });

                    if (error) throw error;
                    setPoolParticipants(data || []);
                  } catch (err) {
                    console.error('Erro ao carregar participantes:', err);
                    toast.error('Erro ao carregar participantes');
                  } finally {
                    setLoadingParticipants(false);
                  }
                }
              },
              { label: 'Disponíveis', value: vipPromo103Count, icon: Hash, color: 'from-emerald-600 to-emerald-400', shadow: 'shadow-emerald-500/20' },
              { label: 'Selecionados', value: takenNumbersCount, icon: Trophy, color: 'from-amber-600 to-amber-400', shadow: 'shadow-amber-500/20', progress: (takenNumbersCount / totalRaffleNumbers) * 100 },
              { label: 'Conversão', value: `${takenNumbersCount > 0 ? ((takenNumbersCount / totalRaffleNumbers) * 100).toFixed(1) : '0'}%`, icon: BarChart, color: 'from-purple-600 to-purple-400', shadow: 'shadow-purple-500/20' },
            ].map((stat, idx) => (
              <div 
                key={idx} 
                onClick={stat.clickable && stat.onClick ? stat.onClick : undefined}
                className={`glass-panel group relative overflow-hidden rounded-[2rem] border border-white/5 bg-slate-800/40 p-1 hover:border-white/10 transition-all duration-500 ${stat.clickable ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
              >
                <div className="bg-slate-900/40 rounded-[1.8rem] p-6 h-full backdrop-blur-3xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} p-0.5 ${stat.shadow} shadow-lg group-hover:scale-110 transition-transform`}>
                      <div className="w-full h-full bg-slate-900 rounded-[0.9rem] flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-blue-300/40 uppercase tracking-[0.2em] mb-1">{stat.label}</h4>
                    <p className="text-3xl font-black text-white italic">{stat.value}</p>
                  </div>
                  {stat.progress !== undefined && (
                    <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${stat.color}`}
                        style={{ width: `${stat.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* DASHBOARD SECTIONS */}
          <div className="space-y-16 pb-20">

            {/* 🎥 Ferramentas de Live */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-6 px-2">
                <div className="w-1.5 h-10 bg-gradient-to-b from-red-500 to-red-700 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Ferramentas de Live</h2>
                  <p className="text-red-300/40 text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Transmissão</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reporter Link Card */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-slate-800/40 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-500 group-hover:bg-blue-500/20"></div>

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-slate-900 rounded-xl border border-white/10 shadow-lg">
                      <Video className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/20">
                      <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Novo</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">Link do Repórter Externo</h3>
                  <p className="text-slate-400 text-sm mb-6">Compartilhe este link com seus repórteres para que eles entrem ao vivo na transmissão via celular.</p>

                  <div className="flex gap-2 relative z-10">
                    <div className="flex-1 bg-slate-950/50 border border-white/5 rounded-lg px-4 py-3 text-slate-300 font-mono text-xs truncate select-all">
                      {window.location.origin}/reporter
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/reporter`);
                        alert('Link copiado para a área de transferência!');
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                      <span className="hidden sm:inline">Copiar</span>
                    </button>
                    <Link
                      to="/reporter"
                      target="_blank"
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Abrir
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* 🎯 Gestão de Sorteios */}
            <section>
              <div className="flex items-center gap-4 mb-8 px-2">
                <div className="w-1.5 h-10 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full"></div>
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">Gestão de Sorteios</h2>
                  <p className="text-blue-300/40 text-[10px] font-black uppercase tracking-[0.3em]">Operações Principais</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                {/* Controle Resta Um */}
                <div className="glass-panel rounded-[2.5rem] group relative overflow-hidden border border-white/5 bg-slate-800/40 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-500">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                        <RotateCcw className="h-8 w-8 text-blue-400" />
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${gameStatus === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                        {gameStatus === 'open' ? '🟢 Aberto' : '🔴 Fechado'}
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-4 italic uppercase">Controle Resta Um</h3>

                    <div className="space-y-4 mb-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleGameStatus('open')}
                          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase italic transition-all ${gameStatus === 'open' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-slate-900/50 text-slate-500 border border-white/5 hover:text-emerald-400'
                            }`}
                        >
                          Abrir
                        </button>
                        <button
                          onClick={() => toggleGameStatus('closed')}
                          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase italic transition-all ${gameStatus === 'closed' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-slate-900/50 text-slate-500 border border-white/5 hover:text-red-400'
                            }`}
                        >
                          Fechar
                        </button>
                      </div>

                      {gameStatus === 'closed' && (
                        <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                          <input
                            type="number"
                            value={manualDrawNumber}
                            onChange={(e) => setManualDrawNumber(e.target.value)}
                            placeholder="Nº para eliminar"
                            className="w-full px-5 py-3 bg-slate-900/50 border border-white/5 rounded-xl text-white font-bold text-center focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                          />
                          <button
                            onClick={eliminateNumber}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs uppercase italic transition-all"
                          >
                            Eliminar Número
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* 📺 ZK TV & Mídia */}
            <section>
              <div className="flex items-center gap-4 mb-8 px-2">
                <div className="w-1.5 h-10 bg-gradient-to-b from-red-500 to-indigo-700 rounded-full"></div>
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">ZK TV & Mídia</h2>
                  <p className="text-blue-300/40 text-[10px] font-black uppercase tracking-[0.3em]">Streaming e Conteúdo</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel rounded-[2.5rem] group relative overflow-hidden border border-white/5 bg-slate-800/40 p-8 hover:border-red-500/30 transition-all duration-500">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                      <Video className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="bg-red-500 animate-pulse w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3 italic uppercase">Transmissões</h3>
                  <p className="text-blue-200/60 text-sm font-medium mb-8 leading-relaxed">
                    Painel de controle de lives, chat em tempo real e integração com OBS/Agora.
                  </p>
                  <Link
                    to="/admin/live-stream"
                    className="inline-flex items-center px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-600/20 uppercase italic text-xs tracking-wider"
                  >
                    Abrir Estúdio ZK
                  </Link>
                </div>

                <div className="glass-panel rounded-[2.5rem] group relative overflow-hidden border border-white/5 bg-slate-800/40 p-8 hover:border-blue-500/30 transition-all duration-500">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                      <Tv className="h-8 w-8 text-blue-500" />
                    </div>
                    <span className="text-blue-400 text-xl">🦊</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3 italic uppercase">ZK TV</h3>
                  <p className="text-blue-200/60 text-sm font-medium mb-8 leading-relaxed">
                    Gestão de placares, próximos jogos do Cruzeiro e informações do canal.
                  </p>
                  <Link
                    to="/admin/zk-tv"
                    className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20 uppercase italic text-xs tracking-wider"
                  >
                    Gerenciar ZK TV
                  </Link>
                </div>

                {/* Banners Card */}
                <div className="glass-panel rounded-[3rem] p-1 bg-gradient-to-br from-purple-500/20 to-transparent border border-white/5">
                  <div className="bg-slate-900/90 backdrop-blur-3xl rounded-[2.8rem] p-8">
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-16 h-16 bg-purple-500/10 rounded-[1.5rem] flex items-center justify-center border border-purple-500/20">
                        <ImageIcon className="w-8 h-8 text-purple-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 italic uppercase">Banners</h3>
                    <p className="text-blue-200/60 text-sm font-medium mb-8 leading-relaxed">
                      Gerencie os banners e anúncios exibidos na homepage. Crie slides, adicione imagens e links.
                    </p>
                    <Link
                      to="/admin/banners"
                      className="inline-flex items-center px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-purple-600/20 uppercase italic text-xs tracking-wider"
                    >
                      Gerenciar Banners
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* 👥 Gestão de Comunidade */}
            <section>
              <div className="flex items-center gap-4 mb-8 px-2">
                <div className="w-1.5 h-10 bg-gradient-to-b from-blue-400 to-emerald-600 rounded-full"></div>
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">Comunidade</h2>
                  <p className="text-blue-300/40 text-[10px] font-black uppercase tracking-[0.3em]">Usuários e Solicitações</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <div className="glass-panel rounded-[3rem] p-1 bg-gradient-to-br from-blue-500/20 to-transparent border border-white/5">
                  <div className="bg-slate-900/90 backdrop-blur-3xl rounded-[2.8rem] p-8">
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-16 h-16 bg-blue-500/10 rounded-[1.5rem] flex items-center justify-center border border-blue-500/20">
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white italic uppercase">Usuários</h3>
                        <p className="text-[10px] font-black text-blue-300/40 uppercase tracking-widest">Base de Dados</p>
                      </div>
                    </div>
                    <Link
                      to="/admin/users"
                      className="w-full py-5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-3xl font-black uppercase italic text-sm transition-all text-center block"
                    >
                      Lista de Membros
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* 🛠️ Manutenção do Sistema */}
            <section>
              <div className="flex items-center gap-4 mb-8 px-2">
                <div className="w-1.5 h-10 bg-gradient-to-b from-slate-500 to-slate-800 rounded-full"></div>
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">Manutenção</h2>
                  <p className="text-blue-300/40 text-[10px] font-black uppercase tracking-[0.3em]">Segurança e Limpeza</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                {[
                  { label: 'Reset Números', icon: Hash, color: 'text-blue-400', bg: 'hover:bg-blue-500', action: () => setShowResetNumbersConfirm(true) },
                  { label: 'Limpar Órfãos', icon: Settings, color: 'text-emerald-400', bg: 'hover:bg-emerald-500', action: () => setShowCleanupConfirm(true) },
                  { label: 'Limpar Finals.', icon: Trash2, color: 'text-purple-400', bg: 'hover:bg-purple-500', action: () => setShowFinishedRafflesCleanup(true) },
                  { label: 'Reset Total', icon: RotateCcw, color: 'text-red-500', bg: 'hover:bg-red-600', action: () => setShowResetConfirm(true) },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="glass-panel group relative flex flex-col items-center justify-center p-6 rounded-[2rem] border border-white/5 bg-slate-800/20 hover:scale-[1.05] transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/10 group-hover:scale-110 group-hover:text-white group-${item.bg} transition-all`}>
                      <item.icon className={`w-6 h-6 ${item.color} group-hover:text-white`} />
                    </div>
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div >

        {/* Enhanced Confirmation Modals */}
        < div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8" >
          {showResetConfirm && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-3xl px-6 pt-6 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-3xl bg-red-100 sm:mx-0">
                      <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">
                        Confirmar Reset
                      </h3>
                      <p className="text-slate-600 leading-relaxed font-medium text-sm sm:text-base">
                        Esta ação irá remover permanentemente todos os dados do sistema:
                      </p>
                      <ul className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-500 list-disc list-inside space-y-1 sm:space-y-2 font-medium bg-red-50 p-4 rounded-2xl border border-red-100">
                        <li>Todos os usuários cadastrados</li>
                        <li>Números selecionados</li>
                        <li>Histórico de sorteios</li>
                        <li>Solicitações de números extras</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 sm:flex-row-reverse">
                    <button
                      type="button"
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold transition-all duration-300 shadow-lg text-sm sm:text-base"
                      onClick={handleReset}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all duration-300 text-sm sm:text-base"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
          }

          {
            showDrawConfirm && (
              <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-sm">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity">
                    <div className="absolute inset-0 bg-black opacity-50"></div>
                  </div>
                  <div className="inline-block align-bottom bg-white rounded-3xl px-6 pt-6 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-3xl bg-amber-100 sm:mx-0">
                        <Trophy className="h-8 w-8 text-amber-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                          Confirmar Sorteio
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          O sistema selecionará aleatoriamente um número entre os {takenNumbersCount} números
                          participantes e definirá o ganhador automaticamente.
                        </p>
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-3">
                          <div className="flex items-center text-amber-800 text-sm">
                            <Trophy className="h-4 w-4 mr-2" />
                            <span>Esta ação registrará o resultado permanentemente</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 sm:flex-row-reverse">
                      <button
                        type="button"
                        className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all shadow-lg text-sm sm:text-base"
                        onClick={handleDraw}
                      >
                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        Confirmar
                      </button>
                      <button
                        type="button"
                        className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm sm:text-base"
                        onClick={() => setShowDrawConfirm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* Modal de Contagem Regressiva */}
          {
            showDrawAnimation && (
              <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-sm">
                <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
                  <div className="fixed inset-0 transition-opacity">
                    <div className="absolute inset-0 bg-black/80"></div>
                  </div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl px-8 py-12 text-center overflow-hidden shadow-2xl transform transition-all sm:max-w-lg sm:w-full border border-amber-400/30">
                    {/* Efeito de partículas */}
                    <div className="absolute inset-0 overflow-hidden">
                      {[...Array(20)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-2 h-2 bg-amber-400 rounded-full animate-ping"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${1 + Math.random() * 2}s`
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative z-10">
                      <div className="w-24 h-24 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/25">
                        <Trophy className="h-12 w-12 text-white animate-bounce" />
                      </div>

                      <h3 className="text-3xl font-black text-white mb-4">
                        Sorteio em Andamento
                      </h3>

                      <div className="text-6xl font-black text-amber-400 mb-6 animate-pulse">
                        {countdown}
                      </div>

                      <p className="text-blue-600 text-lg font-medium">
                        Selecionando ganhador...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* Modal de Resultado */}
          {
            showDrawResult && winnerData && (
              <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-sm">
                <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
                  <div className="fixed inset-0 transition-opacity">
                    <div className="absolute inset-0 bg-black/80"></div>
                  </div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl px-8 py-12 text-center overflow-hidden shadow-2xl transform transition-all sm:max-w-2xl sm:w-full border border-emerald-400/30">
                    {/* Confetes animados */}
                    <div className="absolute inset-0 overflow-hidden">
                      {[...Array(30)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-3 h-3 bg-emerald-400 rounded-full animate-bounce"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 2}s`
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative z-10">
                      <div className="w-32 h-32 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/25">
                        <Trophy className="h-16 w-16 text-white animate-pulse" />
                      </div>

                      <h3 className="text-4xl font-black text-white mb-2">
                        🎉 GANHADOR SORTEADO! 🎉
                      </h3>

                      <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-400/30 rounded-2xl p-6 mb-8">
                        <div className="text-6xl font-black text-emerald-400 mb-4">
                          #{winnerData.number}
                        </div>
                        <p className="text-2xl font-bold text-white mb-2">
                          {winnerData.name}
                        </p>
                        <p className="text-blue-600 text-lg">
                          Parabéns! Você foi o ganhador do sorteio!
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="bg-blue-100/30 rounded-xl p-4">
                          <p className="text-slate-400 text-sm font-medium mb-1">Email</p>
                          <p className="text-white font-bold">{winnerData.email}</p>
                        </div>
                        <div className="bg-blue-100/30 rounded-xl p-4">
                          <p className="text-slate-400 text-sm font-medium mb-1">WhatsApp</p>
                          <p className="text-white font-bold">{winnerData.whatsapp}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                          onClick={() => {
                            setShowDrawResult(false);
                            setWinnerData(null);
                          }}
                          className="px-6 py-3 bg-blue-100/50 hover:bg-blue-100/70 text-blue-600 font-bold rounded-xl transition-all duration-200 border border-slate-600/30"
                        >
                          Fechar
                        </button>

                        {/* Botão WhatsApp para Admin */}
                        <button
                          onClick={() => {
                            const message = `🎉 *PARABÉNS!* 🎉

Olá *${winnerData.name}*! 

Você foi o *GANHADOR* do nosso sorteio! 🏆

📋 *Detalhes do Prêmio:*
• Número sorteado: *#${winnerData.number}*
• Prêmio: Sorteio Principal
• Data: ${new Date().toLocaleDateString('pt-BR')}

🎁 *Como receber seu prêmio:*
Entre em contato conosco para organizarmos a entrega do seu prêmio.

Obrigado por participar! 🙏`;

                            const whatsappUrl = `https://wa.me/${winnerData.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center gap-2"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                          </svg>
                          Enviar WhatsApp
                        </button>

                        <button
                          onClick={() => {
                            setShowDrawResult(false);
                            setWinnerData(null);
                            // Recarregar dados
                            window.location.reload();
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center gap-2"
                        >
                          <Trophy className="h-4 w-4" />
                          Ver Dashboard
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {
            showResetNumbersConfirm && (
              <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-sm">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity">
                    <div className="absolute inset-0 bg-black opacity-50"></div>
                  </div>
                  <div className="inline-block align-bottom bg-white rounded-3xl px-6 pt-6 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-3xl bg-blue-100 sm:mx-0">
                        <Hash className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                          Confirmar Reset de Números
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          Todos os números selecionados serão liberados e ficarão disponíveis.
                          Os usuários cadastrados serão mantidos.
                        </p>
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-3">
                          <div className="flex items-center text-blue-800 text-sm">
                            <Hash className="h-4 w-4 mr-2" />
                            <span>Esta ação liberará {takenNumbersCount} números selecionados</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 sm:flex-row-reverse">
                      <button
                        type="button"
                        className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all shadow-lg text-sm sm:text-base"
                        onClick={handleResetNumbers}
                      >
                        <Hash className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        Confirmar
                      </button>
                      <button
                        type="button"
                        className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm sm:text-base"
                        onClick={() => setShowResetNumbersConfirm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {
            showCleanupConfirm && (
              <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-sm">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity">
                    <div className="absolute inset-0 bg-black opacity-50"></div>
                  </div>
                  <div className="inline-block align-bottom bg-white rounded-3xl px-6 pt-6 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-3xl bg-emerald-100 sm:mx-0">
                        <Settings className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                          Confirmar Limpeza de Órfãos
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          Esta ação irá liberar todos os números que foram selecionados por usuários
                          que foram excluídos do sistema.
                        </p>
                        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                          <div className="flex items-center text-emerald-800 text-sm">
                            <Settings className="h-4 w-4 mr-2" />
                            <span>Esta ação é segura e não afeta usuários ativos</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 sm:flex-row-reverse">
                      <button
                        type="button"
                        className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all shadow-lg text-sm sm:text-base"
                        onClick={handleCleanup}
                      >
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        Confirmar
                      </button>
                      <button
                        type="button"
                        className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm sm:text-base"
                        onClick={() => setShowCleanupConfirm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {
            showWhatsAppTest && (
              <WhatsAppTestPanel onClose={() => setShowWhatsAppTest(false)} />
            )
          }


          {
            showQuickTest && (
              <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
                <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity">
                    <div className="absolute inset-0 bg-black/60"></div>
                  </div>
                  <div className="inline-block align-bottom bg-white rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">⚡ Teste Rápido</h3>
                      <button
                        onClick={() => setShowQuickTest(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <QuickTest />
                  </div>
                </div>
              </div>
            )
          }


          {
            showWhatsAppMonitoring && (
              <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
                <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity">
                    <div className="absolute inset-0 bg-black/60"></div>
                  </div>
                  <div className="inline-block align-bottom bg-white rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">📊 Monitoramento WhatsApp</h3>
                      <button
                        onClick={() => setShowWhatsAppMonitoring(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <WhatsAppMonitoringPanelSimple />
                  </div>
                </div>
              </div>
            )
          }


          {
            showLiveRaffleControl && (
              <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
                <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity">
                    <div className="absolute inset-0 bg-black/60"></div>
                  </div>
                  <div className="inline-block align-bottom bg-white rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">🎮 Controle de Sorteios ao Vivo</h3>
                      <button
                        onClick={() => setShowLiveRaffleControl(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <LiveRaffleControlPage />
                  </div>
                </div>
              </div>
            )
          }

          {
            showUserManagement && (
              <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
                <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity">
                    <div className="absolute inset-0 bg-black/60"></div>
                  </div>
                  <div className="inline-block align-bottom bg-white rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">👥 Gerenciamento de Usuários</h3>
                      <button
                        onClick={() => setShowUserManagement(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <UserManagementPanel />
                  </div>
                </div>
              </div>
            )
          }
        </div >

        {/* Modal de Confirmação para Limpeza de Sorteios Finalizados */}
        {
          showFinishedRafflesCleanup && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <Trash2 className="h-5 w-5 mr-2 text-purple-600" />
                      Limpar Sorteios Finalizados
                    </h3>
                    <button
                      onClick={() => setShowFinishedRafflesCleanup(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mb-6">
                    <p className="text-gray-600 leading-relaxed">
                      Esta ação irá remover todas as solicitações de números extras de sorteios que já foram finalizados.
                      <span className="text-purple-600 font-semibold"> Executado automaticamente após cada sorteio.</span>
                    </p>
                    <div className="mt-4 bg-purple-50 border border-purple-200 rounded-2xl p-3">
                      <div className="flex items-center text-purple-800 text-sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        <span>Remove apenas solicitações de sorteios finalizados</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                      type="button"
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-all shadow-lg text-sm sm:text-base"
                      onClick={handleFinishedRafflesCleanup}
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      Confirmar Limpeza
                    </button>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-2xl px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm sm:text-base"
                      onClick={() => setShowFinishedRafflesCleanup(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Modal de Participantes */}
        {showParticipantsModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" onClick={() => setShowParticipantsModal(false)}>
                <div className="absolute inset-0 bg-black/60"></div>
              </div>
              <div className="inline-block align-bottom bg-slate-900 rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase">Participantes do Bolão</h3>
                      <p className="text-sm text-blue-200/60">{poolParticipants.length} participante(s)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowParticipantsModal(false)}
                    className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {loadingParticipants ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    <p className="text-white/60 mt-4">Carregando participantes...</p>
                  </div>
                ) : poolParticipants.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60">Nenhum participante encontrado</p>
                  </div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                    {poolParticipants.map((bet: any, index: number) => (
                      <div
                        key={bet.id}
                        className="bg-slate-800/50 border border-white/5 rounded-xl p-4 hover:bg-slate-800/70 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm">
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-white font-bold">{bet.users?.name || 'Nome não disponível'}</p>
                                <div className="flex items-center gap-4 mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-blue-300/60">Palpite:</span>
                                    <span className="text-sm font-black text-white">
                                      {bet.predicted_home_score} x {bet.predicted_away_score}
                                    </span>
                                  </div>
                                  {bet.users?.whatsapp && (
                                    <a
                                      href={`https://wa.me/${bet.users.whatsapp.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                      <Phone className="w-3 h-3" />
                                      {bet.users.whatsapp}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main >
      <Footer />
    </div >
  );
}


