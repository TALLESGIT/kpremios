import { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, ArrowRight, Star, Gift, Zap } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';

interface Raffle {
  id: string;
  title: string;
  description: string;
  prize: string;
  total_numbers: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  prize_image?: string;
}

export default function RaffleBanner() {
  const { numbers } = useData();
  const [activeRaffle, setActiveRaffle] = useState<Raffle | null>(null);
  
  // Imagem padrão de fallback quando não há imagem do prêmio
  const defaultBannerImage = 'https://images.unsplash.com/photo-1607082349566-187342175e2f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';

  // Carregar sorteio ativo do banco de dados
  useEffect(() => {
    loadActiveRaffle();
  }, []);

  // Subscription em tempo real para mudanças nos sorteios
  useEffect(() => {
    const subscription = supabase
      .channel('raffles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'raffles'
      }, () => {
        loadActiveRaffle();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadActiveRaffle = async () => {
    try {

      // Verificar se há usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (error) {

        setActiveRaffle(null);
        return;
      }

      // Como usamos .limit(1), data é um array, pegamos o primeiro elemento se existir
      setActiveRaffle(data && data.length > 0 ? data[0] : null);
    } catch (error) {

      setActiveRaffle(null);
    }
  };

  if (!activeRaffle) {
    return null;
  }

  const takenNumbers = numbers.filter(n => !n.is_available).length;
  const availableNumbers = numbers.filter(n => n.is_available).length;
  const participationRate = Math.round((takenNumbers / activeRaffle.total_numbers) * 100);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isEndingSoon = () => {
    const endDate = new Date(activeRaffle.end_date);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft > 0;
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl mx-2 sm:mx-4 lg:mx-8 mb-4 sm:mb-6 lg:mb-8 shadow-2xl">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${activeRaffle.prize_image || defaultBannerImage})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/40" />
      </div>

      {/* Geometric Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            {/* Left Side - Content */}
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-400/30 backdrop-blur-sm">
                <Star className="h-4 w-4 text-amber-400 mr-2" />
                <span className="text-amber-200 font-bold text-sm">SORTEIO ATIVO</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white leading-tight">
                {activeRaffle.title}
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base lg:text-lg text-slate-200 leading-relaxed max-w-2xl">
                {activeRaffle.description}
              </p>

              {/* Prize Highlight */}
              <div className="flex items-start space-x-3 sm:space-x-4">
                {/* Imagem do Prêmio ou Ícone */}
                {activeRaffle.prize_image ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-lg">
                    <img
                      src={activeRaffle.prize_image}
                      alt={activeRaffle.prize}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                    <Trophy className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-amber-400 font-bold text-sm sm:text-base lg:text-lg mb-1">Prêmio:</p>
                  <p className="text-white font-black text-base sm:text-lg lg:text-xl">{activeRaffle.prize}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                <div className="bg-slate-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm border border-slate-600/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="h-5 w-5 text-amber-400" />
                    <span className="text-slate-300 text-sm font-medium">Participantes</span>
                  </div>
                  <p className="text-2xl font-black text-white">{takenNumbers.toLocaleString()}</p>
                </div>

                <div className="bg-slate-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm border border-slate-600/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                    <span className="text-slate-300 text-xs sm:text-sm font-medium">Disponíveis</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-white">{availableNumbers.toLocaleString()}</p>
                </div>

                <div className="bg-slate-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm border border-slate-600/30 sm:col-span-1 col-span-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                    <span className="text-slate-300 text-xs sm:text-sm font-medium">Taxa de Participação</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-white">{participationRate}%</p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-2 sm:pt-4">
                <a
                  href="#number-selection"
                  className="group inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-black rounded-xl sm:rounded-2xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 shadow-2xl hover:shadow-amber-500/25 transform hover:-translate-y-1 hover:scale-105"
                >
                  <span className="text-sm sm:text-base lg:text-lg">Participar Agora</span>
                  <ArrowRight className="ml-2 sm:ml-3 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </div>
            </div>

            {/* Right Side - Visual Elements */}
            <div className="relative mt-6 lg:mt-0">
              {/* Floating Cards */}
              <div className="space-y-3 sm:space-y-4">
                {/* Date Card */}
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-600/30 transform rotate-1 sm:rotate-3 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-400" />
                    <span className="text-amber-200 font-bold text-sm sm:text-base">Período do Sorteio</span>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <div>
                      <p className="text-slate-400 text-xs sm:text-sm">Início:</p>
                      <p className="text-white font-bold text-sm sm:text-base">{formatDate(activeRaffle.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs sm:text-sm">Término:</p>
                      <p className="text-white font-bold text-sm sm:text-base">{formatDate(activeRaffle.end_date)}</p>
                    </div>
                  </div>
                </div>

                {/* Urgency Card */}
                {isEndingSoon() && (
                  <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-400/30 transform -rotate-1 sm:-rotate-2 hover:rotate-0 transition-transform duration-300">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-200 font-bold text-sm sm:text-base">Terminando em Breve!</span>
                    </div>
                    <p className="text-red-100 text-xs sm:text-sm mt-1 sm:mt-2">
                      Não perca esta oportunidade única!
                    </p>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-600/30">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-slate-300 font-medium text-sm sm:text-base">Progresso do Sorteio</span>
                    <span className="text-amber-400 font-bold text-sm sm:text-base">{participationRate}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 sm:h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${participationRate}%` }}
                    ></div>
                  </div>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 sm:mt-2">
                    {takenNumbers.toLocaleString()} de {activeRaffle.total_numbers.toLocaleString()} números
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"></div>
    </div>
  );
}
