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
import { ChevronDown, Play } from 'lucide-react';

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
  
  // Verificar se o usuário está logado
  const isLoggedIn = user && currentUser;

  // Verificar se há sorteios ativos e carregar dados
  useEffect(() => {
    checkActiveRaffles();
    loadWinnersCount();
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      
      <main className="flex-grow w-full">
        {/* Banner Principal - PRÊMIOS DO CRUZEIRÃO */}
        <div className="relative w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 overflow-hidden">
          {/* Efeito de luz/brilho */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Texto Principal */}
              <div className="lg:col-span-7 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                  <span className="text-yellow-300 text-xl sm:text-2xl">⭐</span>
                  <span className="text-yellow-300 text-xl sm:text-2xl">⭐</span>
                  <span className="text-yellow-300 text-xl sm:text-2xl">⭐</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 sm:mb-6 leading-tight" style={{
                  textShadow: '3px 3px 0px rgba(251, 191, 36, 0.8), -1px -1px 0px rgba(251, 191, 36, 0.8)',
                  WebkitTextStroke: '2px rgba(251, 191, 36, 0.9)'
                }}>
                  PRÊMIOS DO CRUZEIRÃO
                </h1>
              </div>
              
              {/* Prêmios Visuais */}
              <div className="lg:col-span-5 relative">
                <div className="flex flex-wrap justify-center lg:justify-end items-center gap-4 sm:gap-6">
                  {/* Moedas */}
                  <div className="text-5xl sm:text-6xl lg:text-7xl">🪙</div>
                  {/* Camisa */}
                  <div className="text-5xl sm:text-6xl lg:text-7xl">👕</div>
                  {/* PS5 */}
                  <div className="text-5xl sm:text-6xl lg:text-7xl">🎮</div>
                  {/* Controle */}
                  <div className="text-5xl sm:text-6xl lg:text-7xl">🎮</div>
                </div>
                
                {/* Espaço para Banner (Desktop) */}
                <div className="hidden lg:block mt-6 bg-white border-2 border-blue-400 rounded-lg p-4 text-center">
                  <p className="text-blue-600 font-semibold text-sm">ESPAÇO PARA SEU BANNER</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Espaços Publicitários - Mobile primeiro, depois Desktop */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Banner 1 */}
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl p-4 sm:p-6 border-2 border-blue-300 text-center">
              <p className="text-blue-700 font-bold text-sm sm:text-base mb-1">SEU ANÚNCIO AQUI</p>
              <p className="text-blue-600 text-xs sm:text-sm">Publicidade</p>
            </div>
            
            {/* Banner 2 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 sm:p-6 border-2 border-blue-500 text-center">
              <p className="text-white font-bold text-sm sm:text-base">ESPAÇO PUBLICITÁRIO</p>
            </div>
          </div>
        </div>

        {/* Seção LIVES PREMIADAS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Link 
            to={isLoggedIn ? "/live-games" : "/login"}
            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 sm:p-8 shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02]"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" fill="white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">
                    LIVES PREMIADAS
                  </h2>
                  <p className="text-blue-100 text-sm sm:text-base lg:text-lg font-semibold">
                    ASSISTA E GANHE!
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Cards Interativos */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1: SORTEIOS ATIVOS */}
            <Link
              to={hasActiveRaffle ? "/free-raffles" : "#"}
              className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-5">
                <h3 className="text-white font-bold text-lg sm:text-xl text-center">
                  SORTEIOS ATIVOS
                </h3>
              </div>
              <div className="p-6 sm:p-8 text-center">
                <ChevronDown className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-blue-600 mb-4" />
                <div className="mb-4">
                  <p className="text-2xl sm:text-3xl font-black text-blue-600 mb-2">
                    {activeRafflesCount}
                  </p>
                  <p className="text-gray-600 text-sm">sorteio{activeRafflesCount !== 1 ? 's' : ''} disponível{activeRafflesCount !== 1 ? 'eis' : ''}</p>
                </div>
                <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 text-sm sm:text-base">
                  PARTICIPE
                </button>
              </div>
            </Link>

            {/* Card 2: ÚLTIMOS GANHADORES */}
            <Link
              to="/winners"
              className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-5">
                <h3 className="text-white font-bold text-lg sm:text-xl text-center">
                  ÚLTIMOS GANHADORES
                </h3>
              </div>
              <div className="p-6 sm:p-8 text-center">
                <ChevronDown className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-blue-600 mb-4" />
                <div className="mb-4">
                  <p className="text-2xl sm:text-3xl font-black text-blue-600 mb-2">
                    {winnersCount}
                  </p>
                  <p className="text-gray-600 text-sm">ganhador{winnersCount !== 1 ? 'es' : ''} registrado{winnersCount !== 1 ? 's' : ''}</p>
                </div>
                <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 text-sm sm:text-base">
                  VER GANHADORES
                </button>
              </div>
            </Link>

            {/* Card 3: TABELA DO CRUZEIRO */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-5">
                <h3 className="text-white font-bold text-lg sm:text-xl text-center">
                  TABELA DO CRUZEIRO
                </h3>
              </div>
              <div className="p-6 sm:p-8 text-center">
                <ChevronDown className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-blue-600 mb-4" />
                <div className="mb-4">
                  <p className="text-2xl sm:text-3xl font-black text-blue-600 mb-2">
                    🏆
                  </p>
                  <p className="text-gray-600 text-sm">Classificação</p>
                </div>
                <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 text-sm sm:text-base">
                  ACOMPANHE
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Inferior Publicitário */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 rounded-2xl p-6 sm:p-8 lg:p-12 text-center shadow-2xl">
            <h3 className="text-white font-black text-2xl sm:text-3xl lg:text-4xl mb-2">
              SEU BANNER AQUI
            </h3>
            <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
              ESPAÇO PUBLICITÁRIO
            </p>
          </div>
        </div>

        {/* Conteúdo Funcional - Mantido para não perder funcionalidades */}
        {!isLoggedIn && hasActiveRaffle && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <NumberSelection 
                onSelectNumber={handleNumberSelection} 
                selectedNumber={selectedNumber} 
              />
              <div className="mt-6">
                <RegistrationForm 
                  selectedNumber={selectedNumber} 
                  onSuccess={handleRegistrationSuccess} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo para usuários logados */}
        {isLoggedIn && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-6">
              <div className="text-center mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  🎯 Selecionar Número Gratuito
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Escolha seu número gratuito para participar dos sorteios
                </p>
              </div>
              <NumberSelection 
                onSelectNumber={handleNumberSelection} 
                selectedNumber={selectedNumber} 
              />
            </div>
          </div>
        )}
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
