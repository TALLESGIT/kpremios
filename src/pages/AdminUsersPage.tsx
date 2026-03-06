import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { toast } from 'react-hot-toast';
import {
  Users,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  Download,
  RefreshCw,
  MessageCircle,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Trophy
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
  const navigate = useNavigate();
  const { currentUser: currentAppUser } = useData();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'winners' | 'admins'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
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
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          extra_number_requests(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = data?.map(u => u.id) || [];
      let numbersStats: { [key: string]: number } = {};

      if (userIds.length > 0) {
        const { data: numbersData } = await supabase
          .from('numbers')
          .select('selected_by')
          .in('selected_by', userIds);

        numbersStats = (numbersData || []).reduce((acc, num) => {
          const uId = num.selected_by;
          acc[uId] = (acc[uId] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });
      }

      const processedUsers = (data || []).map(u => ({
        ...u,
        total_extra_numbers: numbersStats[u.id] || 0,
        total_requests: u.extra_number_requests?.[0]?.count || 0,
        is_active: true
      }));

      setUsers(processedUsers);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.whatsapp.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active) ||
      (statusFilter === 'winners' && u.is_winner) ||
      (statusFilter === 'admins' && u.is_admin);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleUserAction = async (userId: string, action: 'toggle_status' | 'view_details' | 'delete') => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    if (action === 'view_details') {
      setSelectedUser(targetUser);
      setShowUserModal(true);
    } else if (action === 'toggle_status') {
      toast.success('Em breve: Ativar/Desativar usuários');
    } else if (action === 'delete') {
      if (targetUser.is_admin) {
        toast.error('Administradores não podem ser excluídos!');
        return;
      }
      await handleDeleteUser(userId);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    if (!confirm(`Excluir "${target.name}"? Os números serão liberados.`)) return;

    try {
      await supabase.from('numbers').update({ is_available: true, selected_by: null, assigned_at: null }).eq('selected_by', userId);
      await supabase.from('extra_number_requests').delete().eq('user_id', userId);
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      toast.success('Usuário excluído!');
      await loadUsers();
    } catch (err: any) {
      toast.error('Erro ao excluir');
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/\D/g, '');
    const final = clean.startsWith('55') ? clean : `55${clean}`;
    const msg = `Olá ${name}! Boas notícias da equipe ZK!`;
    window.open(`https://wa.me/${final}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const exportUsers = () => {
    const csv = [
      ['Nome', 'Email', 'WhatsApp', 'Admin', 'Gratuito', 'Extras', 'Data'],
      ...filteredUsers.map(u => [u.name, u.email, u.whatsapp, u.is_admin ? 'S' : 'N', u.free_number || 'N/A', u.total_extra_numbers, new Date(u.created_at).toLocaleDateString()])
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
  };

  if (!currentAppUser?.is_admin) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <Lock className="w-16 h-16 text-slate-700 mb-4" />
        <h1 className="text-white text-2xl font-black uppercase italic tracking-widest">Acesso Restrito</h1>
        <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-sm">Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col selection:bg-blue-500/30">
      <Header />

      <main className="flex-grow w-full py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-500/10">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Usuários</h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Gestão de Comunidade</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={loadUsers} className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-slate-800">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportUsers} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total', count: users.length, icon: Users, color: 'blue' },
            { label: 'Ativos', count: users.filter(u => u.is_active).length, icon: CheckCircle, color: 'emerald' },
            { label: 'Ganhadores', count: users.filter(u => u.is_winner).length, icon: Trophy, color: 'amber' },
            { label: 'Admins', count: users.filter(u => u.is_admin).length, icon: Shield, color: 'purple' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02, y: -5 }}
              className="glass-panel-dark p-6 rounded-[2rem] border border-white/5 space-y-4 relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 p-8 -mr-4 -mt-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                <stat.icon className="w-24 h-24" />
              </div>
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center border border-${stat.color}-500/20 text-${stat.color}-400`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                <p className="text-3xl font-black text-white italic">{stat.count}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="glass-panel-dark p-4 sm:p-6 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full md:w-64 px-6 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-slate-300 font-black text-xs uppercase tracking-widest focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer appearance-none"
          >
            <option value="all">Todos os tipos</option>
            <option value="active">Usuários Ativos</option>
            <option value="inactive">Usuários Inativos</option>
            <option value="winners">Ganhadores</option>
            <option value="admins">Administradores</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="glass-panel-dark rounded-[2.5rem] border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-slate-800/30">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Usuário</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Contato</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden sm:table-cell">Estatísticas</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <Users className="w-12 h-12 mb-4" />
                        <p className="font-black uppercase italic tracking-widest text-sm">Nenhum usuário encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-black text-sm shadow-xl">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-black text-sm uppercase tracking-tight leading-none mb-1">{u.name}</p>
                            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">ID: {u.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                            <Mail className="w-3 h-3 text-blue-400 opacity-50" />
                            {u.email}
                          </div>
                          <button onClick={() => openWhatsApp(u.whatsapp, u.name)} className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:text-emerald-300 transition-colors">
                            <MessageCircle className="w-3 h-3 opacity-50" />
                            {u.whatsapp}
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-5 hidden sm:table-cell">
                        <div className="flex gap-4">
                          <div className="text-center min-w-[40px]">
                            <p className="text-[8px] font-black uppercase text-slate-500 mb-0.5 tracking-widest">Free</p>
                            <p className="text-xs font-black text-white">{u.free_number ? `#${u.free_number}` : '-'}</p>
                          </div>
                          <div className="text-center min-w-[40px]">
                            <p className="text-[8px] font-black uppercase text-slate-500 mb-0.5 tracking-widest">Extra</p>
                            <p className="text-xs font-black text-blue-400">{u.total_extra_numbers}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          {u.is_admin ? (
                            <span className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest">Admin</span>
                          ) : u.is_winner ? (
                            <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest">Ganhador</span>
                          ) : (
                            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest">Ativo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleUserAction(u.id, 'view_details')} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-blue-400 border border-white/5 transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleUserAction(u.id, 'delete')} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 border border-white/5 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-8 py-6 bg-slate-800/30 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Página <span className="text-white">{currentPage}</span> de <span className="text-white">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 disabled:opacity-20 hover:text-white transition-all shadow-xl"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 disabled:opacity-20 hover:text-white transition-all shadow-xl"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUserModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="relative h-32 bg-gradient-to-br from-blue-600 to-blue-900 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <button onClick={() => setShowUserModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-black/20 text-white/70 hover:text-white transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-8 pb-10 -mt-12 relative">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-[2rem] bg-slate-900 p-1 border border-white/10 shadow-2xl">
                    <div className="w-full h-full rounded-[1.75rem] bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-black text-3xl italic">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{selectedUser.name}</h2>
                    <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.2em]">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-panel-dark p-6 rounded-[2rem] border border-white/5 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">WhatsApp</p>
                    <div className="flex items-center justify-between">
                      <p className="text-white font-bold">{selectedUser.whatsapp}</p>
                      <button onClick={() => openWhatsApp(selectedUser.whatsapp, selectedUser.name)} className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="glass-panel-dark p-6 rounded-[2rem] border border-white/5 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cadastro</p>
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      {new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="glass-panel-dark p-6 rounded-[2rem] border border-white/5 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Participação</p>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Fixo</p>
                        <p className="text-white font-black">{selectedUser.free_number ? `#${selectedUser.free_number}` : 'N/A'}</p>
                      </div>
                      <div className="w-[1px] h-6 bg-white/5 self-end" />
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Extra</p>
                        <p className="text-blue-400 font-black">{selectedUser.total_extra_numbers}</p>
                      </div>
                    </div>
                  </div>
                  {selectedUser.is_winner && (
                    <div className="glass-panel-dark p-6 rounded-[2rem] border-2 border-amber-500/20 bg-amber-500/5 col-span-1 sm:col-span-2 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h3 className="text-amber-500 font-black uppercase text-xs tracking-widest">Ganhador do Sorteio</h3>
                      </div>
                      <p className="text-slate-300 text-xs font-bold uppercase tracking-tight">Prêmio: <span className="text-white">{selectedUser.won_prize || 'N/A'}</span></p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase">Em: {selectedUser.won_at ? new Date(selectedUser.won_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default AdminUsersPage;
