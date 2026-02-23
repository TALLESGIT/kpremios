/**
 * Painel de Teste para Vonage WhatsApp
 * Substitui o WhatsAppTestPanel para testar Vonage
 */

import React, { useState } from 'react';
import { useVonage } from '../../hooks/useVonage';

const VonageTestPanel: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+5533999030124');
  const [message, setMessage] = useState('Teste do Vonage WhatsApp! 🚀');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [messageStatus, setMessageStatus] = useState<string>('');
  const [messageUuid, setMessageUuid] = useState<string>('');

  const {
    sendMessage,
    sendRegistrationConfirmation,
    sendNumbersAssigned,
    sendExtraNumbersApproved,
    sendNewRaffleNotification,
    sendWinnerAnnouncement,
    checkMessageStatus,
    isLoading,
    error,
    lastResponse
  } = useVonage();

  const addTestResult = (testName: string, result: any, success: boolean) => {
    setTestResults(prev => [{
      id: Date.now(),
      testName,
      result,
      success,
      timestamp: new Date().toLocaleString()
    }, ...prev.slice(0, 9)]);
  };

  const handleSendMessage = async () => {
    try {
      const result = await sendMessage(phoneNumber, message);
      addTestResult('Mensagem Simples', result, true);
      setMessageUuid(result.message_uuid);
    } catch (err) {
      addTestResult('Mensagem Simples', err, false);
    }
  };

  const handleTestRegistration = async () => {
    try {
      const result = await sendRegistrationConfirmation({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        confirmationCode: 'TEST123'
      });
      addTestResult('Confirmação de Cadastro', result, true);
    } catch (err) {
      addTestResult('Confirmação de Cadastro', err, false);
    }
  };

  const handleTestNumbersAssigned = async () => {
    try {
      const result = await sendNumbersAssigned({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        numbers: [7, 13, 21, 33]
      });
      addTestResult('Números Selecionados', result, true);
    } catch (err) {
      addTestResult('Números Selecionados', err, false);
    }
  };

  const handleTestExtraNumbers = async () => {
    try {
      const result = await sendExtraNumbersApproved({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        extraNumbers: [42, 55]
      });
      addTestResult('Números Extras Aprovados', result, true);
    } catch (err) {
      addTestResult('Números Extras Aprovados', err, false);
    }
  };

  const handleTestNewRaffle = async () => {
    try {
      const result = await sendNewRaffleNotification({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        raffleName: 'Sorteio de Teste Vonage',
        appUrl: 'https://zkpremios.vercel.app'
      });
      addTestResult('Novo Sorteio', result, true);
    } catch (err) {
      addTestResult('Novo Sorteio', err, false);
    }
  };

  const handleTestWinner = async () => {
    try {
      const result = await sendWinnerAnnouncement({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        raffleName: 'Sorteio de Teste Vonage',
        prize: 'iPhone 15 Pro Max'
      });
      addTestResult('Anúncio de Ganhador', result, true);
    } catch (err) {
      addTestResult('Anúncio de Ganhador', err, false);
    }
  };

  const handleCheckStatus = async () => {
    if (!messageUuid) {
      alert('Por favor, envie uma mensagem primeiro para obter o UUID');
      return;
    }

    try {
      const result = await checkMessageStatus(messageUuid);
      setMessageStatus(JSON.stringify(result, null, 2));
      addTestResult('Verificação de Status', result, true);
    } catch (err) {
      addTestResult('Verificação de Status', err, false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🧪 Teste Vonage WhatsApp</h2>
          <p className="text-gray-600">Teste todas as funcionalidades do Vonage</p>
        </div>
        <div className="bg-green-100 border border-green-200 rounded-md p-3">
          <h3 className="font-medium text-green-800 mb-2">🚀 Vonage Configurado:</h3>
          <p className="text-sm text-green-700">
            <strong>Status:</strong> Ativo<br/>
            <strong>Provider:</strong> Vonage (ex-Nexmo)<br/>
            <strong>API:</strong> WhatsApp Business
          </p>
        </div>
      </div>

      {/* Configuração */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            📱 Número do WhatsApp
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+5533999030124"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            💬 Mensagem Personalizada
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Digite sua mensagem de teste..."
          />
        </div>
      </div>

      {/* Botões de Teste */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={handleSendMessage}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📤 Enviar Mensagem
        </button>

        <button
          onClick={handleTestRegistration}
          disabled={isLoading}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✅ Confirmação Cadastro
        </button>

        <button
          onClick={handleTestNumbersAssigned}
          disabled={isLoading}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎯 Números Selecionados
        </button>

        <button
          onClick={handleTestExtraNumbers}
          disabled={isLoading}
          className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ➕ Números Extras
        </button>

        <button
          onClick={handleTestNewRaffle}
          disabled={isLoading}
          className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎊 Novo Sorteio
        </button>

        <button
          onClick={handleTestWinner}
          disabled={isLoading}
          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🏆 Ganhador
        </button>
      </div>

      {/* Verificação de Status */}
      <div className="mb-6">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={messageUuid}
            onChange={(e) => setMessageUuid(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="UUID da mensagem para verificar status"
          />
          <button
            onClick={handleCheckStatus}
            disabled={isLoading}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            🔍 Verificar Status
          </button>
        </div>

        {messageStatus && (
          <div className="bg-gray-100 border border-gray-200 rounded-md p-3">
            <h4 className="font-medium text-gray-800 mb-2">📊 Status da Mensagem:</h4>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{messageStatus}</pre>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="mb-6">
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-800">Enviando mensagem via Vonage...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <h4 className="font-medium text-red-800 mb-1">❌ Erro:</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {lastResponse && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <h4 className="font-medium text-green-800 mb-1">✅ Última Resposta:</h4>
            <pre className="text-sm text-green-700 whitespace-pre-wrap">
              {JSON.stringify(lastResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Resultados dos Testes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Resultados dos Testes</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {testResults.map((result) => (
            <div
              key={result.id}
              className={`p-3 rounded-md border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.success ? '✅' : '❌'} {result.testName}
                  </h4>
                  <p className="text-xs text-gray-600">{result.timestamp}</p>
                </div>
              </div>
              <pre className={`text-xs mt-2 whitespace-pre-wrap ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {JSON.stringify(result.result, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VonageTestPanel;
