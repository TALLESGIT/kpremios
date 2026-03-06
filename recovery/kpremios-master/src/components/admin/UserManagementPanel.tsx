import React, { useState, useEffect } from 'react';
import {
  Users,
  Trash2,
  User,
  Mail,
  Phone,
  Calendar,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  is_admin: boolean;
  created_at: string;
  free_number?: number;
  extra_numbers?: number[];
}

const UserManagementPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admin' | 'user'>('all');
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carregar usuários
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, whatsapp, is_admin, created_at, free_number, extra_numbers')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (err: any) {
      setError('Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"?\n\nEsta ação não pode ser desfeita.\n\nOs números escolhidos por este usuário serão liberados e ficarão disponíveis novamente.`)) {
      return;
    }

    try {
      setDeletingUser(userId);
      setError(null);
      setSuccess(null);

      // 1. Primeiro, liberar todos os números do usuário
      const { error: numbersError } = await supabase
        .from('numbers')
        .update({
          is_available: true,
          selected_by: null,
          assigned_at: null
        })
        .eq('selected_by', userId);

      if (numbersError) {
        console.error('Erro ao liberar números:', numbersError);
        // Não falha a operação, apenas registra o erro
      }

      // 2. Excluir solicitações de números extras do usuário
      const { error: requestsError } = await supabase
        .from('extra_number_requests')
        .delete()
        .eq('user_id', userId);

      if (requestsError) {
        console.error('Erro ao excluir solicitações:', requestsError);
        // Não falha a operação, apenas registra o erro
      }

      // 3. Excluir o usuário
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setSuccess(`Usuário "${userName}" excluído com sucesso! Os números foram liberados.`);

      // Recarregar lista de usuários
      await loadUsers();

    } catch (err: any) {
      setError(`Erro ao excluir usuário: ${err.message}`);
    } finally {
      setDeletingUser(null);
    }
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.whatsapp.includes(searchTerm);

    const matchesFilter =
      filterAdmin === 'all' ||
      (filterAdmin === 'admin' && user.is_admin) ||
      (filterAdmin === 'user' && !user.is_admin);

    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openWhatsApp = (phoneNumber: string, userName: string) => {
    try {
      // Remove caracteres não numéricos e adiciona código do país se necessário
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const whatsappNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

      // Mensagem padrão
      const message = `Olá ${userName}! 👋\n\nSou administrador da ZK Oficial e gostaria de entrar em contato com você.`;

      // URL do WhatsApp Web/App
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      // Debug: mostrar no console
      console.log('Opening WhatsApp:', whatsappUrl);

      // Abrir em nova aba
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      alert('Erro ao abrir WhatsApp. Tente novamente.');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Gerenciamento de Usuários
              </h3>
              <p className="text-sm text-gray-500">
                Gerencie usuários autenticados do sistema
              </p>
            </div>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro de tipo */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterAdmin('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${filterAdmin === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setFilterAdmin('admin')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${filterAdmin === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              Admins ({users.filter(u => u.is_admin).length})
            </button>
            <button
              onClick={() => setFilterAdmin('user')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${filterAdmin === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              Usuários ({users.filter(u => !u.is_admin).length})
            </button>
          </div>
        </div>
      </div>

      {/* Mensagens de Status */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Lista de Usuários */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Carregando usuários...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || filterAdmin !== 'all'
                ? 'Nenhum usuário encontrado com os filtros aplicados.'
                : 'Nenhum usuário cadastrado.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${user.is_admin
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-blue-100 text-blue-600'
                    }`}>
                    <User className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{user.name}</h4>
                      {user.is_admin && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>

                      {user.whatsapp && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a
                            href={`https://wa.me/55${user.whatsapp.replace(/\D/g, '')}?text=Olá ${user.name}! 👋 Sou administrador da ZK Oficial e gostaria de entrar em contato com você.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline transition-colors duration-200 font-medium cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              openWhatsApp(user.whatsapp, user.name);
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>{user.whatsapp}</span>
                          </a>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(user.created_at)}</span>
                      </div>
                    </div>

                    {(user.free_number || (user.extra_numbers && user.extra_numbers.length > 0)) && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Números:</span>
                        {user.free_number && (
                          <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Grátis: {user.free_number}
                          </span>
                        )}
                        {user.extra_numbers && user.extra_numbers.length > 0 && (
                          <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            Extras: {user.extra_numbers.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Exclusão */}
                {!user.is_admin && (
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    disabled={deletingUser === user.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors duration-200 disabled:opacity-50"
                  >
                    {deletingUser === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Excluir
                  </button>
                )}

                {user.is_admin && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    Protegido
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementPanel;
