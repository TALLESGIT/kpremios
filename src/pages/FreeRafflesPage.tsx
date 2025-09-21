import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
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
  const { currentUser: currentAppUser } = useData();
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<FreeRaffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'finished'>('all');

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
    return Math.min((raffle.current_participants / raffle.max_participants) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500/30 border-t-amber-500 mx-auto mb-4"></div>
            <p className="text-amber-200 font-medium text-lg">Carregando sorteios...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const filteredRaffles = getFilteredRaffles();

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full">
      <Header />
      <main className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-6 sm:py-8 lg:py-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"></div>
          <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-amber-500 via-amber-400 to-amber-500"></div>
          
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-slate-700/50 hover:bg-slate-700/70 rounded-xl flex items-center justify-center transition-colors duration-200"
                  >
                    <ArrowLeft className="h-5 w-5 text-slate-300" />
                  </button>
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-4 tracking-tight">
                  Sorteios Gratuitos
                </h1>
                <p className="text-slate-300 text-sm sm:text-base lg:text-lg font-medium">
                  Participe de sorteios gratuitos e ganhe prêmios incríveis!
                </p>
              </div>
              
              <div className="hidden sm:block">
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-amber-400">{filteredRaffles.length}</div>
                  <div className="text-xs text-amber-300 font-medium">sorteios disponíveis</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
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
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                    filter === key
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25'
                      : 'bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 border border-slate-600/30'
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
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Gift className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-4">
                {filter === 'all' ? 'Nenhum sorteio disponível' : 
                 filter === 'active' ? 'Nenhum sorteio ativo' :
                 filter === 'upcoming' ? 'Nenhum sorteio em breve' :
                 'Nenhum sorteio finalizado'}
              </h3>
              <p className="text-slate-400 text-base sm:text-lg px-4">
                {filter === 'all' ? 'Não há sorteios gratuitos no momento.' :
                 filter === 'active' ? 'Não há sorteios ativos no momento.' :
                 filter === 'upcoming' ? 'Não há sorteios programados.' :
                 'Não há sorteios finalizados.'}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-2 px-6 rounded-xl transition-all duration-200"
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
                    className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-slate-600/30 backdrop-blur-sm hover:border-amber-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-4 sm:p-6 border-b border-slate-600/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                            <Gift className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-black text-white">{raffle.title}</h3>
                            <p className="text-slate-300 text-sm">Sorteio Gratuito</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                          {status.text}
                        </div>
                      </div>
                      
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {raffle.description}
                      </p>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-4 sm:p-6">
                      <div className="space-y-4">
                        {/* Prêmio */}
                        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-xl p-4 border border-amber-400/20">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy className="h-5 w-5 text-amber-400" />
                            <span className="font-bold text-amber-200">Prêmio</span>
                          </div>
                          <p className="text-white font-bold text-lg">{raffle.prize}</p>
                        </div>

                        {/* Participantes */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-300 text-sm font-medium">Participantes</span>
                            </div>
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
                        </div>

                        {/* Datas */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-400 font-medium">Início</span>
                            </div>
                            <p className="text-white font-bold">
                              {new Date(raffle.start_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-400 font-medium">Fim</span>
                            </div>
                            <p className="text-white font-bold">
                              {new Date(raffle.end_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Botão de Ação */}
                      <div className="mt-6">
                        {status.status === 'active' ? (
                          <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2">
                            <Star className="h-4 w-4" />
                            Participar Agora
                          </button>
                        ) : status.status === 'upcoming' ? (
                          <button disabled className="w-full bg-slate-700/50 text-slate-500 font-bold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                            <Clock className="h-4 w-4" />
                            Em Breve
                          </button>
                        ) : (
                          <button disabled className="w-full bg-slate-700/50 text-slate-500 font-bold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
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
      <Footer />
    </div>
  );
};

export default FreeRafflesPage;
