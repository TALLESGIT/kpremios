import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import RaffleBanner from '../components/user/RaffleBanner';
import NumberSelection from '../components/user/NumberSelection';
import RegistrationForm from '../components/user/RegistrationForm';
import SuccessModal from '../components/shared/SuccessModal';

function HomePage() {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successNumber, setSuccessNumber] = useState<number | null>(null);

  const handleRegistrationSuccess = () => {
    setSuccessNumber(selectedNumber);
    setShowSuccess(true);
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
            <Link
              to="/login"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
            >
              Participar
            </Link>
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
        <NumberSelection onSelectNumber={setSelectedNumber} selectedNumber={selectedNumber} />
        <RegistrationForm selectedNumber={selectedNumber} onSuccess={handleRegistrationSuccess} />
      </main>
      
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="🎉 Cadastro Realizado!"
        message="Seu número foi reservado com sucesso! Agora você pode acessar 'Meus Números' para solicitar números extras e aumentar suas chances de ganhar."
        selectedNumber={successNumber || undefined}
        autoClose={false}
        autoCloseTime={8000}
      />
      
      <Footer />
    </div>
  );
}

export default HomePage;