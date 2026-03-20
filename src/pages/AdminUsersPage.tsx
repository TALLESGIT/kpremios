import React, { useState, useEffect, useCallback } from 'react';
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
  club_slug: string | null;
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

interface Club {
  slug: string;
  name: string;
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
  const [totalItems, setTotalItems] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [updating, setUpdating] = useState(false);
  const [editAdmin, setEditAdmin] = useState(false);
  const [editClub, setEditClub] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, winners: 0, admins: 0 });

  const loadClubs = async () => {
    try {
      const { data } = await supabase.from('clubs_config').select('slug, name');
      if (data) setClubs(data);
    } catch (e) {
      console.error('Erro ao carregar clubes');
    }
  };

  const loadStats = async () => {
    try {
      const [totalRes, adminsRes, winnersRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_admin', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_winner', true)
      ]);

      setStats({
        total: totalRes.count || 0,
        active: totalRes.count || 0,
        admins: adminsRes.count || 0,
        winners: winnersRes.count || 0
      });
    } catch (e) {
      console.error('Erro ao carregar estatísticas');
    }
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('users')
        .select(`
          *,
          extra_number_requests(count)
        `, { count: 'exact' });

      // Search
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%`);
      }

      // Filters
      if (statusFilter === 'winners') query = query.eq('is_winner', true);
      if (statusFilter === 'admins') query = query.eq('is_admin', true);

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

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
      setTotalItems(count || 0);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (currentAppUser?.is_admin) {
      loadUsers();
      loadClubs();
      loadStats();
    }
  }, [currentAppUser, loadUsers]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleUserAction = async (userId: string, action: 'toggle_status' | 'view_details' | 'delete') => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    if (action === 'view_details') {
      setSelectedUser(targetUser);
      setEditAdmin(targetUser.is_admin);
      setEditClub(targetUser.club_slug || '');
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
      await loadStats();
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

  const handleUpdateUserLevel = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('users')
        .update({
          is_admin: editAdmin,
          club_slug: editClub || null
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('Nível de acesso atualizado!');
      await loadUsers();
      await loadStats();
      setShowUserModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar nível de acesso');
    } finally {
      setUpdating(false);
    }
  };

  const exportAllUsers = async () => {
    toast.loading('Preparando exportação completa...');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, email, whatsapp, is_admin, free_number, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const csv = [
        ['Nome', 'Email', 'WhatsApp', 'Admin', 'Gratuito', 'Data'],
        ...data.map(u => [u.name, u.email, u.whatsapp, u.is_admin ? 'S' : 'N', u.free_number || 'N/A', new Date(u.created_at).toLocaleDateString()])
      ].map(r => r.join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.dismiss();
      toast.success('Exportação concluída!');
    } catch (e) {
      toast.dismiss();
      toast.error('Erro na exportação');
    }
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

      <main className="flex-grow w-full pt-32 md:pt-40 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
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
            <button onClick={() => { loadUsers(); loadStats(); }} className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-slate-800">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportAllUsers} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total', count: stats.total, icon: Users, color: 'blue' },
            { label: 'Ativos', count: stats.active, icon: CheckCircle, color: 'emerald' },
            { label: 'Ganhadores', count: stats.winners, icon: Trophy, color: 'amber' },
            { label: 'Admins', count: stats.admins, icon: Shield, color: 'purple' }
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
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-6 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
            className="w-full md:w-64 px-6 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-slate-300 font-black text-xs uppercase tracking-widest focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer appearance-none"
          >
            <option value="all">Todos os tipos</option>
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
                {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center opacity-30">
                          <RefreshCw className="w-12 h-12 mb-4 animate-spin" />
                          <p className="font-black uppercase italic tracking-widest text-sm">Carregando usuários...</p>
                        </div>
                      </td>
                    </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <Users className="w-12 h-12 mb-4" />
                        <p className="font-black uppercase italic tracking-widest text-sm">Nenhum usuário encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u, i) => (
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
                            <div className="flex flex-col gap-1">
                              <span className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest">Admin</span>
                              {u.club_slug && (
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter text-center">Clube: {u.club_slug}</span>
                              )}
                            </div>
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-8 py-6 bg-slate-800/30 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Página <span className="text-white">{currentPage}</span> de <span className="text-white">{totalPages}</span>
                <span className="ml-2 text-slate-600">({totalItems} usuários)</span>
              </p>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 disabled:opacity-20 hover:text-white transition-all shadow-xl"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  disabled={currentPage === totalPages || loading}
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
              <div className="px-8 pb-10 -mt-12 relative max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex flex-col items-center text-center space-y-4 mb-8">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Management Section */}
                <div className="mt-8 border-t border-white/5 pt-8 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <h3 className="text-white font-black uppercase text-xs tracking-widest">Controle de Acesso</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status Administrativo</p>
                      <button
                        onClick={() => setEditAdmin(!editAdmin)}
                        className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${editAdmin
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                          : 'bg-slate-950/40 border-white/5 text-slate-500'
                          }`}
                      >
                        <span className="font-bold text-sm">{editAdmin ? 'Administrador' : 'Usuário Comum'}</span>
                        <div className={`w-10 h-6 rounded-full relative transition-colors ${editAdmin ? 'bg-purple-500' : 'bg-slate-800'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editAdmin ? 'left-5' : 'left-1'}`} />
                        </div>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Clube Vinculado</p>
                      <div className="relative">
                        <select
                          disabled={!editAdmin}
                          value={editClub}
                          onChange={(e) => setEditClub(e.target.value)}
                          className="w-full p-4 bg-slate-950/40 border border-white/5 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-purple-500/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed appearance-none"
                        >
                          <option value="">Nenhum Clube</option>
                          {clubs.map(club => (
                            <option key={club.slug} value={club.slug}>{club.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                          <ChevronRight className="w-5 h-5 rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateUserLevel}
                    disabled={updating}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updating ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                  </button>
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
