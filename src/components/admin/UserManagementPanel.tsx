import React, { useState, useEffect } from 'react';
import {
  Users,
  Trash2,
  User,
  Mail,
  Phone,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  MessageCircle,
  ShieldCheck
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
  avatar_url?: string;
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
        .select('id, name, email, whatsapp, is_admin, created_at, free_number, extra_numbers, avatar_url')
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
    <div className="glass-panel rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/10">
              <Users className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight">
                Gerenciamento de Usuários
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                Base de dados de membros autenticados
              </p>
            </div>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 text-xs font-black uppercase italic text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="p-6 border-b border-white/5 bg-black/20">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Filtro de tipo */}
          <div className="flex p-1 bg-slate-900/50 rounded-2xl border border-white/5">
            <button
              onClick={() => setFilterAdmin('all')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterAdmin === 'all'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setFilterAdmin('admin')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterAdmin === 'admin'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Admins ({users.filter(u => u.is_admin).length})
            </button>
            <button
              onClick={() => setFilterAdmin('user')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterAdmin === 'user'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
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
      <div className="p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
            <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando usuários...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 bg-black/20 rounded-[2rem] border border-dashed border-white/10">
            <Users className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              {searchTerm || filterAdmin !== 'all'
                ? 'Nenhum usuário encontrado com os filtros aplicados.'
                : 'Nenhum usuário cadastrado.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="group flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-900 border border-white/5 rounded-[2rem] hover:border-amber-500/30 hover:bg-slate-800/40 transition-all duration-300"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border-2 transition-transform group-hover:scale-105 ${user.is_admin
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800 text-slate-400 border-white/10'
                    }`}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-8 w-8" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-white tracking-tight">{user.name}</h4>
                      {user.is_admin && (
                        <span className="px-3 py-0.5 text-[9px] font-black uppercase tracking-widest bg-amber-500 text-black rounded-full shadow-lg shadow-amber-500/20">
                          Fundador / Admin
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{user.email}</span>
                      </div>

                      {user.whatsapp && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Phone className="h-4 w-4 text-green-500/60" />
                          </div>
                          <a
                            href={`https://wa.me/55${user.whatsapp.replace(/\D/g, '')}?text=Olá ${user.name}! 👋 Sou administrador da ZK Oficial e gostaria de entrar em contato com você.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 font-bold hover:underline transition-all flex items-center gap-2"
                            onClick={(e) => {
                              e.preventDefault();
                              openWhatsApp(user.whatsapp, user.name);
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                            {user.whatsapp}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 md:mt-0 flex items-center gap-4 pl-[88px] md:pl-0">
                  <div className="hidden sm:flex flex-col items-end mr-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Membro desde</span>
                    <span className="text-xs font-bold text-slate-400">{formatDate(user.created_at)}</span>
                  </div>

                  {/* Botão de Exclusão */}
                  {!user.is_admin ? (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      disabled={deletingUser === user.id}
                      className="flex items-center gap-2 px-6 py-3 text-xs font-black uppercase italic text-red-400 bg-red-500/10 border border-red-500/10 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                    >
                      {deletingUser === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Excluir
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 border border-white/10 rounded-2xl cursor-default">
                      <ShieldCheck className="h-4 w-4" />
                      Sistema
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementPanel;
