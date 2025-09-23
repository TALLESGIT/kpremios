import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import RaffleBanner from '../components/user/RaffleBanner';
import NumberSelection from '../components/user/NumberSelection';
import RegistrationForm from '../components/user/RegistrationForm';
import SuccessModal from '../components/shared/SuccessModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser, selectFreeNumber } = useData();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successNumber, setSuccessNumber] = useState<number | null>(null);
  const [hasActiveRaffle, setHasActiveRaffle] = useState(false);
  
  // Verificar se o usuário está logado
  const isLoggedIn = user && currentUser;

  // Verificar se há sorteios ativos
  useEffect(() => {
    checkActiveRaffles();
  }, []);

  const checkActiveRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasActiveRaffle(true);
      } else {
        setHasActiveRaffle(false);
      }
    } catch (error) {
      setHasActiveRaffle(false);
    }
  };

  const handleRegistrationSuccess = () => {
    setSuccessNumber(selectedNumber);
    setShowSuccess(true);
  };

  const handleNumberSelection = async (number: number) => {
    if (isLoggedIn) {
      // Para usuários logados, selecionar número gratuito diretamente
      const success = await selectFreeNumber(number);
      if (success) {
        setSelectedNumber(number);
        setSuccessNumber(number);
        setShowSuccess(true);
      }
    } else {
      // Para usuários não logados, apenas definir o número selecionado
      setSelectedNumber(number);
    }
  };

  const handleUpsellClick = () => {
    setShowSuccess(false);
    navigate('/my-numbers');
  };

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <Header />
      <main className="flex-grow">
        {/* Live Games Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">🎮</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sorteios ao Vivo</h2>
                <p className="text-gray-600 text-sm">Participe das nossas lives com sorteios em tempo real!</p>
              </div>
            </div>
            {!isLoggedIn ? (
              <Link
                to="/login"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
              >
                Participar
              </Link>
            ) : (
              <Link
                to="/live-games"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
              >
                Jogar Agora
              </Link>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">⚡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Resta Um</h3>
                  <p className="text-gray-600 text-sm">Escolha seu número e sobreviva até o final!</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🎯</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Eliminação Automática</h3>
                  <p className="text-gray-600 text-sm">Um participante eliminado a cada minuto!</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <RaffleBanner />
        
        {/* Mostrar formulário de cadastro apenas se o usuário não estiver logado E houver sorteios ativos */}
        {!isLoggedIn && hasActiveRaffle && (
          <>
            <NumberSelection onSelectNumber={handleNumberSelection} selectedNumber={selectedNumber} />
            <RegistrationForm selectedNumber={selectedNumber} onSuccess={handleRegistrationSuccess} />
          </>
        )}

        {/* Mostrar mensagem quando não há sorteios ativos para usuários não logados */}
        {!isLoggedIn && !hasActiveRaffle && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-slate-500 to-slate-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">🎯</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Nenhum sorteio ativo no momento</h2>
            <p className="text-gray-600 mb-6">
              Não há sorteios gratuitos disponíveis para participação no momento. Fique atento para novos sorteios em breve!
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-amber-600">💡</span>
                <span className="text-amber-800 font-medium">Dica:</span>
              </div>
              <p className="text-amber-700 text-sm">
                Acesse o dashboard para ver suas estatísticas e atividades recentes!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/live-raffle"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                🎮 Participar de Sorteios ao Vivo
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                📝 Criar Conta Gratuita
              </Link>
            </div>
          </div>
        )}
        
        {/* Conteúdo para usuários logados */}
        {isLoggedIn && (
          <>
            {/* Seção de boas-vindas */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl mb-4">
                  <span className="text-2xl font-bold text-white">🎉</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo de volta, {currentUser?.name}!</h2>
                <p className="text-gray-600 mb-6">Você já está logado e pode participar dos nossos sorteios ao vivo.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/live-raffle"
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    🎮 Participar de Sorteios ao Vivo
                  </Link>
                  <Link
                    to="/my-numbers"
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    🔢 Ver Meus Números
                  </Link>
                </div>
              </div>
            </div>

            {/* Visualização dos números para usuários logados */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">🎯 Selecionar Número Gratuito</h3>
                <p className="text-gray-600">Escolha seu número gratuito para participar dos sorteios</p>
              </div>
              <NumberSelection 
                onSelectNumber={handleNumberSelection} 
                selectedNumber={selectedNumber} 
              />
            </div>
          </>
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