import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import { checkMessageStatus } from '../../services/checkMessageStatus';
import { USE_EVOLUTION_API, EVOLUTION_API_KEY_CONFIGURED, EVOLUTION_API_URL_CONFIGURED } from '../../services/whatsappService';
import { evolutionApiService } from '../../services/evolutionApiService';

interface WhatsAppTestPanelProps {
  onClose: () => void;
}

export const WhatsAppTestPanel: React.FC<WhatsAppTestPanelProps> = ({ onClose }) => {
  const {
    loading,
    error,
    sendRegistrationConfirmation,
    sendNumbersAssigned,
    sendNewRaffleNotification,
    sendWinnerAnnouncement
  } = useWhatsApp();

  const [testData, setTestData] = useState({
    name: 'João Silva',
    email: 'joao@teste.com',
    whatsapp: '+5511999999999',
    confirmationCode: '123456'
  });

  const [result, setResult] = useState<any>(null);
  const [messageSids] = useState<string[]>([]);
  const [instanceStatus, setInstanceStatus] = useState<{ connected: boolean; status?: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleTestRegistration = async () => {
    const success = await sendRegistrationConfirmation({
      name: testData.name,
      email: testData.email,
      whatsapp: testData.whatsapp,
      confirmationCode: testData.confirmationCode
    });

    setResult({
      type: 'registration',
      success,
      message: success ? 'Notificação de cadastro enviada!' : 'Falha ao enviar notificação'
    });
  };

  const handleTestNumbers = async () => {
    const success = await sendNumbersAssigned({
      name: testData.name,
      whatsapp: testData.whatsapp,
      numbers: [123, 456, 789]
    });

    setResult({
      type: 'numbers',
      success,
      message: success ? 'Notificação de números enviada!' : 'Falha ao enviar notificação'
    });
  };

  const handleTestRaffle = async () => {
    const success = await sendNewRaffleNotification({
      name: testData.name,
      whatsapp: testData.whatsapp,
      raffleTitle: 'Sorteio Teste iPhone 15',
      prize: 'iPhone 15 Pro Max 256GB',
      startDate: '2025-01-01',
      endDate: '2025-01-31'
    });

    setResult({
      type: 'raffle',
      success,
      message: success ? 'Notificação de sorteio enviada!' : 'Falha ao enviar notificação'
    });
  };

  const handleTestWinner = async () => {
    const success = await sendWinnerAnnouncement({
      name: testData.name,
      whatsapp: testData.whatsapp,
      winningNumber: 123,
      prize: 'iPhone 15 Pro Max 256GB',
      isWinner: true
    });

    setResult({
      type: 'winner',
      success,
      message: success ? 'Notificação de ganhador enviada!' : 'Falha ao enviar notificação'
    });
  };

  const checkMessageStatuses = async () => {
    if (messageSids.length === 0) {
      alert('Nenhuma mensagem para verificar');
      return;
    }

    const results = [];
    for (const sid of messageSids) {
      const status = await checkMessageStatus(sid);
      results.push({ sid, status });
    }
    setResult({
      type: 'status_check',
      success: true,
      message: `Verificados ${results.length} status`,
      details: results
    });
  };

  const checkInstanceStatus = async () => {
    if (!USE_EVOLUTION_API) return;
    
    setCheckingStatus(true);
    try {
      const status = await evolutionApiService.checkInstanceStatus();
      setInstanceStatus(status);
    } catch (err: any) {
      setInstanceStatus({ connected: false, status: 'erro' });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectInstance = async () => {
    if (!USE_EVOLUTION_API) return;
    
    setConnecting(true);
    try {
      const result = await evolutionApiService.connectInstance();
      if (result.success) {
        // Aguardar um pouco e verificar novamente
        setTimeout(() => {
          checkInstanceStatus();
        }, 2000);
      } else {
        setResult({
          type: 'connection',
          success: false,
          message: result.error || 'Erro ao conectar instância'
        });
      }
    } catch (err: any) {
      setResult({
        type: 'connection',
        success: false,
        message: err.message || 'Erro ao conectar instância'
      });
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (USE_EVOLUTION_API) {
      checkInstanceStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">🧪 Teste WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h3 className="font-medium text-blue-800 mb-2">📱 Configuração Atual:</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <div className="flex justify-between">
                <span><strong>Evolution API:</strong></span>
                <span className={USE_EVOLUTION_API ? 'text-green-600 font-bold' : 'text-red-600'}>
                  {USE_EVOLUTION_API ? 'Habilitada' : 'Desabilitada'}
                </span>
              </div>
              <div className="flex justify-between">
                <span><strong>Key Configurada:</strong></span>
                <span className={EVOLUTION_API_KEY_CONFIGURED ? 'text-green-600 font-bold' : 'text-red-600'}>
                  {EVOLUTION_API_KEY_CONFIGURED ? 'Sim' : 'Não (Ausente)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span><strong>URL Configurada:</strong></span>
                <span className={EVOLUTION_API_URL_CONFIGURED ? 'text-green-600 font-bold' : 'text-red-600'}>
                  {EVOLUTION_API_URL_CONFIGURED ? 'Sim' : 'Não (Ausente)'}
                </span>
              </div>
              {USE_EVOLUTION_API && instanceStatus && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-300">
                  <span><strong>Status da Instância:</strong></span>
                  <div className="flex items-center gap-2">
                    <span className={instanceStatus.connected ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                      {instanceStatus.connected ? '✅ Conectada' : `⚠️ ${instanceStatus.status || 'Desconectada'}`}
                    </span>
                    <button
                      onClick={checkInstanceStatus}
                      disabled={checkingStatus}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      title="Atualizar status"
                    >
                      {checkingStatus ? '⏳' : '🔄'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {!USE_EVOLUTION_API && (
              <p className="mt-2 text-xs text-red-500 font-bold">
                ⚠️ Verifique as variáveis VITE_ no seu .env e reinicie o servidor.
              </p>
            )}
            {USE_EVOLUTION_API && instanceStatus && !instanceStatus.connected && (
              <div className="mt-3 pt-3 border-t border-blue-300">
                <p className="text-xs text-orange-700 mb-2">
                  ⚠️ A instância não está conectada. Você precisa:
                </p>
                <ol className="text-xs text-orange-700 list-decimal list-inside space-y-1 mb-2">
                  <li>Acessar o servidor da Evolution API</li>
                  <li>Escanear o QR Code para conectar o WhatsApp</li>
                  <li>Aguardar o status mudar para "open"</li>
                </ol>
                <button
                  onClick={handleConnectInstance}
                  disabled={connecting}
                  className="w-full text-xs px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {connecting ? '⏳ Conectando...' : '🔗 Tentar Conectar Instância'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                value={testData.name}
                onChange={(e) => setTestData({ ...testData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp
              </label>
              <input
                type="text"
                value={testData.whatsapp}
                onChange={(e) => setTestData({ ...testData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                placeholder="+5511999999999"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Erro:</strong> {error}
              {error.includes('não conectada') && (
                <div className="mt-2 text-sm">
                  <p className="font-semibold mb-1">📋 Como conectar:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Acesse o Manager da Evolution API (geralmente em http://seu-servidor:3000)</li>
                    <li>Localize a instância <strong>ZkOficial</strong></li>
                    <li>Clique em "Conectar" ou escaneie o QR Code exibido</li>
                    <li>Aguarde o status mudar para "open" (conectado)</li>
                    <li>Clique no botão 🔄 acima para atualizar o status</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTestRegistration}
              disabled={loading}
              className="bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? '⏳' : '📝'} Cadastro
            </button>

            <button
              onClick={handleTestNumbers}
              disabled={loading}
              className="bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? '⏳' : '🎯'} Números
            </button>

            <button
              onClick={handleTestRaffle}
              disabled={loading}
              className="bg-purple-600 text-white py-2 px-3 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? '⏳' : '🏆'} Sorteio
            </button>

            <button
              onClick={handleTestWinner}
              disabled={loading}
              className="bg-yellow-600 text-white py-2 px-3 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? '⏳' : '🎉'} Ganhador
            </button>
          </div>

          <button
            onClick={checkMessageStatuses}
            disabled={messageSids.length === 0}
            className="w-full bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            🔍 Verificar Status das Mensagens
          </button>

          {result && (
            <div className={`border rounded-md p-3 ${result.success
              ? 'bg-green-100 border-green-400 text-green-700'
              : 'bg-red-100 border-red-400 text-red-700'
              }`}>
              <div className="flex items-center">
                <span className="text-lg mr-2">
                  {result.success ? '✅' : '❌'}
                </span>
                <div>
                  <strong>{result.message}</strong>
                  <br />
                  <span className="text-sm">Tipo: {result.type}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Importante:</strong> Use seu próprio número WhatsApp para testar.
              Certifique-se de que o número está no formato correto (+55XX999999999).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
