import { Trophy, Calendar, User, Hash } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { useData } from '../context/DataContext';

function WinnersPage() {
  const { getDrawResults } = useData();
  const drawResults = getDrawResults();

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow w-full relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/10 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-full h-[500px] bg-blue-900/20 blur-[100px]" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

        {/* Hero Section */}
        <div className="relative py-12 sm:py-20 lg:py-24">
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 mb-6 ring-1 ring-blue-400/20 backdrop-blur-md shadow-2xl shadow-blue-500/10">
              <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-400" />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
              GALERIA DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">GANHADORES</span>
            </h1>

            <p className="text-lg sm:text-xl text-blue-200/80 max-w-2xl mx-auto font-medium leading-relaxed">
              Confira todos os sortudos que já foram contemplados em nossos sorteios oficiais.
              Transparência e credibilidade em cada resultado.
            </p>
          </div>
        </div>

        {/* Winners List */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {drawResults.length === 0 ? (
            <div className="glass-panel p-12 sm:p-16 rounded-3xl text-center max-w-2xl mx-auto border border-white/5 bg-slate-800/50 backdrop-blur-xl">
              <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="h-12 w-12 text-blue-400/50" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Ainda não temos ganhadores
              </h2>
              <p className="text-blue-200/60 max-w-md mx-auto text-base sm:text-lg mb-8">
                Os primeiros sorteios ainda não foram realizados.
                Seja um dos primeiros a participar e garanta sua chance!
              </p>
              <a href="/" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl hover:from-blue-500 hover:to-blue-400 hover:shadow-lg hover:shadow-blue-500/25">
                Participar Agora
              </a>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {drawResults.map((result, index) => {
                const winner = result.users;
                const drawDate = result.draw_date ? new Date(result.draw_date) : null;

                return (
                  <div
                    key={result.id}
                    className="glass-panel p-0 rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 border border-white/5 bg-slate-800/40 backdrop-blur-md"
                  >
                    {/* Card Header */}
                    <div className="relative h-24 bg-gradient-to-r from-blue-900/50 to-blue-800/50 p-6 flex items-center justify-between overflow-hidden">
                      <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors" />

                      <div className="relative z-10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center backdrop-blur-sm border border-yellow-400/30">
                          <Trophy className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Colocação</p>
                          <p className="text-white font-black text-lg">#{index + 1}º Lugar</p>
                        </div>
                      </div>

                      {/* Decimal-style rank number background */}
                      <span className="absolute -right-4 -bottom-8 text-8xl font-black text-white/5 select-none pointer-events-none">
                        {index + 1}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 space-y-6">
                      {/* Winner Info */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0 border border-white/5">
                          <User className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1">Ganhador(a)</p>
                          <p className="font-bold text-white text-lg leading-tight">
                            {winner?.name || 'Nome não disponível'}
                          </p>
                        </div>
                      </div>

                      {/* Number Info */}
                      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Hash className="h-4 w-4 text-blue-400" />
                          </div>
                          <span className="text-sm font-medium text-blue-200">Número da Sorte</span>
                        </div>
                        <span className="text-2xl font-black text-blue-400 font-mono">
                          {result.winning_number}
                        </span>
                      </div>

                      {/* Date Info */}
                      <div className="flex items-center gap-3 pb-6 border-b border-white/5">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-400 text-sm">
                          Sorteado em {drawDate ? drawDate.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          }) : 'Data não disponível'}
                        </span>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => {
                          const message = `Olá! Vi que você foi o ganhador do sorteio com o número #${result.winning_number}. 
Gostaria de saber mais detalhes sobre como receber o prêmio.
Obrigado! 🎉`;
                          const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                        className="w-full group/btn relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 p-[1px] transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]"
                      >
                        <div className="relative flex items-center justify-center gap-2 rounded-xl bg-slate-900/50 px-4 py-3 transition-all duration-300 group-hover/btn:bg-transparent">
                          <svg className="h-5 w-5 text-emerald-400 group-hover/btn:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                          </svg>
                          <span className="font-bold text-white group-hover/btn:text-white">Entrar em Contato</span>
                        </div>
                      </button>
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
}

export default WinnersPage;