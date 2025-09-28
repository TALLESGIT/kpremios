import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Eye, 
  Ban, 
  CheckCircle, 
  XCircle,
  Mail,
  Phone,
  Calendar,
  Hash,
  Download,
  RefreshCw,
  MessageCircle
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  is_admin: boolean;
  free_number: number | null;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  total_extra_numbers: number;
  total_requests: number;
  is_winner: boolean;
  won_at: string | null;
  won_prize: string | null;
}

const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const { currentUser: currentAppUser } = useData();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'winners' | 'admins'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    if (currentAppUser?.is_admin) {
      loadUsers();
    }
  }, [currentAppUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Buscar usuários com estatísticas
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          extra_number_requests(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar estatísticas de números para cada usuário
      const userIds = data?.map(user => user.id) || [];
      let numbersStats: { [key: string]: number } = {};
      
      if (userIds.length > 0) {
        const { data: numbersData } = await supabase
          .from('numbers')
          .select('selected_by')
          .in('selected_by', userIds);
        
        // Contar números por usuário
        numbersStats = (numbersData || []).reduce((acc, num) => {
          const userId = num.selected_by;
          acc[userId] = (acc[userId] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });
      }

      // Processar dados para incluir estatísticas
      const processedUsers = (data || []).map(user => ({
        ...user,
        total_extra_numbers: numbersStats[user.id] || 0,
        total_requests: user.extra_number_requests?.[0]?.count || 0,
        is_active: true // Por enquanto, todos são ativos
      }));

      setUsers(processedUsers);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.whatsapp.includes(searchTerm);

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active) ||
      (statusFilter === 'winners' && user.is_winner) ||
      (statusFilter === 'admins' && user.is_admin);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleUserAction = async (userId: string, action: 'toggle_status' | 'view_details') => {
    if (action === 'view_details') {
      const user = users.find(u => u.id === userId);
      if (user) {
        setSelectedUser(user);
        setShowUserModal(true);
      }
    } else if (action === 'toggle_status') {
      // Implementar toggle de status do usuário
      toast.success('Funcionalidade em desenvolvimento');
    }
  };

  const openWhatsApp = (phoneNumber: string, userName: string) => {
    try {
      // Remove caracteres não numéricos e adiciona código do país se necessário
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const whatsappNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
      
      // Mensagem padrão
      const message = `Olá ${userName}! 👋\n\nSou administrador do ZK Premios e gostaria de entrar em contato com você.`;
      
      // URL do WhatsApp Web/App
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      
      // Abrir em nova aba
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      toast.error('Erro ao abrir WhatsApp. Tente novamente.');
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Nome', 'Email', 'WhatsApp', 'Admin', 'Número Gratuito', 'Números Extras', 'Solicitações', 'Ganhador', 'Data Cadastro'],
      ...filteredUsers.map(user => [
        user.name,
        user.email,
        user.whatsapp,
        user.is_admin ? 'Sim' : 'Não',
        user.free_number || 'N/A',
        user.total_extra_numbers,
        user.total_requests,
        user.is_winner ? 'Sim' : 'Não',
        new Date(user.created_at).toLocaleDateString('pt-BR')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (user: User) => {
    if (user.is_admin) {
      return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">Admin</span>;
    }
    if (user.is_winner) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Ganhador</span>;
    }
    if (user.is_active) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Ativo</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inativo</span>;
  };

  if (!currentAppUser?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Acesso Negado</h1>
          <p className="text-slate-300">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <div className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                👥 Gerenciar Usuários
              </h1>
              <p className="text-slate-300 text-sm sm:text-base">
                Visualize e gerencie todos os usuários cadastrados no sistema
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadUsers}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
              <button
                onClick={exportUsers}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Total de Usuários</p>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-white">{users.filter(u => u.is_active).length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Ganhadores</p>
                  <p className="text-2xl font-bold text-white">{users.filter(u => u.is_winner).length}</p>
                </div>
                <Hash className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Admins</p>
                  <p className="text-2xl font-bold text-white">{users.filter(u => u.is_admin).length}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Todos os usuários</option>
                <option value="active">Usuários ativos</option>
                <option value="inactive">Usuários inativos</option>
                <option value="winners">Ganhadores</option>
                <option value="admins">Administradores</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Números</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Cadastro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">{user.name}</div>
                          <div className="text-xs text-slate-400">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-300">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openWhatsApp(user.whatsapp, user.name)}
                            className="flex items-center gap-2 text-green-400 hover:text-green-300 hover:underline transition-colors duration-200 cursor-pointer"
                            title="Clique para entrar em contato via WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            {user.whatsapp}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-300">
                        <div>Gratuito: {user.free_number ? `#${user.free_number}` : 'N/A'}</div>
                        <div>Extras: {user.total_extra_numbers}</div>
                        <div>Solicitações: {user.total_requests}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(user)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        {user.last_login && (
                          <div className="text-xs text-slate-400 mt-1">
                            Último login: {new Date(user.last_login).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUserAction(user.id, 'view_details')}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUserAction(user.id, 'toggle_status')}
                          className="text-amber-400 hover:text-amber-300 transition-colors p-1"
                          title="Editar usuário"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">
                  Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredUsers.length)} de {filteredUsers.length} usuários
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 bg-amber-500 text-white rounded">
                    {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Details Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Detalhes do Usuário</h2>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nome</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-sm text-gray-900">{selectedUser.whatsapp}</p>
                        <button
                          onClick={() => openWhatsApp(selectedUser.whatsapp, selectedUser.name)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors duration-200"
                          title="Entrar em contato via WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                          WhatsApp
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedUser)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Número Gratuito</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.free_number ? `#${selectedUser.free_number}` : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Números Extras</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.total_extra_numbers}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data de Cadastro</label>
                      <p className="mt-1 text-sm text-gray-900">{new Date(selectedUser.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Último Login</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString('pt-BR') : 'Nunca'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedUser.is_winner && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-medium text-yellow-800">🏆 Ganhador!</h3>
                      <p className="text-sm text-yellow-700">
                        Ganhou em: {selectedUser.won_at ? new Date(selectedUser.won_at).toLocaleString('pt-BR') : 'N/A'}
                      </p>
                      {selectedUser.won_prize && (
                        <p className="text-sm text-yellow-700">Prêmio: {selectedUser.won_prize}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default AdminUsersPage;
