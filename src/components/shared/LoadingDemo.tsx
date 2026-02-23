import React, { useState } from 'react';
import LoadingScreen from './LoadingScreen';
import LoadingSpinner, { LoadingButton } from './LoadingSpinner';
import { useLoading, useAutoLoading, loadingMessages } from '../../hooks/useLoading';

const LoadingDemo: React.FC = () => {
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  
  // Hook de loading personalizado
  const { 
    isLoading: customLoading, 
    currentMessage, 
    progress, 
    setLoading: setCustomLoading,
    setProgress,
    setMessage 
  } = useLoading({
    messages: loadingMessages.whatsapp,
    messageInterval: 1500
  });

  // Auto loading com progresso
  const { isLoading: autoLoading, progress: autoProgress } = useAutoLoading(4000);

  const handleButtonClick = () => {
    setButtonLoading(true);
    // Simular operação assíncrona
    setTimeout(() => {
      setButtonLoading(false);
    }, 3000);
  };

  const handleCustomLoading = () => {
    setCustomLoading(true);
    
    // Simular progresso manual
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setCustomLoading(false);
        }, 500);
      }
    }, 300);
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Demonstração dos Componentes de Loading
        </h1>

        {/* Tela de Loading Completa */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Tela de Loading Completa</h2>
          <p className="text-gray-600 mb-4">
            Tela de carregamento moderna e responsiva para mobile e desktop.
          </p>
          <button
            onClick={() => setShowFullScreen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Mostrar Loading Screen
          </button>
          
          {showFullScreen && (
            <div className="fixed inset-0 z-50">
              <LoadingScreen message="Carregando aplicação..." />
              <button
                onClick={() => setShowFullScreen(false)}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm z-50"
              >
                Fechar
              </button>
            </div>
          )}
        </div>

        {/* Spinners */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Spinners e Indicadores</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Tamanhos */}
            <div>
              <h3 className="font-medium mb-3">Tamanhos</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm">Small</span>
                </div>
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="md" />
                  <span className="text-sm">Medium</span>
                </div>
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="lg" />
                  <span className="text-sm">Large</span>
                </div>
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="xl" />
                  <span className="text-sm">Extra Large</span>
                </div>
              </div>
            </div>

            {/* Cores */}
            <div>
              <h3 className="font-medium mb-3">Cores</h3>
              <div className="space-y-3">
                <LoadingSpinner color="blue" />
                <LoadingSpinner color="green" />
                <LoadingSpinner color="red" />
                <LoadingSpinner color="gray" />
              </div>
            </div>

            {/* Variantes */}
            <div>
              <h3 className="font-medium mb-3">Variantes</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <LoadingSpinner variant="spinner" />
                  <span className="text-sm">Spinner</span>
                </div>
                <div className="flex items-center space-x-2">
                  <LoadingSpinner variant="dots" />
                  <span className="text-sm">Dots</span>
                </div>
                <div className="flex items-center space-x-2">
                  <LoadingSpinner variant="pulse" />
                  <span className="text-sm">Pulse</span>
                </div>
                <div className="flex items-center space-x-2">
                  <LoadingSpinner variant="bars" />
                  <span className="text-sm">Bars</span>
                </div>
              </div>
            </div>

            {/* Em fundos escuros */}
            <div>
              <h3 className="font-medium mb-3">Fundo Escuro</h3>
              <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                <LoadingSpinner color="white" />
                <LoadingSpinner color="white" variant="dots" />
                <LoadingSpinner color="white" variant="bars" />
              </div>
            </div>
          </div>
        </div>

        {/* Botões com Loading */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Botões com Loading</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium mb-3">Variantes</h3>
              <div className="space-y-3">
                <LoadingButton 
                  variant="primary" 
                  isLoading={buttonLoading}
                  onClick={handleButtonClick}
                  loadingText="Processando..."
                >
                  Botão Primário
                </LoadingButton>
                
                <LoadingButton 
                  variant="secondary" 
                  isLoading={buttonLoading}
                  onClick={handleButtonClick}
                >
                  Botão Secundário
                </LoadingButton>
                
                <LoadingButton 
                  variant="outline" 
                  isLoading={buttonLoading}
                  onClick={handleButtonClick}
                >
                  Botão Outline
                </LoadingButton>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3">Tamanhos</h3>
              <div className="space-y-3">
                <LoadingButton size="sm" isLoading={buttonLoading}>
                  Pequeno
                </LoadingButton>
                
                <LoadingButton size="md" isLoading={buttonLoading}>
                  Médio
                </LoadingButton>
                
                <LoadingButton size="lg" isLoading={buttonLoading}>
                  Grande
                </LoadingButton>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3">Estados</h3>
              <div className="space-y-3">
                <LoadingButton>Normal</LoadingButton>
                <LoadingButton isLoading={true}>Carregando</LoadingButton>
                <LoadingButton disabled={true}>Desabilitado</LoadingButton>
              </div>
            </div>
          </div>
        </div>

        {/* Hook de Loading Personalizado */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Hook de Loading Personalizado</h2>
          
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={handleCustomLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                disabled={customLoading}
              >
                Iniciar Loading Personalizado
              </button>
              
              <button
                onClick={() => setMessage('Mensagem personalizada!')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                disabled={!customLoading}
              >
                Alterar Mensagem
              </button>
            </div>

            {customLoading && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-800 mb-2">{currentMessage}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{progress}% concluído</p>
              </div>
            )}
          </div>
        </div>

        {/* Auto Loading */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Auto Loading com Progresso</h2>
          
          {autoLoading ? (
            <div className="text-center py-8">
              <LoadingSpinner size="xl" className="mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-800 mb-4">Carregamento automático...</p>
              <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-100" 
                  style={{ width: `${autoProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{Math.round(autoProgress)}%</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-green-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-800">Carregamento concluído!</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Recarregar Demo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingDemo;