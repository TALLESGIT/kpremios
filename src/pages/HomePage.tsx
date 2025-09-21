import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import RaffleBanner from '../components/user/RaffleBanner';
import NumberSelection from '../components/user/NumberSelection';
import RegistrationForm from '../components/user/RegistrationForm';
import SuccessModal from '../components/shared/SuccessModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser } = useData();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successNumber, setSuccessNumber] = useState<number | null>(null);
  
  // Verificar se o usuário está logado
  const isLoggedIn = user && currentUser;

  const handleRegistrationSuccess = () => {
    setSuccessNumber(selectedNumber);
    setShowSuccess(true);
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
        
        {/* Mostrar formulário de cadastro apenas se o usuário não estiver logado */}
        {!isLoggedIn && (
          <>
            <NumberSelection onSelectNumber={setSelectedNumber} selectedNumber={selectedNumber} />
            <RegistrationForm selectedNumber={selectedNumber} onSuccess={handleRegistrationSuccess} />
          </>
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
                    to="/live-games"
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">📊 Status dos Números</h3>
                <p className="text-gray-600">Visualize quais números estão disponíveis e ocupados</p>
              </div>
              <NumberSelection 
                onSelectNumber={() => {}} 
                selectedNumber={null} 
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