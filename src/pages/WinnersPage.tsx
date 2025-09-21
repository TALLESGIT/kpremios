import { Trophy, Calendar, User, Hash } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { useData } from '../context/DataContext';

function WinnersPage() {
  const { getDrawResults } = useData();
  const drawResults = getDrawResults();

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <Header />
      <main className="flex-grow bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-8 sm:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 text-center">
            <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              Ganhadores ZK Premios
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto">
              Confira todos os sortudos que já foram contemplados em nossos sorteios
            </p>
          </div>
        </div>

        {/* Winners List */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8 sm:py-12">
          {drawResults.length === 0 ? (
            <div className="text-center py-8 sm:py-12 lg:py-16">
              <Trophy className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-gray-300 mx-auto mb-4 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-600 mb-3 sm:mb-4">
                Ainda não temos ganhadores
              </h2>
              <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base">
                Os primeiros sorteios ainda não foram realizados. 
                Seja um dos primeiros a participar!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {drawResults.map((result, index) => {
                const winner = result.users;
                return (
                  <div
                    key={result.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        <span className="text-white font-bold text-sm sm:text-lg">
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
                            <p className="font-bold text-xl sm:text-2xl text-primary">
                              {result.winning_number}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          <div>
                            <p className="text-xs sm:text-sm text-gray-500">Data do Sorteio</p>
                            <p className="font-medium text-gray-900 text-sm sm:text-base">
                              {new Date(result.date).toLocaleDateString('pt-BR', {
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