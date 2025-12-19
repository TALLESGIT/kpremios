import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import NumberSelection from '../components/user/NumberSelection';
import RegistrationForm from '../components/user/RegistrationForm';
import SuccessModal from '../components/shared/SuccessModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { ChevronDown, Play, Trophy, Ticket, MonitorPlay, Calendar, MapPin, Clock } from 'lucide-react';
import { CruzeiroGame } from '../types';

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser, selectFreeNumber, numbers } = useData();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successNumber, setSuccessNumber] = useState<number | null>(null);
  const [hasActiveRaffle, setHasActiveRaffle] = useState(false);
  const [activeRafflesCount, setActiveRafflesCount] = useState(0);
  const [winnersCount, setWinnersCount] = useState(0);
  const [nextGame, setNextGame] = useState<CruzeiroGame | null>(null);
  const [loadingGame, setLoadingGame] = useState(true);

  // Verificar se o usuário está logado
  const isLoggedIn = user && currentUser;

  // Verificar se há sorteios ativos e carregar dados
  useEffect(() => {
    checkActiveRaffles();
    loadWinnersCount();
    loadNextGame();
  }, []);

  const checkActiveRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('id')
        .eq('is_active', true);

      if (!error && data) {
        setHasActiveRaffle(data.length > 0);
        setActiveRafflesCount(data.length);
      } else {
        setHasActiveRaffle(false);
        setActiveRafflesCount(0);
      }
    } catch (error) {
      setHasActiveRaffle(false);
      setActiveRafflesCount(0);
    }
  };

  const loadWinnersCount = async () => {
    try {
      const { data, error } = await supabase
        .from('draw_results')
        .select('id', { count: 'exact' });

      if (!error && data !== null) {
        setWinnersCount(data.length || 0);
      }
    } catch (error) {
      setWinnersCount(0);
    }
  };

  const loadNextGame = async () => {
    try {
      setLoadingGame(true);
      const { data, error } = await supabase
        .from('cruzeiro_games')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setNextGame(data);
      }
    } catch (error) {
      console.error('Error loading next game:', error);
    } finally {
      setLoadingGame(false);
    }
  };

  const handleRegistrationSuccess = () => {
    setSuccessNumber(selectedNumber);
    setShowSuccess(true);
  };

  const handleNumberSelection = async (number: number) => {
    if (isLoggedIn) {
      const success = await selectFreeNumber(number);
      if (success) {
        setSelectedNumber(number);
        setSuccessNumber(number);
        setShowSuccess(true);
      }
    } else {
      setSelectedNumber(number);
    }
  };

  const handleUpsellClick = () => {
    setShowSuccess(false);
    navigate('/my-numbers');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow w-full relative">
        {/* Background Patterns (Optional specifics) */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>

        {/* Hero Section - O MAIOR DE MINAS */}
        <div className="relative w-full overflow-hidden">
          {/* Hero Background with Gradient/Image */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-primary-dark to-black opacity-90"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32 flex flex-col items-center text-center">

            {/* Stars Decoration */}
            <div className="flex gap-4 mb-6 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-accent text-3xl sm:text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">★</span>
              ))}
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-9xl font-display font-black text-white mb-6 tracking-tighter drop-shadow-2xl italic">
              O MAIOR <br className="sm:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white">DE MINAS</span>
            </h1>

            <p className="text-blue-100 text-lg sm:text-2xl max-w-2xl font-light mb-10 leading-relaxed">
              Participe dos sorteios exclusivos e concorra a prêmios dignos da nação azul.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                to={hasActiveRaffle ? (isLoggedIn ? "/free-raffles" : "/login") : "/winners"}
                className="btn btn-primary px-10 py-4 text-lg shadow-blue-500/50 hover:shadow-blue-400/60"
              >
                PARTICIPAR AGORA
              </Link>
              <Link
                to="/live-games"
                className="btn btn-outline px-10 py-4 text-lg border-white/40 hover:bg-white/10"
              >
                ASSISTIR LIVES
              </Link>
            </div>

            {/* Floating Prizes (Visual Only) */}
            <div className="absolute -bottom-16 opacity-10 pointer-events-none w-full flex justify-between px-4">
              <span className="text-9xl transform -rotate-12 blur-sm">🦊</span>
              <span className="text-9xl transform rotate-12 blur-sm">🏆</span>
            </div>

            {/* NEXT GAME FLOATING WIDGET - 2026 EDITION */}
            {!loadingGame && nextGame && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 sm:px-0 z-30">
                <div className="glass-panel-dark border border-white/10 p-5 rounded-[2rem] shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest">Próximo Jogo</span>
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{nextGame.competition}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col items-center flex-1">
                      <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-[10px] font-black text-white mb-2 shadow-lg shadow-blue-600/20">CRU</div>
                      <span className="text-[10px] font-bold text-white uppercase">Cruzeiro</span>
                    </div>
                    <div className="text-xl font-black italic text-white/10 uppercase">VS</div>
                    <div className="flex flex-col items-center flex-1">
                      <div className="h-10 w-10 bg-slate-800 border border-white/5 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 mb-2">
                        {nextGame.opponent.substring(0, 3).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase truncate max-w-[80px]">{nextGame.opponent}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-300">
                      <Calendar className="w-3 h-3" />
                      {new Date(nextGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-300">
                      <Clock className="w-3 h-3" />
                      {new Date(nextGame.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats / Info Bar */}
        <div className="glass-panel border-y border-white/10 relative z-10 backdrop-blur-xl bg-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            <div className="transform hover:scale-105 transition-transform">
              <p className="text-4xl font-black text-accent">{activeRafflesCount}</p>
              <p className="text-xs sm:text-sm uppercase tracking-widest opacity-70">Sorteios Ativos</p>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <p className="text-4xl font-black text-white">{winnersCount}</p>
              <p className="text-xs sm:text-sm uppercase tracking-widest opacity-70">Ganhadores</p>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <p className="text-4xl font-black text-white">💯%</p>
              <p className="text-xs sm:text-sm uppercase tracking-widest opacity-70">Segurança</p>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <p className="text-4xl font-black text-accent">24h</p>
              <p className="text-xs sm:text-sm uppercase tracking-widest opacity-70">Suporte</p>
            </div>
          </div>
        </div>

        {/* Main Content Areas */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">

          {/* LIVE STREAM BANNER - MODERN & PROFESSIONAL */}
          <section className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-400 rounded-[2.5rem] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <Link
              to="/zk-tv"
              className="relative block rounded-[2.5rem] overflow-hidden border border-white/10 glass-panel shadow-2xl transition-all duration-500 hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 bg-slate-900/40 opacity-60"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.15),transparent)]"></div>

              <div className="relative p-8 sm:p-14 flex flex-col lg:flex-row items-center justify-between gap-10">
                <div className="flex-1 flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
                  {/* Decorative Icon */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
                      <MonitorPlay className="w-12 h-12 text-white" />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                      <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">ZK TV</span>
                      <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em]">Ao Vivo</span>
                      </div>
                    </div>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 italic tracking-tight uppercase leading-none">
                      Acompanhe <br className="hidden sm:block" />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-400">Tudo ao Vivo</span>
                    </h2>
                    <p className="text-blue-100/60 text-lg font-medium max-w-lg">
                      Transmissões premium com estatísticas em tempo real, tabelas e prêmios exclusivos durante os jogos.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="flex -space-x-4 mb-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-12 h-12 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-blue-400 shadow-xl overflow-hidden glass-panel">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="viewer" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                      +1.2k
                    </div>
                  </div>
                  <button className="bg-white text-blue-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-50 transition-colors shadow-xl shadow-white/5 active:scale-95 duration-200">
                    Entrar na Live
                  </button>
                </div>
              </div>

              {/* Decorative scanline effect */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
            </Link>
          </section>

          {/* Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: SORTEIOS */}
            <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
              <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-6 text-blue-300 group-hover:scale-110 transition-transform group-hover:bg-blue-500/30">
                <Ticket className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Sorteios Ativos</h3>
              <p className="text-blue-200 mb-8 text-sm leading-relaxed">Confira os prêmios disponíveis agora mesmo.</p>
              <Link to={hasActiveRaffle ? "/free-raffles" : "#"} className="btn btn-outline w-full border-blue-400/30 hover:bg-blue-500/20 text-blue-300 hover:text-white rounded-xl">
                PARTICIPAR
              </Link>
            </div>

            {/* Card 2: GANHADORES */}
            <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-yellow-600"></div>
              <div className="w-20 h-20 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 text-accent group-hover:scale-110 transition-transform group-hover:bg-yellow-500/30">
                <Trophy className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Hall da Fama</h3>
              <p className="text-blue-200 mb-8 text-sm leading-relaxed">Veja quem já faturou prêmios incríveis.</p>
              <Link to="/winners" className="btn btn-outline w-full border-yellow-400/30 hover:bg-yellow-500/20 text-accent hover:text-white rounded-xl">
                VER GANHADORES
              </Link>
            </div>

            {/* Card 3: RANKING */}
            <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-300 group-hover:scale-110 transition-transform group-hover:bg-green-500/30">
                <MonitorPlay className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Tabela</h3>
              <p className="text-blue-200 mb-8 text-sm leading-relaxed">Acompanhe o Cabuloso no campeonato.</p>
              <button className="btn btn-outline w-full border-green-400/30 hover:bg-green-500/20 text-green-300 hover:text-white rounded-xl">
                VER TABELA
              </button>
            </div>
          </section>

          {/* Banner Ad Space */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-r from-white/20 via-blue-400/50 to-white/20">
            <div className="bg-gradient-to-r from-primary-dark to-blue-900 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">Publicidade</span>
                <h3 className="text-white font-black text-2xl sm:text-4xl uppercase tracking-widest mb-4 opacity-80">Seu anúncio aqui</h3>
                <p className="text-blue-200 text-sm max-w-lg mx-auto">Destaque sua marca para a maior torcida de Minas Gerais. Entre em contato.</p>
              </div>
            </div>
          </div>

          {/* Number Selection Area (Legacy/Functional) */}
          {(isLoggedIn || (!isLoggedIn && hasActiveRaffle)) && (
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"></div>
              <div className="glass-panel-dark p-1 rounded-3xl relative z-10">
                <div className="rounded-[20px] p-6 sm:p-10 bg-black/40 backdrop-blur-sm">
                  <div className="text-center mb-10">
                    <span className="px-4 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4 inline-block">Sorteio Gratuito</span>
                    <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-display">
                      🎯 Escolha seu Número
                    </h3>
                    <p className="text-blue-200 max-w-xl mx-auto">
                      Selecione seu número da sorte abaixo para participar do sorteio ativo. É rápido e fácil.
                    </p>
                  </div>

                  {isLoggedIn ? (
                    <NumberSelection
                      onSelectNumber={handleNumberSelection}
                      selectedNumber={selectedNumber}
                    />
                  ) : (
                    <div className="space-y-8">
                      <NumberSelection
                        onSelectNumber={handleNumberSelection}
                        selectedNumber={selectedNumber}
                      />
                      <div className="border-t border-white/10 pt-8 mt-8">
                        <div className="text-center mb-6">
                          <p className="text-white font-bold">Cadastre-se para confirmar seu número</p>
                        </div>
                        <RegistrationForm
                          selectedNumber={selectedNumber}
                          onSuccess={handleRegistrationSuccess}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="🎉 Número Selecionado!"
        message={`Seu número gratuito #${successNumber} foi reservado com sucesso!`}
        selectedNumber={successNumber || undefined}
        autoClose={false}
        autoCloseTime={8000}
        showUpsell={true}
        onUpsellClick={handleUpsellClick}
      />

      <Footer />
    </div>
  );
}

export default HomePage;
