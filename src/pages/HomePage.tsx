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
  const { currentUser, selectFreeNumber, numbers, loadNumbers } = useData();
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
            {/* Debug button - temporary */}
            <div className="text-center mb-4 space-x-2">
              <button
                onClick={() => {
                  console.log('Debug - Números atuais:', numbers.length, 'Max:', Math.max(...numbers.map(n => n.number)));
                  loadNumbers();
                }}
                className="bg-red-500 text-white px-4 py-2 rounded text-sm"
              >
                Debug: Reload Números ({numbers.length} números, max: {Math.max(...numbers.map(n => n.number))})
              </button>
              <button
                onClick={async () => {
                  console.log('Debug - Testando query direta...');
                  const { data, error } = await supabase
                    .from('numbers')
                    .select('number')
                    .gte('number', 2700)
                    .lte('number', 2800)
                    .limit(10);
                  console.log('Debug - Query direta resultado:', data, error);
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
              >
                Test Query 2700-2800
              </button>
              <button
                onClick={async () => {
                  console.log('Debug - Testando query completa...');
                  const { data, error } = await supabase
                    .from('numbers')
                    .select('number')
                    .order('number')
                    .limit(10000);
                  console.log('Debug - Query completa resultado:', data?.length, 'Max:', Math.max(...(data || []).map(n => n.number)));
                }}
                className="bg-purple-500 text-white px-4 py-2 rounded text-sm"
              >
                Test Full Query
              </button>
              <button
                onClick={() => {
                  console.log('Debug - Forçando reload da página...');
                  window.location.reload();
                }}
                className="bg-green-500 text-white px-4 py-2 rounded text-sm"
              >
                Force Page Reload
              </button>
            </div>
            <NumberSelection onSelectNumber={handleNumberSelection} selectedNumber={selectedNumber} />
            <RegistrationForm selectedNumber={selectedNumber} onSuccess={handleRegistrationSuccess} />
          </>
        )}

        {/* Card de Sorteios Gratuitos quando não há sorteios ativos */}
        {!isLoggedIn && !hasActiveRaffle && (
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl mx-2 sm:mx-4 lg:mx-8 mb-4 sm:mb-6 lg:mb-8 shadow-2xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>

            {/* Content */}
            <div className="relative z-10 p-6 sm:p-8 lg:p-12">
              <div className="max-w-4xl mx-auto text-center">
                {/* Icon */}
                <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-3xl">🎁</span>
                </div>

                {/* Title */}
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                  Sorteios Gratuitos
                </h2>

                {/* Subtitle */}
                <p className="text-xl text-amber-200 font-semibold mb-6">
                  Em breve, prêmios incríveis esperando por você!
                </p>

                {/* Description */}
                <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                  Nossos sorteios gratuitos estão temporariamente pausados para manutenção. 
                  Fique atento às nossas redes sociais para ser o primeiro a saber quando voltarem!
                </p>

                {/* Status Card */}
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 mb-8 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                    <span className="text-amber-200 font-bold text-lg">Status dos Sorteios</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Temporariamente indisponíveis para melhorias no sistema
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/live-raffle"
                    className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1 hover:scale-105"
                  >
                    <span className="text-lg">🎮 Participar de Sorteios ao Vivo</span>
                    <svg className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    to="/register"
                    className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 shadow-2xl hover:shadow-amber-500/25 transform hover:-translate-y-1 hover:scale-105"
                  >
                    <span className="text-lg">📝 Criar Conta Gratuita</span>
                    <svg className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>

                {/* Bottom Info */}
                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <p className="text-slate-400 text-sm">
                    💡 <strong className="text-amber-300">Dica:</strong> Cadastre-se agora e seja notificado automaticamente quando os sorteios voltarem!
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"></div>
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