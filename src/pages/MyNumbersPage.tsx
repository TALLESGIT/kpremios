import { Hash, Calendar, User, ArrowLeft, Zap, Trophy, TrendingUp, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import ExtraNumbersModal from '../components/user/ExtraNumbersModal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ExtraNumberRequest } from '../types';
import { supabase } from '../lib/supabase';

function MyNumbersPage() {
  const { getCurrentUserRequest, numbers, getUserRequestsHistory, currentUser: currentAppUser } = useData();
  const { user } = useAuth();
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [requestsHistory, setRequestsHistory] = useState<ExtraNumberRequest[]>([]);
  const [currentRange, setCurrentRange] = useState(0);
  
  const currentRequest = getCurrentUserRequest();
  const userExtraNumbers = currentAppUser?.extra_numbers || [];
  const totalNumbers = userExtraNumbers.length + (currentAppUser?.free_number ? 1 : 0);
  const totalParticipants = numbers.filter(n => !n.is_available).length;
  const isWinner = currentAppUser?.is_winner || false;

  // Create ranges for pagination (igual à HomePage)
  const numberRanges: Array<{ start: number; end: number; label: string }> = [];
  for (let i = 1; i <= 1000; i += 100) {
    const end = Math.min(i + 99, 1000);
    numberRanges.push({ start: i, end, label: `${i}-${end}` });
  }

  // Filter numbers based on current range
  const filteredExtraNumbers = userExtraNumbers.filter(num => {
    const rangeStart = numberRanges[currentRange]?.start || 1;
    const rangeEnd = numberRanges[currentRange]?.end || 100;
    return num >= rangeStart && num <= rangeEnd;
  });

  const handleRangeChange = (index: number) => {
    setCurrentRange(index);
  };

  // Load requests history
  useEffect(() => {
    const loadHistory = async () => {
      if (currentAppUser) {
        try {
          const history = await getUserRequestsHistory();
          setRequestsHistory(history);
        } catch (error) {
          console.error('Erro ao carregar histórico:', error);
        }
      }
    };
    
    loadHistory();
  }, [currentAppUser, getUserRequestsHistory]);

  // Real-time subscription for user requests updates
  useEffect(() => {
    if (!currentAppUser) return;

    const subscription = supabase
      .channel('user-requests-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'extra_number_requests',
        filter: `user_id=eq.${currentAppUser.id}`
      }, async () => {
        console.log('User requests updated, reloading history...');
        try {
          const history = await getUserRequestsHistory();
          setRequestsHistory(history);
        } catch (error) {
          console.error('Erro ao recarregar histórico:', error);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentAppUser, getUserRequestsHistory]);

  // Redirect if user hasn't registered
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <Header />
      <main className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-12 sm:py-16 lg:py-20 relative overflow-hidden">
          {/* Geometric Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          {/* Geometric Accent Lines */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"></div>
          <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-amber-500 via-amber-400 to-amber-500"></div>
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <Link
              to="/"
              className="inline-flex items-center text-amber-400 hover:text-amber-300 mb-6 sm:mb-8 transition-all duration-300 group text-sm sm:text-base"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-bold">Voltar ao início</span>
            </Link>
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl shadow-amber-500/25">
                <Hash className="h-8 w-8 sm:h-10 sm:w-10 text-slate-900" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-6 tracking-tight">
                Meus Números
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed px-2 sm:px-0">
                Confira seus números selecionados e acompanhe sua participação
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-8 sm:py-12">
          {/* Banner de Ganhador */}
          {isWinner && (
            <div className="mb-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-3xl shadow-2xl p-6 sm:p-8 text-white relative overflow-hidden">
              {/* Confetes animados */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 bg-white/30 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
              
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <Trophy className="h-10 w-10 text-white animate-pulse" />
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-black mb-4">
                  🎉 PARABÉNS! VOCÊ GANHOU! 🎉
                </h2>
                
                <p className="text-xl sm:text-2xl font-bold mb-2">
                  Seu número #{currentAppUser?.free_number} foi sorteado!
                </p>
                
                <p className="text-emerald-100 text-lg mb-6">
                  Você é o ganhador do sorteio principal! Entre em contato conosco para receber seu prêmio.
                </p>
                
                <div className="bg-white/20 rounded-2xl p-4 mb-6">
                  <p className="text-white font-bold text-lg">
                    🏆 Prêmio: Sorteio Principal
                  </p>
                  <p className="text-emerald-100 text-sm">
                    Ganho em: {currentAppUser?.won_at ? new Date(currentAppUser.won_at).toLocaleDateString('pt-BR') : 'Data não disponível'}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      // Aqui você pode adicionar funcionalidade para contato
                      alert('Entre em contato conosco via WhatsApp ou email para receber seu prêmio!');
                    }}
                    className="bg-white text-emerald-600 font-bold py-3 px-6 rounded-xl hover:bg-emerald-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Trophy className="h-5 w-5" />
                    Receber Prêmio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-2xl p-4 sm:p-6 border border-amber-400/30 backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-200 text-sm font-bold">Números Ativos</p>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-400">{totalNumbers}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                  <Hash className="h-5 w-5 sm:h-6 sm:w-6 text-slate-900" />
                </div>
              </div>
              <p className="text-amber-300 text-sm mt-2 font-medium">
                {userExtraNumbers.length > 0 ? 
                  `1 grátis + ${userExtraNumbers.length} extras` : 
                  '1 número grátis'
                }
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-4 sm:p-6 border border-slate-600/30 backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-bold">Chances de Ganhar</p>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-100">
                    {totalParticipants > 0 ? ((totalNumbers / totalParticipants) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-slate-300" />
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-2 font-medium">
                {totalNumbers} de {totalParticipants} participando
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-2xl p-4 sm:p-6 border border-emerald-400/30 backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-200 text-sm font-bold">Status</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-400">Ativo</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-slate-900" />
                </div>
              </div>
              <p className="text-emerald-300 text-sm mt-2 font-medium">
                Participando dos sorteios
              </p>
            </div>
          </div>

          {/* Main Number Card */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 text-white backdrop-blur-sm border border-amber-400/20">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl shadow-amber-500/25">
                <Hash className="h-6 w-6 sm:h-8 sm:w-8 text-slate-900" />
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black mb-3 sm:mb-4 text-amber-100">Seu Número da Sorte</h3>
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 inline-block mb-4 sm:mb-6 border border-amber-400/30">
                <span className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-amber-400">
                  {currentAppUser?.free_number}
                </span>
              </div>
              <p className="text-slate-300 text-base sm:text-lg lg:text-xl font-medium">
                Número gratuito garantido!
              </p>
            </div>
          </div>

          {/* Extra Numbers Section */}
          {userExtraNumbers.length > 0 && (
            <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 backdrop-blur-sm border border-slate-600/30">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-amber-100 mb-4 sm:mb-6">Números Extras</h3>
              
              {/* Range tabs - Estilo igual à HomePage */}
              <div className="mb-6 sm:mb-8">
                <div className="border-b border-amber-400/20">
                  <div className="flex overflow-x-auto no-scrollbar space-x-1 sm:space-x-2">
                    {numberRanges.map((range, index) => {
                      const numbersInRange = userExtraNumbers.filter(num => 
                        num >= range.start && num <= range.end
                      );
                      const hasNumbers = numbersInRange.length > 0;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleRangeChange(index)}
                          className={`py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-bold rounded-t-xl transition-all duration-300 whitespace-nowrap ${
                            currentRange === index
                              ? 'border-b-2 border-amber-500 text-amber-100 bg-amber-500/20 backdrop-blur-sm'
                              : hasNumbers
                              ? 'text-amber-300 hover:text-amber-100 hover:bg-slate-800/50 backdrop-blur-sm'
                              : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/50 backdrop-blur-sm'
                          }`}
                        >
                          {range.label}
                          {hasNumbers && (
                            <span className="ml-1 text-amber-400">({numbersInRange.length})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Grid de Números - Mostra apenas da faixa selecionada */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
                {filteredExtraNumbers.map((num, index) => (
                  <div
                    key={index}
                    className="h-10 sm:h-12 lg:h-14 w-full bg-gradient-to-br from-amber-500 to-amber-600 border-2 border-amber-400 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black text-slate-900 shadow-lg"
                  >
                    {num}
                  </div>
                ))}
              </div>
              
              {filteredExtraNumbers.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Hash className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 text-base sm:text-lg font-medium">Nenhum número nesta faixa</p>
                  <p className="text-slate-500 text-sm sm:text-base">Seus números extras não estão nesta faixa de {numberRanges[currentRange]?.label}</p>
                </div>
              )}
              
              <p className="text-slate-400 text-xs sm:text-sm font-medium mt-4 text-center">
                Total de {userExtraNumbers.length} números extras adicionais
              </p>
            </div>
          )}

          {/* Request Extra Numbers */}
          {!currentRequest ? (
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl shadow-2xl p-8 text-white mb-8 relative overflow-hidden">
              {/* Geometric accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 to-amber-400"></div>
              <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-amber-300 to-amber-400"></div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex-1">
                  <h3 className="text-3xl font-black mb-4 flex items-center">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                      <Zap className="h-6 w-6" />
                    </div>
                    Aumente suas Chances!
                  </h3>
                  <p className="text-amber-100 text-xl mb-6 leading-relaxed font-medium">
                    Solicite números extras e multiplique suas chances de ganhar. 
                    A partir de <span className="text-white font-black">R$ 10,00</span> você ganha <span className="text-white font-black">100 números aleatórios</span>!
                  </p>
                  <ul className="text-amber-100 text-base space-y-2 mb-8 font-medium">
                    <li>• Cada R$ 10,00 = 100 números extras</li>
                    <li>• Números atribuídos automaticamente</li>
                    <li>• Aprovação rápida pelo admin</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={() => setShowExtraModal(true)}
                className="w-full bg-white text-amber-600 font-black py-5 px-8 rounded-2xl hover:bg-amber-50 transition-all duration-300 shadow-2xl hover:shadow-amber-500/25 transform hover:-translate-y-1 hover:scale-105 flex items-center justify-center gap-3 relative z-10"
              >
                <Plus className="h-6 w-6" />
                Solicitar Números Extras
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border-l-4 border-amber-500 backdrop-blur-sm">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-slate-900" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-amber-100 mb-2 sm:mb-3">
                    Solicitação em Análise
                  </h3>
                  <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-slate-300 mb-4 sm:mb-6 font-medium">
                    <p>Valor: <strong className="text-white">R$ {currentRequest.payment_amount.toFixed(2)}</strong></p>
                    <p>Números solicitados: <strong className="text-white">{currentRequest.requested_quantity}</strong></p>
                    <p>Status: <strong className="text-amber-400 capitalize">{currentRequest.status}</strong></p>
                  </div>
                  <p className="text-slate-400 text-sm sm:text-base font-medium">
                    Sua solicitação está sendo analisada. Você será notificado quando for aprovada.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Requests History */}
          {requestsHistory.length > 0 && (
            <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 backdrop-blur-sm border border-slate-600/30">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-100 mb-6 sm:mb-8">
                Histórico de Solicitações
              </h3>
              <div className="space-y-4">
                {requestsHistory.map((request) => {
                  const getStatusIcon = (status: string) => {
                    switch (status) {
                      case 'approved':
                        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
                      case 'rejected':
                        return <XCircle className="h-5 w-5 text-red-400" />;
                      default:
                        return <Clock className="h-5 w-5 text-amber-400" />;
                    }
                  };

                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'approved':
                        return 'from-emerald-500/10 to-emerald-600/10 border-emerald-400/30';
                      case 'rejected':
                        return 'from-red-500/10 to-red-600/10 border-red-400/30';
                      default:
                        return 'from-amber-500/10 to-amber-600/10 border-amber-400/30';
                    }
                  };

                  const getStatusText = (status: string) => {
                    switch (status) {
                      case 'approved':
                        return 'Aprovada';
                      case 'rejected':
                        return 'Rejeitada';
                      default:
                        return 'Pendente';
                    }
                  };

                  return (
                    <div
                      key={request.id}
                      className={`bg-gradient-to-br ${getStatusColor(request.status)} rounded-xl p-4 border backdrop-blur-sm`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(request.status)}
                          <div>
                            <p className="font-bold text-white text-lg">
                              {getStatusText(request.status)}
                            </p>
                            <p className="text-slate-300 text-sm">
                              {new Date(request.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-lg">
                            R$ {request.payment_amount.toFixed(2)}
                          </p>
                          <p className="text-slate-300 text-sm">
                            {request.requested_quantity} números
                          </p>
                        </div>
                      </div>
                      
                      {request.status === 'approved' && request.assigned_numbers && request.assigned_numbers.length > 0 && (
                        <div className="mt-4">
                          <p className="text-emerald-300 text-sm font-medium mb-3">
                            Números atribuídos:
                          </p>
                          <div className="space-y-3">
                            {Object.entries(organizeNumbersInRanges(request.assigned_numbers)).map(([range, numbers]) => (
                              <div key={range} className="bg-slate-700/30 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-emerald-400 font-bold text-sm">{range}</span>
                                  <span className="text-slate-400 text-xs">{numbers.length} números</span>
                                </div>
                                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1">
                                  {numbers.slice(0, 20).map((num, index) => (
                                    <div
                                      key={index}
                                      className="h-6 w-full bg-emerald-500 rounded text-xs font-bold text-slate-900 flex items-center justify-center"
                                    >
                                      {num}
                                    </div>
                                  ))}
                                  {numbers.length > 20 && (
                                    <div className="h-6 w-full bg-emerald-400 rounded text-xs font-bold text-slate-900 flex items-center justify-center">
                                      +{numbers.length - 20}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {request.status === 'rejected' && (request as any).rejection_reason && (
                        <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-400/20">
                          <p className="text-red-300 text-sm font-medium mb-1">
                            Motivo da rejeição:
                          </p>
                          <p className="text-red-200 text-sm">
                            {(request as any).rejection_reason || 'Nenhum motivo fornecido'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Info Card */}
          <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 backdrop-blur-sm border border-slate-600/30">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-100 mb-6 sm:mb-8">
              Informações da Conta
            </h2>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-900" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Nome Completo</p>
                  <p className="font-black text-white text-lg sm:text-xl">
                    {currentAppUser?.name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Data de Cadastro</p>
                  <p className="font-black text-white text-sm sm:text-base">
                    {new Date(currentAppUser?.created_at || '').toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <ExtraNumbersModal 
        isOpen={showExtraModal}
        onClose={() => setShowExtraModal(false)}
      />
      <Footer />
    </div>
  );
}

export default MyNumbersPage;