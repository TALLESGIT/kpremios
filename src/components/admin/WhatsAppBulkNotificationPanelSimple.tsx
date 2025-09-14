import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  Send, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { whatsappServiceEnhanced } from '../../services/whatsappServiceEnhanced';

interface User {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
}

interface BulkResult {
  success: number;
  failed: number;
  errors: string[];
}

const WhatsAppBulkNotificationPanelSimple: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [notificationType, setNotificationType] = useState<'new_raffle' | 'custom'>('new_raffle');
  const [customMessage, setCustomMessage] = useState('');
  const [raffleTitle, setRaffleTitle] = useState('');
  const [prize, setPrize] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [raffleId, setRaffleId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar usuários
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, whatsapp, email')
        .eq('is_admin', false)
        .not('whatsapp', 'is', null);

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Erro ao carregar usuários');
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(user => user.id));
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  const handleSendBulkNotification = async () => {
    if (selectedUsers.length === 0) {
      setError('Selecione pelo menos um usuário');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const selectedUsersData = users.filter(user => selectedUsers.includes(user.id));
      
      let messageData: any = {};
      
      if (notificationType === 'new_raffle') {
        if (!raffleTitle.trim()) {
          setError('Título do sorteio é obrigatório');
          setIsLoading(false);
          return;
        }
        
        messageData = {
          raffleTitle: raffleTitle.trim(),
          prize: prize.trim() || 'Prêmio especial',
          drawDate: drawDate.trim() || 'Em breve',
          raffleId: raffleId.trim() || ''
        };
      } else {
        if (!customMessage.trim()) {
          setError('Mensagem personalizada é obrigatória');
          setIsLoading(false);
          return;
        }
        
        messageData = {
          customMessage: customMessage.trim()
        };
      }

      const result = await whatsappServiceEnhanced.sendBulkNotification(
        selectedUsersData.map(user => ({ whatsapp: user.whatsapp, name: user.name })),
        notificationType,
        messageData
      );

      setResult(result);
      
      if (result.success > 0) {
        // Limpar formulário após sucesso
        setSelectedUsers([]);
        setRaffleTitle('');
        setPrize('');
        setDrawDate('');
        setRaffleId('');
        setCustomMessage('');
      }
    } catch (err) {
      console.error('Error sending bulk notification:', err);
      setError('Erro ao enviar notificações em massa');
    } finally {
      setIsLoading(false);
    }
  };

  const getMessagePreview = () => {
    if (notificationType === 'new_raffle') {
      return `🎊 *Novo sorteio disponível!*

Olá [Nome do usuário]!

🎯 *${raffleTitle || 'Novo Sorteio'}*

🏆 *Prêmio:* ${prize || 'Prêmio especial'}

📅 *Data do sorteio:* ${drawDate || 'Em breve'}

🔗 *Participe agora:* ${import.meta.env.VITE_APP_URL}/raffles/${raffleId || ''}

Boa sorte! 🍀`;
    } else {
      return customMessage;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notificações em Massa</h2>
          <p className="text-gray-600">Envie notificações WhatsApp para múltiplos usuários</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          <span className="text-sm text-gray-600">{users.length} usuários disponíveis</span>
        </div>
      </div>

      {/* Configuração da notificação */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Configuração da Notificação
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Notificação
            </label>
            <select 
              value={notificationType} 
              onChange={(e) => setNotificationType(e.target.value as 'new_raffle' | 'custom')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="new_raffle">Novo Sorteio</option>
              <option value="custom">Mensagem Personalizada</option>
            </select>
          </div>

          {notificationType === 'new_raffle' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Sorteio *
                </label>
                <input
                  type="text"
                  value={raffleTitle}
                  onChange={(e) => setRaffleTitle(e.target.value)}
                  placeholder="Ex: Sorteio de Natal 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prêmio
                </label>
                <input
                  type="text"
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                  placeholder="Ex: iPhone 15 Pro"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data do Sorteio
                </label>
                <input
                  type="text"
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  placeholder="Ex: 25/12/2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID do Sorteio
                </label>
                <input
                  type="text"
                  value={raffleId}
                  onChange={(e) => setRaffleId(e.target.value)}
                  placeholder="Ex: natal-2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem Personalizada *
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Digite sua mensagem personalizada..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Preview da mensagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview da Mensagem</label>
            <div className="p-3 bg-gray-50 rounded-md border">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                {getMessagePreview()}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Seleção de usuários */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seleção de Usuários
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={selectAllUsers}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Selecionar Todos
              </button>
              <button 
                onClick={deselectAllUsers}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Desmarcar Todos
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {users.map((user) => (
              <div key={user.id} className="flex items-center space-x-3 p-2 border rounded-lg">
                <input
                  type="checkbox"
                  id={user.id}
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={user.id} className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.whatsapp}</div>
                </label>
              </div>
            ))}
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-blue-700">
                  {selectedUsers.length} usuário(s) selecionado(s)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {result && (
            <div className={`mb-4 p-4 rounded-lg border ${result.success > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2">
                {result.success > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <p className="font-medium">
                    Resultado: {result.success} enviadas, {result.failed} falharam
                  </p>
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Erros:</p>
                      <ul className="list-disc list-inside text-sm">
                        {result.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li>... e mais {result.errors.length - 5} erros</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedUsers.length > 0 && (
                <p>
                  Enviará para {selectedUsers.length} usuário(s)
                  {selectedUsers.length > 10 && (
                    <span className="text-amber-600 ml-2">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Processamento em lotes
                    </span>
                  )}
                </p>
              )}
            </div>
            
            <button
              onClick={handleSendBulkNotification}
              disabled={isLoading || selectedUsers.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Notificações
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppBulkNotificationPanelSimple;
