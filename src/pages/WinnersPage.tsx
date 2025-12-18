import { Trophy, Calendar, User, Hash } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { useData } from '../context/DataContext';

function WinnersPage() {
  const { getDrawResults } = useData();
  const drawResults = getDrawResults();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-grow w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 py-8 sm:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-300 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-3 sm:mb-4" style={{
              textShadow: '2px 2px 0px rgba(251, 191, 36, 0.8)'
            }}>
              GANHADORES ZK PREMIOS
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-blue-100 max-w-2xl mx-auto">
              Confira todos os sortudos que já foram contemplados em nossos sorteios
            </p>
          </div>
        </div>

        {/* Winners List */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {drawResults.length === 0 ? (
            <div className="text-center py-8 sm:py-12 lg:py-16">
              <Trophy className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-blue-300 mx-auto mb-4 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl font-bold text-blue-600 mb-3 sm:mb-4">
                Ainda não temos ganhadores
              </h2>
              <p className="text-blue-500 max-w-md mx-auto text-sm sm:text-base">
                Os primeiros sorteios ainda não foram realizados. 
                Seja um dos primeiros a participar!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {drawResults.map((result, index) => {
                const winner = (result as any).users;
                return (
                  <div
                    key={result.id}
                    className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-300" />
                        <span className="text-white font-black text-sm sm:text-lg">
                          #{index + 1}º Lugar
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 sm:p-6">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          <div>
                            <p className="text-xs sm:text-sm text-gray-500">Ganhador</p>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">
                              {winner?.name || 'Nome não encontrado'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          <div>
                            <p className="text-xs sm:text-sm text-gray-500">Número Sorteado</p>
                            <p className="font-black text-xl sm:text-2xl text-blue-600">
                              {result.winning_number}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          <div>
                            <p className="text-xs sm:text-sm text-gray-500">Data do Sorteio</p>
                            <p className="font-medium text-gray-900 text-sm sm:text-base">
                              {result.draw_date ? new Date(result.draw_date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Data não disponível'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Botão WhatsApp para contato */}
                        <div className="pt-3 border-t border-gray-200">
                          <button
                            onClick={() => {
                              const message = `Olá! Vi que você foi o ganhador do sorteio com o número #${result.winning_number}. 

Gostaria de saber mais detalhes sobre como receber o prêmio.

Obrigado! 🎉`;

                              const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
                              window.open(whatsappUrl, '_blank');
                            }}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                            </svg>
                            Entrar em Contato
                          </button>
                        </div>
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
}

export default WinnersPage;