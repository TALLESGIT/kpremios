import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useWhatsApp } from '../../hooks/useWhatsApp';

interface WhatsAppNotificationPanelProps {
  onClose: () => void;
}

export const WhatsAppNotificationPanel: React.FC<WhatsAppNotificationPanelProps> = ({ onClose }) => {
  const { notifyAllUsersAboutNewRaffle } = useData();
  const { loading, error } = useWhatsApp();
  const [raffleData, setRaffleData] = useState({
    title: '',
    prize: '',
    startDate: '',
    endDate: ''
  });
  const [notificationResult, setNotificationResult] = useState<any>(null);

  const handleSendNotification = async () => {
    if (!raffleData.title || !raffleData.prize || !raffleData.startDate || !raffleData.endDate) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      const result = await notifyAllUsersAboutNewRaffle(raffleData);
      setNotificationResult(result);
      
      if (result.success) {
        alert(`Notificação enviada com sucesso! ${result.notified}/${result.total} usuários notificados.`);
      } else {
        alert(`Erro ao enviar notificação: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao enviar notificação');
    }
  };

  const handleTestMessage = async () => {
    // Teste com dados fictícios
    const testData = {
      title: 'Teste de Notificação',
      prize: 'iPhone 15 Pro Max',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    try {
      const result = await notifyAllUsersAboutNewRaffle(testData);
      setNotificationResult(result);
      alert(`Teste enviado! ${result.notified}/${result.total} usuários notificados.`);
    } catch (error) {
      alert('Erro ao enviar teste');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Notificações WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título do Sorteio
            </label>
            <input
              type="text"
              value={raffleData.title}
              onChange={(e) => setRaffleData({ ...raffleData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Sorteio iPhone 15 Pro Max"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prêmio
            </label>
            <input
              type="text"
              value={raffleData.prize}
              onChange={(e) => setRaffleData({ ...raffleData, prize: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: iPhone 15 Pro Max 256GB"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Início
            </label>
            <input
              type="date"
              value={raffleData.startDate}
              onChange={(e) => setRaffleData({ ...raffleData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Término
            </label>
            <input
              type="date"
              value={raffleData.endDate}
              onChange={(e) => setRaffleData({ ...raffleData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleSendNotification}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar Notificação'}
            </button>
            
            <button
              onClick={handleTestMessage}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testando...' : 'Teste'}
            </button>
          </div>

          {notificationResult && (
            <div className="bg-gray-100 border border-gray-300 rounded-md p-3">
              <h3 className="font-medium mb-2">Resultado da Notificação:</h3>
              <p><strong>Sucesso:</strong> {notificationResult.success ? 'Sim' : 'Não'}</p>
              {notificationResult.notified && (
                <p><strong>Notificados:</strong> {notificationResult.notified}/{notificationResult.total}</p>
              )}
              {notificationResult.error && (
                <p><strong>Erro:</strong> {notificationResult.error}</p>
              )}
            </div>
          )}

          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p className="text-sm">
              <strong>Importante:</strong> Certifique-se de que as credenciais do Twilio estão configuradas no arquivo .env
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
