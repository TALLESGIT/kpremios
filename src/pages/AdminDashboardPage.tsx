import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { LogOut, Users, Hash, Trophy, RotateCcw, AlertTriangle, BarChart, TrendingUp, Award, Settings, CheckCircle, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WhatsAppTestPanel } from '../components/admin/WhatsAppTestPanel';
import SandboxTest from '../components/admin/SandboxTest';
import QuickTest from '../components/admin/QuickTest';
import WhatsAppMonitoringPanelSimple from '../components/admin/WhatsAppMonitoringPanelSimple';
import WhatsAppBulkNotificationPanelSimple from '../components/admin/WhatsAppBulkNotificationPanelSimple';
import VonageTestPanel from '../components/admin/VonageTestPanel';
import WhatsAppBusinessTestPanel from '../components/admin/WhatsAppBusinessTestPanel';
import LiveRaffleControlPage from './admin/LiveRaffleControlPage';
import UserManagementPanel from '../components/admin/UserManagementPanel';

export default function AdminDashboardPage() {
  const { signOut } = useAuth();
  const { 
    currentUser,
    numbers,
    getAvailableNumbersCount, 
    getTakenNumbersCount,
    resetAllNumbers,
    cleanupOrphanedNumbers,
    getPendingRequestsCount
  } = useData();
  const navigate = useNavigate();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDrawConfirm, setShowDrawConfirm] = useState(false);
  const [showResetNumbersConfirm, setShowResetNumbersConfirm] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [showWhatsAppTest, setShowWhatsAppTest] = useState(false);
  const [showVonageTest, setShowVonageTest] = useState(false);
  const [showWhatsAppBusinessTest, setShowWhatsAppBusinessTest] = useState(false);
  const [showSandboxTest, setShowSandboxTest] = useState(false);
  const [showQuickTest, setShowQuickTest] = useState(false);
  const [showWhatsAppMonitoring, setShowWhatsAppMonitoring] = useState(false);
  const [showWhatsAppBulk, setShowWhatsAppBulk] = useState(false);
  const [showLiveRaffleControl, setShowLiveRaffleControl] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showDrawAnimation, setShowDrawAnimation] = useState(false);
  const [showDrawResult, setShowDrawResult] = useState(false);
  const [winnerData, setWinnerData] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);

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

  // Real-time subscription for dashboard updates
  useEffect(() => {
    const subscription = supabase
      .channel('dashboard-pending-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'extra_number_requests' 
      }, async () => {

        try {
          const count = await getPendingRequestsCount();
          setPendingCount(count);
        } catch (error) {

        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [getPendingRequestsCount]);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

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

      setShowResetNumbersConfirm(false);
    } catch (error) {

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
          users!inner (
            id,
            name,
            email,
            whatsapp,
            free_number,
            extra_numbers
          )
        `)
        .eq('is_available', false);

      if (error) throw error;

      if (!selectedNumbers || selectedNumbers.length === 0) {
        throw new Error('Nenhum número selecionado encontrado');
      }

      // Seleção aleatória justa
      const randomIndex = Math.floor(Math.random() * selectedNumbers.length);
      const winnerNumber = selectedNumbers[randomIndex];
      const winner = winnerNumber.users;

      // Preparar dados do ganhador (camuflados)
      const maskedEmail = winner.email.replace(/(.{2}).*(@.*)/, '$1***$2');
      const maskedWhatsapp = winner.whatsapp.replace(/(.{2}).*(.{2})/, '$1***$2');

      const winnerInfo = {
        number: winnerNumber.number,
        name: winner.name, // Nome não camuflado
        email: maskedEmail,
        whatsapp: maskedWhatsapp,
        userId: winner.id,
        freeNumber: winner.free_number,
        extraNumbers: winner.extra_numbers || []
      };

      // Registrar resultado no banco de dados
      const { error: drawError } = await supabase
        .from('raffle_results')
        .insert({
          winner_number: winnerNumber.number,
          winner_user_id: winner.id,
          winner_name: winner.name,
          total_participants: selectedNumbers.length,
          drawn_at: new Date().toISOString(),
          drawn_by: currentAppUser?.id
        });

      if (drawError) {

        // Continuar mesmo com erro de registro
      }

      // Atualizar status do usuário como ganhador
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          is_winner: true,
          won_at: new Date().toISOString(),
          won_prize: 'Sorteio Principal'
        })
        .eq('id', winner.id);

      if (updateError) {

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

        // Não falha a operação se o WhatsApp falhar
      }

      setWinnerData(winnerInfo);
      setShowDrawAnimation(false);
      setShowDrawResult(true);

    } catch (error) {

      setShowDrawAnimation(false);
      alert('Erro ao realizar sorteio. Tente novamente.');
    }
  };

  const handleCleanup = async () => {
    try {
      await cleanupOrphanedNumbers();

      setShowCleanupConfirm(false);
    } catch (error) {

    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <Header />
      <main className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-6 sm:py-8 lg:py-12 relative overflow-hidden">
          {/* Geometric Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
              </div>
          
          {/* Geometric Accent Lines */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"></div>
          <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-amber-500 via-amber-400 to-amber-500"></div>
          
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative z-10">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-2 sm:mb-4 tracking-tight">Painel Administrativo</h1>
              <p className="text-slate-300 text-sm sm:text-base lg:text-lg xl:text-xl font-medium">Gerencie o sistema de sorteios ZK Premios</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 -mt-4 sm:-mt-6 lg:-mt-8 mb-6 sm:mb-8 lg:mb-12">
            <div className="bg-slate-800/50 overflow-hidden shadow-2xl rounded-2xl border border-slate-600/30 backdrop-blur-sm">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-bold text-slate-300 truncate">
                        Total de Participantes
                      </dt>
                      <dd className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
                        {getTakenNumbersCount()}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-emerald-400">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="font-bold">+12% esta semana</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 overflow-hidden shadow-2xl rounded-2xl border border-slate-600/30 backdrop-blur-sm">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Hash className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-bold text-slate-300 truncate">
                        Números Disponíveis
                      </dt>
                      <dd className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
                        {getAvailableNumbersCount()}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full shadow-lg" 
                      style={{ width: `${(getAvailableNumbersCount() / 1000) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 overflow-hidden shadow-2xl rounded-2xl border border-slate-600/30 backdrop-blur-sm">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                      <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-bold text-slate-300 truncate">
                        Números Selecionados
                      </dt>
                      <dd className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
                        {getTakenNumbersCount()}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-3 rounded-full shadow-lg" 
                      style={{ width: `${(getTakenNumbersCount() / 1000) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 overflow-hidden shadow-2xl rounded-2xl border border-slate-600/30 backdrop-blur-sm">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-bold text-slate-300 truncate">
                        Taxa de Conversão
                      </dt>
                      <dd className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
                        {getTakenNumbersCount() > 0 ? ((getTakenNumbersCount() / 1000) * 100).toFixed(1) : '0'}%
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-purple-400">
                    <Award className="h-4 w-4 mr-1" />
                    <span className="font-bold">Excelente engajamento</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-12">
            {/* Aprovações Card */}
            <div className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-green-400/20 backdrop-blur-sm hover:border-green-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/10">
              <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 p-4 sm:p-6 lg:p-8 border-b border-green-400/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg shadow-green-500/25">
                      <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1">Aprovações</h3>
                      <p className="text-green-200 text-sm font-medium">Solicitações</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-green-400">{pendingCount}</div>
                    <div className="text-xs text-green-300 font-medium">pendentes</div>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <p className="text-slate-300 mb-6 leading-relaxed font-medium text-sm">
                  Gerencie solicitações de números extras dos usuários. 
                  Aprove ou rejeite com base nos comprovantes de pagamento.
                </p>
                <Link
                  to="/admin/approvals"
                  className="w-full py-4 px-6 rounded-2xl font-black transition-all duration-300 flex items-center justify-center gap-3 group bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-2xl hover:shadow-green-500/25 transform hover:-translate-y-1 hover:scale-105"
                >
                  <CheckCircle className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                  Gerenciar Aprovações
                </Link>
              </div>
            </div>

            {/* Usuários Card */}
            <div className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-blue-400/20 backdrop-blur-sm hover:border-blue-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10">
              <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 p-4 sm:p-6 lg:p-8 border-b border-blue-400/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg shadow-blue-500/25">
                      <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-1">Usuários</h3>
                      <div className="text-blue-300 text-sm font-medium">Gerenciar usuários</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <p className="text-slate-300 mb-6 leading-relaxed font-medium text-sm">
                  Visualize e gerencie todos os usuários cadastrados no sistema. 
                  Veja estatísticas, dados de contato e histórico de participações.
                </p>
                <div className="space-y-3">
                  <Link
                    to="/admin/users"
                    className="w-full py-4 px-6 rounded-2xl font-black transition-all duration-300 flex items-center justify-center gap-3 group bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1 hover:scale-105"
                  >
                    <Users className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    Gerenciar Usuários
                  </Link>
                </div>
              </div>
            </div>

            {/* Sorteios Card */}
            <div className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-purple-400/20 backdrop-blur-sm hover:border-purple-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 p-4 sm:p-6 lg:p-8 border-b border-purple-400/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg shadow-purple-500/25">
                      <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1">Sorteios</h3>
                      <p className="text-purple-200 text-sm font-medium">Configuração</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-purple-400">⚙️</div>
                    <div className="text-xs text-purple-300 font-medium">gerenciar</div>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <p className="text-slate-300 mb-6 leading-relaxed font-medium text-sm">
                  Crie e gerencie sorteios personalizados. Configure prêmios, 
                  datas e regras específicas para cada campanha.
                </p>
                <div className="space-y-3">
                  <Link
                    to="/admin/raffles"
                    className="w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 group bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-purple-500/25"
                  >
                    <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                    Gerenciar Sorteios
                  </Link>
                  
                  <Link
                    to="/admin/raffles/create"
                    className="w-full py-2 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 group bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-green-500/25"
                  >
                    <span className="text-xs">🎯</span>
                    Criar Novo Sorteio
                  </Link>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-amber-400/20 backdrop-blur-sm hover:border-amber-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10">
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 p-4 sm:p-6 lg:p-8 border-b border-amber-400/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg shadow-amber-500/25">
                      <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1">Realizar Sorteio</h3>
                      <p className="text-amber-200 text-sm font-medium">Sistema automático</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-amber-400">{getTakenNumbersCount()}</div>
                    <div className="text-xs text-amber-300 font-medium">participantes</div>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-4 sm:p-6 lg:p-8">
                <p className="text-slate-300 mb-6 leading-relaxed font-medium text-sm">
                  Execute um sorteio automático entre todos os números selecionados. 
                  O sistema escolherá aleatoriamente um ganhador e registrará o resultado.
                </p>
                
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${getTakenNumbersCount() > 0 ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                    <span className="text-sm font-bold text-slate-300">
                      {getTakenNumbersCount() > 0 ? 'Pronto para sorteio' : 'Aguardando participantes'}
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-400/30 rounded-lg px-3 py-1">
                    <span className="text-xs font-bold text-amber-200">Irreversível</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowDrawConfirm(true)}
                  disabled={getTakenNumbersCount() === 0}
                  className={`w-full py-4 px-6 rounded-2xl font-black transition-all duration-300 flex items-center justify-center gap-3 group ${
                    getTakenNumbersCount() > 0
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-2xl hover:shadow-amber-500/25 transform hover:-translate-y-1 hover:scale-105'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Trophy className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                  Realizar Sorteio
                </button>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-red-400/20 backdrop-blur-sm hover:border-red-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-red-500/10">
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 p-4 sm:p-6 lg:p-8 border-b border-red-400/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg shadow-red-500/25">
                      <RotateCcw className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1">Resetar Sistema</h3>
                      <p className="text-red-200 text-sm font-medium">Ação crítica</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-red-400">⚠️</div>
                    <div className="text-xs text-red-300 font-medium">perigoso</div>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-4 sm:p-6 lg:p-8">
                <p className="text-slate-300 mb-6 leading-relaxed font-medium text-sm">
                  Remove todos os registros de usuários normais, números selecionados e 
                  histórico de sorteios. <span className="text-amber-300 font-bold">Usuários admin são preservados.</span> 
                  Restaura o sistema ao estado inicial.
                </p>
                
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 bg-red-500 animate-pulse"></div>
                    <span className="text-sm font-bold text-slate-300">Ação irreversível</span>
                  </div>
                  <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/30 rounded-lg px-3 py-1">
                    <span className="text-xs font-bold text-red-200">Extrema cautela</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-4 px-6 rounded-2xl font-black transition-all duration-300 flex items-center justify-center gap-3 group bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-2xl hover:shadow-red-500/25 transform hover:-translate-y-1 hover:scale-105"
                >
                  <RotateCcw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                  Resetar Sistema
                </button>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-blue-400/20 backdrop-blur-sm hover:border-blue-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10">
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 p-4 sm:p-6 lg:p-8 border-b border-blue-400/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg shadow-blue-500/25">
                      <Hash className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1">Resetar Números</h3>
                      <p className="text-blue-200 text-sm font-medium">Ação segura</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-blue-400">{getTakenNumbersCount()}</div>
                    <div className="text-xs text-blue-300 font-medium">serão liberados</div>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-4 sm:p-6 lg:p-8">
                <p className="text-slate-300 mb-6 leading-relaxed font-medium text-sm">
                  Libera todos os números selecionados, mantendo os usuários cadastrados. 
                  Útil para limpar seleções após exclusão de usuários.
                </p>
                
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 bg-blue-500"></div>
                    <span className="text-sm font-bold text-slate-300">Mantém usuários</span>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-400/30 rounded-lg px-3 py-1">
                    <span className="text-xs font-bold text-blue-200">Seguro</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowResetNumbersConfirm(true)}
                  className="w-full py-4 px-6 rounded-2xl font-black transition-all duration-300 flex items-center justify-center gap-3 group bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1 hover:scale-105"
                >
                  <Hash className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                  Resetar Números
                </button>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-emerald-400/20 backdrop-blur-sm hover:border-emerald-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10">
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 p-4 sm:p-6 lg:p-8 border-b border-emerald-400/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg shadow-emerald-500/25">
                      <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1">Limpar Órfãos</h3>
                      <p className="text-emerald-200 text-sm font-medium">Manutenção automática</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">🧹</div>
                    <div className="text-xs text-emerald-300 font-medium">limpeza</div>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-4 sm:p-6 lg:p-8">
                <p className="text-slate-300 mb-6 leading-relaxed font-medium text-sm">
                  Libera números que foram selecionados por usuários que foram excluídos. 
                  Esses números voltam a ficar disponíveis para seleção.
                </p>
                
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 bg-emerald-500"></div>
                    <span className="text-sm font-bold text-slate-300">Limpeza automática</span>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-400/30 rounded-lg px-3 py-1">
                    <span className="text-xs font-bold text-emerald-200">Seguro</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCleanupConfirm(true)}
                  className="w-full py-4 px-6 rounded-2xl font-black transition-all duration-300 flex items-center justify-center gap-3 group bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-2xl hover:shadow-emerald-500/25 transform hover:-translate-y-1 hover:scale-105"
                >
                  <Settings className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                  Limpar Órfãos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Confirmation Modals */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {showResetConfirm && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-slate-800 rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-600/30">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 sm:mx-0">
                      <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-white mb-2 sm:mb-3">
                        Confirmar Reset
                      </h3>
                      <p className="text-slate-300 leading-relaxed font-medium text-sm sm:text-base">
                        Esta ação irá remover permanentemente todos os dados do sistema:
                      </p>
                      <ul className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-400 list-disc list-inside space-y-1 sm:space-y-2 font-medium">
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
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-black hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-2xl hover:shadow-red-500/25 text-sm sm:text-base"
                      onClick={handleReset}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-4 sm:px-6 py-2 sm:py-3 border border-slate-600 bg-slate-700 text-slate-300 font-bold hover:bg-slate-600 transition-all duration-300 text-sm sm:text-base"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showDrawConfirm && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-sm">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black opacity-50"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-2xl px-6 pt-6 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-100 sm:mx-0">
                      <Trophy className="h-8 w-8 text-amber-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Confirmar Sorteio
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        O sistema selecionará aleatoriamente um número entre os {getTakenNumbersCount()} números 
                        participantes e definirá o ganhador automaticamente.
                      </p>
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
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
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg text-sm sm:text-base"
                      onClick={handleDraw}
                    >
                      <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm sm:text-base"
                      onClick={() => setShowDrawConfirm(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Contagem Regressiva */}
          {showDrawAnimation && (
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
                    
                    <p className="text-slate-300 text-lg font-medium">
                      Selecionando ganhador...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Resultado */}
          {showDrawResult && winnerData && (
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
                      <p className="text-slate-300 text-lg">
                        Parabéns! Você foi o ganhador do sorteio!
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-700/30 rounded-xl p-4">
                        <p className="text-slate-400 text-sm font-medium mb-1">Email</p>
                        <p className="text-white font-bold">{winnerData.email}</p>
                      </div>
                      <div className="bg-slate-700/30 rounded-xl p-4">
                        <p className="text-slate-400 text-sm font-medium mb-1">WhatsApp</p>
                        <p className="text-white font-bold">{winnerData.whatsapp}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={() => {
                          setShowDrawResult(false);
                          setWinnerData(null);
                        }}
                        className="px-8 py-3 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 font-bold rounded-xl transition-all duration-200 border border-slate-600/30"
                      >
                        Fechar
                      </button>
                      <button
                        onClick={() => {
                          setShowDrawResult(false);
                          setWinnerData(null);
                          // Recarregar dados
                          window.location.reload();
                        }}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center gap-2"
                      >
                        <Trophy className="h-4 w-4" />
                        Ver Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showResetNumbersConfirm && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-sm">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black opacity-50"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-2xl px-6 pt-6 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-100 sm:mx-0">
                      <Hash className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Confirmar Reset de Números
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Todos os números selecionados serão liberados e ficarão disponíveis para nova seleção. 
                        Os usuários cadastrados serão mantidos.
                      </p>
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center text-blue-800 text-sm">
                          <Hash className="h-4 w-4 mr-2" />
                          <span>Esta ação liberará {getTakenNumbersCount()} números selecionados</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 sm:flex-row-reverse">
                    <button
                      type="button"
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg text-sm sm:text-base"
                      onClick={handleResetNumbers}
                    >
                      <Hash className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm sm:text-base"
                      onClick={() => setShowResetNumbersConfirm(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showCleanupConfirm && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-sm">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black opacity-50"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-2xl px-6 pt-6 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-100 sm:mx-0">
                      <Settings className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Confirmar Limpeza de Órfãos
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Esta ação irá liberar todos os números que foram selecionados por usuários 
                        que foram excluídos do sistema. Esses números voltarão a ficar disponíveis.
                      </p>
                      <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
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
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg text-sm sm:text-base"
                      onClick={handleCleanup}
                    >
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm sm:text-base"
                      onClick={() => setShowCleanupConfirm(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showWhatsAppTest && (
            <WhatsAppTestPanel onClose={() => setShowWhatsAppTest(false)} />
          )}

          {showVonageTest && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">🚀 Teste Vonage WhatsApp</h3>
                    <button
                      onClick={() => setShowVonageTest(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <VonageTestPanel />
                </div>
              </div>
            </div>
          )}

          {showQuickTest && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
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
          )}

          {showSandboxTest && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-slate-800 rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-600/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">🧪 Teste do Sandbox</h3>
                    <button
                      onClick={() => setShowSandboxTest(false)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <SandboxTest />
                </div>
              </div>
            </div>
          )}

          {showWhatsAppMonitoring && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
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
          )}

          {showWhatsAppBulk && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">📢 Notificações em Massa</h3>
                    <button
                      onClick={() => setShowWhatsAppBulk(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <WhatsAppBulkNotificationPanelSimple />
                </div>
              </div>
            </div>
          )}

          {showLiveRaffleControl && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
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
          )}

          {showUserManagement && (
            <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity">
                  <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="inline-block align-bottom bg-white rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
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
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}