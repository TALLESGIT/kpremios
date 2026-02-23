import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  TrendingUp,
  Users,
  Phone,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NotificationLog {
  id: string;
  phone_number: string;
  message_type: string;
  message_body: string;
  status: 'sent' | 'failed' | 'delivered' | 'undelivered';
  message_sid: string | null;
  error_message: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  sent: number;
  failed: number;
  delivered: number;
  undelivered: number;
  successRate: number;
}

const WhatsAppMonitoringPanelSimple: React.FC = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    sent: 0,
    failed: 0,
    delivered: 0,
    undelivered: 0,
    successRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        throw fetchError;
      }

      setLogs(data || []);
      calculateStats(data || []);
    } catch (err) {

      setError('Erro ao carregar logs de notificação');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (logs: NotificationLog[]) => {
    const total = logs.length;
    const sent = logs.filter(log => log.status === 'sent').length;
    const failed = logs.filter(log => log.status === 'failed').length;
    const delivered = logs.filter(log => log.status === 'delivered').length;
    const undelivered = logs.filter(log => log.status === 'undelivered').length;
    const successRate = total > 0 ? ((sent + delivered) / total) * 100 : 0;

    setStats({
      total,
      sent,
      failed,
      delivered,
      undelivered,
      successRate
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Enviado</span>;
      case 'delivered':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Entregue</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Falhou</span>;
      case 'undelivered':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Não entregue</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'registration':
        return 'Cadastro';
      case 'numbers_assigned':
        return 'Números Atribuídos';
      case 'extra_numbers_approved':
        return 'Números Extras Aprovados';
      case 'new_raffle':
        return 'Novo Sorteio';
      case 'test':
        return 'Teste';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatPhoneNumber = (phone: string) => {
    // Formata o número para exibição
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('55')) {
      const areaCode = cleaned.substring(2, 4);
      const number = cleaned.substring(4);
      return `+55 (${areaCode}) ${number.substring(0, 5)}-${number.substring(5)}`;
    }
    return phone;
  };

  useEffect(() => {
    loadLogs();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Carregando logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Enviadas</p>
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Falharam</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-blue-600">{stats.successRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Logs de Notificação WhatsApp</h2>
        <button 
          onClick={loadLogs}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {/* Lista de logs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-0">
          {error && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum log de notificação encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {formatPhoneNumber(log.phone_number)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getTypeLabel(log.message_type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalhes */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Detalhes da Notificação</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Data/Hora</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Telefone</label>
                  <p className="text-sm text-gray-900">{formatPhoneNumber(selectedLog.phone_number)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo</label>
                  <p className="text-sm text-gray-900">{getTypeLabel(selectedLog.message_type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
              </div>

              {selectedLog.message_sid && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Message SID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedLog.message_sid}</p>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Erro</label>
                  <p className="text-sm text-red-600">{selectedLog.error_message}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">Mensagem</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedLog.message_body}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppMonitoringPanelSimple;
