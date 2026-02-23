import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import FreeRaffleParticipationModal from '../components/modals/FreeRaffleParticipationModal';
import { ArrowLeft, Gift, Calendar, Users, Trophy, Clock, Target, Star } from 'lucide-react';

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

const FreeRafflesPage: React.FC = () => {
  const { user } = useAuth();
  const { currentUser: currentAppUser, joinFreeRaffle } = useData();
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<FreeRaffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'finished'>('all');
  const [selectedRaffle, setSelectedRaffle] = useState<FreeRaffle | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadRaffles();
  }, []);

  const loadRaffles = async () => {
    try {
      setLoading(true);

      // Buscar sorteios gratuitos (raffles com is_active = true)
      const { data, error } = await supabase
        .from('raffles')
        .select(`
          id,
          title,
          description,
          prize,
          start_date,
          end_date,
          is_active,
          max_participants,
          created_at
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calcular participantes atuais (simulado por enquanto)
      const rafflesWithParticipants = data?.map(raffle => ({
        ...raffle,
        current_participants: Math.floor(Math.random() * raffle.max_participants)
      })) || [];

      setRaffles(rafflesWithParticipants);
    } catch (error) {
      setRaffles([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRaffles = () => {
    const now = new Date();
    return raffles.filter(raffle => {
      const startDate = new Date(raffle.start_date);
      const endDate = new Date(raffle.end_date);

      switch (filter) {
        case 'active':
          return raffle.is_active && startDate <= now && endDate >= now;
        case 'upcoming':
          return startDate > now;
        case 'finished':
          return endDate < now;
        default:
          return true;
      }
    });
  };

  const getRaffleStatus = (raffle: FreeRaffle) => {
    const now = new Date();
    const startDate = new Date(raffle.start_date);
    const endDate = new Date(raffle.end_date);

    if (startDate > now) return { status: 'upcoming', text: 'Em Breve', color: 'text-blue-400 bg-blue-400/20' };
    if (endDate < now) return { status: 'finished', text: 'Finalizado', color: 'text-gray-400 bg-gray-400/20' };
    if (raffle.is_active) return { status: 'active', text: 'Ativo', color: 'text-emerald-400 bg-emerald-400/20' };
    return { status: 'inactive', text: 'Inativo', color: 'text-red-400 bg-red-400/20' };
  };

  const getProgressPercentage = (raffle: FreeRaffle) => {
    return Math.round((raffle.current_participants / raffle.max_participants) * 100);
  };

  const handleParticipateClick = (raffle: FreeRaffle) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedRaffle(raffle);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRaffle(null);
  };

  const handleParticipate = async (raffleId: string) => {
    const result = await joinFreeRaffle(raffleId);
    if (result.success) {
      // Recarregar os sorteios para atualizar o número de participantes
      await loadRaffles();
    }
    return result;
  };

  if (loading) {
    return (
      <main className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-600 font-bold text-lg">Carregando sorteios...</p>
        </div>
      </main>
    );
  }

  const filteredRaffles = getFilteredRaffles();

  return (
    <>
      <main className="flex-grow w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 py-8 sm:py-12 lg:py-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors duration-200"
                  >
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </button>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Gift className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-2 sm:mb-4 tracking-tight" style={{
                  textShadow: '2px 2px 0px rgba(251, 191, 36, 0.8)'
                }}>
                  SORTEIOS GRATUITOS
                </h1>
                <p className="text-blue-100 text-sm sm:text-base lg:text-lg font-medium">
                  Participe de sorteios gratuitos e ganhe prêmios incríveis!
                </p>
              </div>

              <div className="hidden sm:block">
                <div className="text-right bg-white/20 backdrop-blur-sm rounded-2xl p-4 border-2 border-white/30">
                  <div className="text-2xl sm:text-3xl font-black text-white">{filteredRaffles.length}</div>
                  <div className="text-xs text-blue-100 font-bold">sorteios disponíveis</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Filtros */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {[
                { key: 'all', label: 'Todos', icon: Target },
                { key: 'active', label: 'Ativos', icon: Star },
                { key: 'upcoming', label: 'Em Breve', icon: Clock },
                { key: 'finished', label: 'Finalizados', icon: Trophy }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${filter === key
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-200'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Sorteios */}
          {filteredRaffles.length === 0 ? (
            <div className="text-center py-8 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border-2 border-blue-300">
                <Gift className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-blue-600 mb-2 sm:mb-4">
                {filter === 'all' ? 'Nenhum sorteio disponível' :
                  filter === 'active' ? 'Nenhum sorteio ativo' :
                    filter === 'upcoming' ? 'Nenhum sorteio em breve' :
                      'Nenhum sorteio finalizado'}
              </h3>
              <p className="text-blue-500 text-base sm:text-lg px-4 mb-6">
                {filter === 'all' ? 'Não há sorteios gratuitos no momento.' :
                  filter === 'active' ? 'Não há sorteios ativos no momento.' :
                    filter === 'upcoming' ? 'Não há sorteios programados.' :
                      'Não há sorteios finalizados.'}
              </p>

              {/* Card de Sorteios ao Vivo quando não há sorteios gratuitos */}
              {filter === 'all' && (
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-blue-800/20 to-purple-800/20 rounded-2xl p-6 border border-blue-600/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">Sorteios ao Vivo</h4>
                        <p className="text-blue-300 text-sm">Participe agora mesmo!</p>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm mb-4">
                      Enquanto não há sorteios gratuitos, você pode participar dos nossos sorteios ao vivo "Resta Um" e concorrer a prêmios incríveis!
                    </p>
                    <Link
                      to="/live-raffle"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Target className="h-4 w-4" />
                      Participar de Sorteios ao Vivo
                    </Link>
                  </div>
                </div>
              )}

              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 px-6 rounded-xl transition-all duration-200 shadow-lg"
                >
                  Ver Todos
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {filteredRaffles.map((raffle) => {
                const status = getRaffleStatus(raffle);
                const progressPercentage = getProgressPercentage(raffle);

                return (
                  <div
                    key={raffle.id}
                    className="group bg-white overflow-hidden shadow-xl rounded-3xl border-2 border-blue-200 hover:border-blue-400 transition-all duration-500 hover:shadow-2xl"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                            <Gift className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-black text-white">{raffle.title}</h3>
                            <p className="text-blue-100 text-sm">Sorteio Gratuito</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border bg-white/20 backdrop-blur-sm ${status.color}`}>
                          {status.text}
                        </div>
                      </div>

                      <p className="text-blue-100 text-sm leading-relaxed">
                        {raffle.description}
                      </p>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-4 sm:p-6">
                      <div className="space-y-4">
                        {/* Prêmio */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-300">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy className="h-5 w-5 text-blue-600" />
                            <span className="font-bold text-blue-600">Prêmio</span>
                          </div>
                          <p className="text-blue-600 font-black text-lg">{raffle.prize}</p>
                        </div>

                        {/* Participantes */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-600" />
                              <span className="text-blue-600 text-sm font-semibold">Participantes</span>
                            </div>
                            <span className="text-blue-600 font-bold text-sm">
                              {raffle.current_participants} / {raffle.max_participants}
                            </span>
                          </div>
                          <div className="w-full bg-blue-100 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Datas */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="text-blue-600 font-semibold">Início</span>
                            </div>
                            <p className="text-blue-600 font-bold">
                              {new Date(raffle.start_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="text-blue-600 font-semibold">Fim</span>
                            </div>
                            <p className="text-blue-600 font-bold">
                              {new Date(raffle.end_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Botão de Ação */}
                      <div className="mt-6">
                        {status.status === 'active' ? (
                          <button
                            onClick={() => handleParticipateClick(raffle)}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                          >
                            <Star className="h-4 w-4" />
                            Participar Agora
                          </button>
                        ) : status.status === 'upcoming' ? (
                          <button disabled className="w-full bg-blue-100 text-blue-400 font-bold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 border-2 border-blue-200">
                            <Clock className="h-4 w-4" />
                            Em Breve
                          </button>
                        ) : (
                          <button disabled className="w-full bg-blue-100 text-blue-400 font-bold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 border-2 border-blue-200">
                            <Trophy className="h-4 w-4" />
                            Finalizado
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Participação */}
      {showModal && selectedRaffle && (
        <FreeRaffleParticipationModal
          isOpen={showModal}
          onClose={handleCloseModal}
          raffle={selectedRaffle}
          onParticipate={handleParticipate}
        />
      )}
    </>
  );
};

export default FreeRafflesPage;
