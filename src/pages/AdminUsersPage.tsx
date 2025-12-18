import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  MessageCircle,
  Trash2
} from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

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

  const handleUserAction = async (userId: string, action: 'toggle_status' | 'view_details' | 'delete') => {
    if (action === 'view_details') {
      const user = users.find(u => u.id === userId);
      if (user) {
        setSelectedUser(user);
        setShowUserModal(true);
      }
    } else if (action === 'toggle_status') {
      // Implementar toggle de status do usuário
      toast.success('Funcionalidade em desenvolvimento');
    } else if (action === 'delete') {
      const user = users.find(u => u.id === userId);
      if (user?.is_admin) {
        toast.error('Administradores não podem ser excluídos!');
        return;
      }
      await handleDeleteUser(userId);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.name}"?\n\nEsta ação não pode ser desfeita.\n\nOs números escolhidos por este usuário serão liberados e ficarão disponíveis novamente.`)) {
      return;
    }

    try {
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

      toast.success(`Usuário "${user.name}" excluído com sucesso! Os números foram liberados.`);
      
      // Recarregar lista de usuários
      await loadUsers();
      
    } catch (err: any) {
      toast.error(`Erro ao excluir usuário: ${err.message}`);
    }
  };

  const openWhatsApp = (phoneNumber: string, userName: string) => {
    try {
      // Remove caracteres não numéricos e adiciona código do país se necessário
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const whatsappNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
      
      // Mensagem padrão
      const message = `Olá ${userName}! 

Voce sabia que a cada 10$ reais voce pode garantir 100 números extras e também concorrer a 10 mil reais ? 

Para mais informações responda " SIM " 

Atenciosamente: EQUIPE ITALLO ZK`;
      
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
      return <span className="px-3 py-1 text-xs font-bold bg-purple-100 text-purple-700 border-2 border-purple-300 rounded-full">Admin</span>;
    }
    if (user.is_winner) {
      return <span className="px-3 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 border-2 border-yellow-300 rounded-full">Ganhador</span>;
    }
    if (user.is_active) {
      return <span className="px-3 py-1 text-xs font-bold bg-green-100 text-green-700 border-2 border-green-300 rounded-full">Ativo</span>;
    }
    return <span className="px-3 py-1 text-xs font-bold bg-red-100 text-red-700 border-2 border-red-300 rounded-full">Inativo</span>;
  };

  if (!currentAppUser?.is_admin) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-900 mb-4">Acesso Negado</h1>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl mb-4 shadow-lg"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl font-black text-white"
              >
                ZK
              </motion.span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-700 text-xl font-semibold"
            >
              Carregando usuários...
            </motion.p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-grow w-full py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg"
                  >
                    <Users className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                      Gerenciar Usuários
                    </h1>
                    <p className="text-gray-600 text-sm font-semibold">
                      Visualize e gerencie todos os usuários cadastrados no sistema
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadUsers}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-bold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportUsers}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-bold shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </motion.button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-semibold">Total de Usuários</p>
                    <p className="text-2xl font-black text-blue-900">{users.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-semibold">Usuários Ativos</p>
                    <p className="text-2xl font-black text-green-900">{users.filter(u => u.is_active).length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border-2 border-yellow-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 text-sm font-semibold">Ganhadores</p>
                    <p className="text-2xl font-black text-yellow-900">{users.filter(u => u.is_winner).length}</p>
                  </div>
                  <Hash className="w-8 h-8 text-yellow-600" />
                </div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-semibold">Admins</p>
                    <p className="text-2xl font-black text-purple-900">{users.filter(u => u.is_admin).length}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, email ou WhatsApp..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                >
                  <option value="all">Todos os usuários</option>
                  <option value="active">Usuários ativos</option>
                  <option value="inactive">Usuários inativos</option>
                  <option value="winners">Ganhadores</option>
                  <option value="admins">Administradores</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Users Display - Responsive */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden"
          >
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Contato</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Números</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Cadastro</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-bold text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-700">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="w-3 h-3 text-blue-600" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openWhatsApp(user.whatsapp, user.name)}
                              className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline transition-colors duration-200 cursor-pointer font-semibold"
                              title="Clique para entrar em contato via WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                              {user.whatsapp}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-700">
                          <div className="font-semibold">Gratuito: {user.free_number ? `#${user.free_number}` : 'N/A'}</div>
                          <div className="font-semibold">Extras: {user.total_extra_numbers}</div>
                          <div className="font-semibold">Solicitações: {user.total_requests}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(user)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-700">
                          <div className="flex items-center gap-2 font-semibold">
                            <Calendar className="w-3 h-3 text-blue-600" />
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </div>
                          {user.last_login && (
                            <div className="text-xs text-gray-500 mt-1">
                              Último login: {new Date(user.last_login).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleUserAction(user.id, 'view_details')}
                            className="text-blue-600 hover:text-blue-700 transition-colors p-2 bg-blue-50 rounded-lg"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleUserAction(user.id, 'toggle_status')}
                            className="text-yellow-600 hover:text-yellow-700 transition-colors p-2 bg-yellow-50 rounded-lg"
                            title="Editar usuário"
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                          {!user.is_admin && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleUserAction(user.id, 'delete')}
                              className="text-red-600 hover:text-red-700 transition-colors p-2 bg-red-50 rounded-lg"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              <div className="p-4 space-y-4">
                {paginatedUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-md"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 leading-tight">
                              {user.name.split(' ')[0]}
                            </span>
                            {user.is_admin && (
                              <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full font-bold border-2 border-purple-300">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleUserAction(user.id, 'view_details')}
                          className="text-blue-600 hover:text-blue-700 transition-colors p-2 rounded-lg bg-blue-50"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleUserAction(user.id, 'toggle_status')}
                          className="text-yellow-600 hover:text-yellow-700 transition-colors p-2 rounded-lg bg-yellow-50"
                          title="Editar usuário"
                        >
                          <Edit className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleUserAction(user.id, 'delete')}
                          className="text-red-600 hover:text-red-700 transition-colors p-2 rounded-lg bg-red-50"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-1 font-semibold">
                        <Mail className="w-3 h-3 text-blue-600" />
                        <span className="truncate" title={user.email}>
                          {user.email.length > 25 ? `${user.email.substring(0, 25)}...` : user.email}
                        </span>
                      </div>
                      <button
                        onClick={() => openWhatsApp(user.whatsapp, user.name)}
                        className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline transition-colors duration-200 text-sm font-semibold"
                        title={`WhatsApp: ${user.whatsapp}`}
                      >
                        <MessageCircle className="w-3 h-3" />
                        {user.whatsapp.length > 15 ? `${user.whatsapp.substring(0, 15)}...` : user.whatsapp}
                      </button>
                    </div>

                    {/* Numbers Info */}
                    <div className="mb-3 bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                      <div className="text-sm text-gray-700 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>Gratuito:</span>
                          <span>{user.free_number ? `#${user.free_number}` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Extras:</span>
                          <span>{user.total_extra_numbers}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Solicitações:</span>
                          <span>{user.total_requests}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status and Date */}
                    <div className="flex items-center justify-between">
                      <div>
                        {getStatusBadge(user)}
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        <div className="flex items-center gap-1 font-semibold">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        {user.last_login && (
                          <div className="mt-1">
                            Login: {new Date(user.last_login).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-3 bg-gray-50 border-t-2 border-gray-200"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700 text-center sm:text-left font-semibold">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredUsers.length)} de {filteredUsers.length} usuários
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors text-sm font-bold"
                    >
                      Anterior
                    </motion.button>
                    <span className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg">
                      {currentPage} de {totalPages}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors text-sm font-bold"
                    >
                      Próximo
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* User Details Modal */}
        {showUserModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-blue-200 shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">Detalhes do Usuário</h2>
                  </div>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
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
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                      <h3 className="font-bold text-yellow-800">🏆 Ganhador!</h3>
                      <p className="text-sm text-yellow-700 font-semibold">
                        Ganhou em: {selectedUser.won_at ? new Date(selectedUser.won_at).toLocaleString('pt-BR') : 'N/A'}
                      </p>
                      {selectedUser.won_prize && (
                        <p className="text-sm text-yellow-700 font-semibold">Prêmio: {selectedUser.won_prize}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
};

export default AdminUsersPage;
