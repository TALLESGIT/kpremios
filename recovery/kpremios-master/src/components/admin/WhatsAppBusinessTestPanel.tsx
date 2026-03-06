import React, { useState } from 'react';
import { useWhatsAppBusiness } from '../../hooks/useWhatsAppBusiness';

const WhatsAppBusinessTestPanel: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+5533999030124');
  const [testMessage, setTestMessage] = useState('Teste do WhatsApp Business API - ZK Oficial 🚀');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    sendMessage,
    sendRegistrationConfirmation,
    sendNumbersAssigned,
    sendExtraNumbersApproved,
    sendNewRaffleNotification,
    sendWinnerAnnouncement,
    loading,
    error,
    success
  } = useWhatsAppBusiness();

  const handleTestMessage = async () => {
    try {
      await sendMessage({
        to: phoneNumber,
        message: testMessage,
        type: 'text'
      });
    } catch (error) {
    }
  };

  const handleTestRegistration = async () => {
    try {
      await sendRegistrationConfirmation({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        confirmationCode: 'ABC123'
      });
    } catch (error) {
    }
  };

  const handleTestNumbersAssigned = async () => {
    try {
      await sendNumbersAssigned({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        numbers: [7, 13, 21, 33]
      });
    } catch (error) {
    }
  };

  const handleTestExtraNumbers = async () => {
    try {
      await sendExtraNumbersApproved({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        extraNumbers: [5, 15, 25]
      });
    } catch (error) {
    }
  };

  const handleTestNewRaffle = async () => {
    try {
      await sendNewRaffleNotification({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        raffleName: 'Sorteio Especial de Natal',
        appUrl: 'https://zkoficial.com'
      });
    } catch (error) {
    }
  };

  const handleTestWinner = async () => {
    try {
      await sendWinnerAnnouncement({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        raffleName: 'Sorteio Especial de Natal',
        prize: 'iPhone 15 Pro Max'
      });
    } catch (error) {
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          📱 WhatsApp Business API - Teste
        </h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showAdvanced ? 'Simples' : 'Avançado'}
        </button>
      </div>

      {/* Status */}
      {loading && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
            Enviando mensagem...
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          ✅ {success}
        </div>
      )}

      {/* Configurações */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📱 Número do WhatsApp (com código do país)
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+5511999999999"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💬 Mensagem de teste personalizada
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Digite sua mensagem de teste..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
            />
          </div>
        )}
      </div>

      {/* Botões de teste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleTestMessage}
          disabled={loading}
          className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📤 Testar Mensagem Simples
        </button>

        <button
          onClick={handleTestRegistration}
          disabled={loading}
          className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✅ Testar Confirmação de Cadastro
        </button>

        <button
          onClick={handleTestNumbersAssigned}
          disabled={loading}
          className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎯 Testar Números Selecionados
        </button>

        <button
          onClick={handleTestExtraNumbers}
          disabled={loading}
          className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎲 Testar Números Extras
        </button>

        <button
          onClick={handleTestNewRaffle}
          disabled={loading}
          className="px-4 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎊 Testar Novo Sorteio
        </button>

        <button
          onClick={handleTestWinner}
          disabled={loading}
          className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🏆 Testar Ganhador
        </button>
      </div>

      {/* Informações */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">ℹ️ Como configurar:</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>1. <strong>Meta Business:</strong> Crie uma conta no Meta Business Manager</p>
          <p>2. <strong>WhatsApp Business:</strong> Configure um número de WhatsApp Business</p>
          <p>3. <strong>Tokens:</strong> Obtenha o Phone Number ID e Access Token</p>
          <p>4. <strong>Variáveis:</strong> Adicione no arquivo .env:</p>
          <div className="bg-gray-800 text-green-400 p-2 rounded mt-2 font-mono text-xs">
            VITE_WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id<br />
            VITE_WHATSAPP_ACCESS_TOKEN=seu_access_token
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppBusinessTestPanel;
