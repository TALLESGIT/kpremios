import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Users, UserPlus, UserMinus, Shield, Search } from 'lucide-react';

interface Moderator {
  id: string;
  user_id: string;
  stream_id: string;
  created_by: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface ModeratorManagerProps {
  streamId: string;
}

const ModeratorManager: React.FC<ModeratorManagerProps> = ({ streamId }) => {
  const { user } = useAuth();
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [participatingUsers, setParticipatingUsers] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    loadModerators();
    loadParticipatingUsers();

    // Configurar Realtime para moderadores
    const moderatorsSubscription = supabase
      .channel('stream_moderators_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_moderators',
          filter: `stream_id=eq.${streamId}`
        },
        () => {
          loadModerators();
        }
      )
      .subscribe();

    // Configurar Realtime para participantes (viewer_sessions)
    const sessionsSubscription = supabase
      .channel('viewer_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viewer_sessions',
          filter: `stream_id=eq.${streamId}`
        },
        () => {
          loadParticipatingUsers();
        }
      )
      .subscribe();

    // Configurar Realtime para chat (novos usuários aparecendo no chat)
    const chatSubscription = supabase
      .channel('live_chat_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`
        },
        () => {
          loadParticipatingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(moderatorsSubscription);
      supabase.removeChannel(sessionsSubscription);
      supabase.removeChannel(chatSubscription);
    };
  }, [streamId]);

  const loadModerators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stream_moderators')
        .select(`
          *,
          user:users!stream_moderators_user_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedModerators = (data || []).map((mod: any) => ({
        ...mod,
        user_name: mod.user?.name || 'Usuário',
        user_email: mod.user?.email || '',
      }));

      setModerators(formattedModerators);
    } catch (error: any) {
      console.error('Erro ao carregar moderadores:', error);
      toast.error('Erro ao carregar moderadores');
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!searchEmail.trim()) {
      toast.error('Digite um email para buscar');
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .ilike('email', `%${searchEmail.trim()}%`)
        .limit(10);

      if (error) throw error;

      // Filtrar usuários que já são moderadores
      const moderatorIds = moderators.map(m => m.user_id);
      const filtered = (data || []).filter((u: any) => !moderatorIds.includes(u.id));

      setSearchResults(filtered);
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      toast.error('Erro ao buscar usuário');
    } finally {
      setSearching(false);
    }
  };

  const addModerator = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('stream_moderators')
        .insert({
          user_id: userId,
          stream_id: streamId,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('Moderador adicionado com sucesso!');
      setSearchEmail('');
      setSearchResults([]);
      loadModerators();
      loadParticipatingUsers(); // Recarregar lista de participantes
    } catch (error: any) {
      console.error('Erro ao adicionar moderador:', error);
      if (error.code === '23505') {
        toast.error('Este usuário já é moderador');
      } else {
        toast.error('Erro ao adicionar moderador');
      }
    }
  };

  const loadParticipatingUsers = async () => {
    try {
      setLoadingParticipants(true);

      // Buscar usuários que estão visualizando (viewer_sessions ativas)
      const { data: viewersData, error: viewersError } = await supabase
        .from('viewer_sessions')
        .select(`
          user_id,
          users:user_id (
            id,
            name,
            email
          )
        `)
        .eq('stream_id', streamId)
        .eq('is_active', true)
        .not('user_id', 'is', null);

      // Buscar usuários que enviaram mensagens no chat
      const { data: chatUsersData, error: chatError } = await supabase
        .from('live_chat_messages')
        .select(`
          user_id,
          users:user_id (
            id,
            name,
            email
          )
        `)
        .eq('stream_id', streamId)
        .not('user_id', 'is', null);

      if (viewersError) console.error('Erro ao buscar viewers:', viewersError);
      if (chatError) console.error('Erro ao buscar usuários do chat:', chatError);

      // Combinar e remover duplicatas
      const allUsers = new Map<string, any>();

      // Adicionar usuários das sessões de visualização
      if (viewersData) {
        viewersData.forEach((item: any) => {
          if (item.user_id && item.users) {
            allUsers.set(item.user_id, {
              id: item.users.id,
              name: item.users.name || 'Usuário',
              email: item.users.email || '',
              source: 'viewer'
            });
          }
        });
      }

      // Adicionar usuários do chat
      if (chatUsersData) {
        chatUsersData.forEach((item: any) => {
          if (item.user_id && item.users) {
            if (!allUsers.has(item.user_id)) {
              allUsers.set(item.user_id, {
                id: item.users.id,
                name: item.users.name || 'Usuário',
                email: item.users.email || '',
                source: 'chat'
              });
            }
          }
        });
      }

      // Converter Map para Array e filtrar usuários que já são moderadores
      const moderatorIds = moderators.map(m => m.user_id);
      const participants = Array.from(allUsers.values())
        .filter((u: any) => !moderatorIds.includes(u.id))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      setParticipatingUsers(participants);
    } catch (error: any) {
      console.error('Erro ao carregar usuários participantes:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const removeModerator = async (moderatorId: string) => {
    if (!confirm('Tem certeza que deseja remover este moderador?')) return;

    try {
      const { error } = await supabase
        .from('stream_moderators')
        .delete()
        .eq('id', moderatorId);

      if (error) throw error;

      toast.success('Moderador removido com sucesso!');
      loadModerators();
      loadParticipatingUsers(); // Recarregar lista de participantes
    } catch (error: any) {
      console.error('Erro ao remover moderador:', error);
      toast.error('Erro ao remover moderador');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <Shield className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white uppercase italic">Moderadores</h3>
          <p className="text-slate-400 text-sm font-medium">Controle de acesso e moderação</p>
        </div>
      </div>

      {/* Usuários Participantes */}
      <div className="mb-10 p-6 rounded-[2rem] bg-slate-900/50 border border-white/5 space-y-6">
        <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em] ml-1">
          Usuários na Transmissão
        </label>
        {loadingParticipants ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : participatingUsers.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {participatingUsers.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group"
              >
                <div className="flex-1">
                  <p className="text-white font-black text-sm uppercase italic">{participant.name}</p>
                  <p className="text-slate-400 text-[10px] font-bold tracking-tight">{participant.email}</p>
                </div>
                <button
                  onClick={() => addModerator(participant.id)}
                  className="px-5 py-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-blue-500/20 group-hover:shadow-lg group-hover:shadow-blue-600/20"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-2 inline-block -mt-1" />
                  Promover
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 rounded-2xl border border-dashed border-white/10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">
              Nenhum participante ativo
            </p>
          </div>
        )}
      </div>

      {/* Adicionar Moderador (Busca por Email) */}
      <div className="mb-10 p-6 rounded-[2rem] bg-slate-900/50 border border-white/5 space-y-6">
        <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em] ml-1">
          Buscar Moderador
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUser()}
              placeholder="Digite o email do usuário..."
              className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/5 text-white rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <button
            onClick={searchUser}
            disabled={searching}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all flex items-center justify-center gap-3 font-black text-xs uppercase italic border border-white/10 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>
        </div>

        {/* Resultados da Busca */}
        {searchResults.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
            {searchResults.map((userResult) => (
              <div
                key={userResult.id}
                className="flex items-center justify-between p-4 bg-slate-800/60 rounded-2xl border border-emerald-500/20"
              >
                <div>
                  <p className="text-white font-black text-sm uppercase italic">{userResult.name || 'Usuário'}</p>
                  <p className="text-slate-400 text-[10px] font-bold tracking-tight">{userResult.email}</p>
                </div>
                <button
                  onClick={() => addModerator(userResult.id)}
                  className="px-6 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-emerald-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-2 inline-block -mt-1" />
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Moderadores */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em]">
            Time de Moderação
          </h4>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black border border-blue-500/20">
            {moderators.length}
          </span>
        </div>

        {moderators.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 bg-slate-900/30">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic font-medium">
              Lista de moderadores vazia
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {moderators.map((moderator) => (
              <div
                key={moderator.id}
                className="flex items-center justify-between p-5 bg-slate-900/80 rounded-[1.5rem] border border-white/5 group hover:border-blue-500/30 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-black text-sm uppercase italic">{moderator.user_name}</p>
                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                  </div>
                  <p className="text-slate-400 text-[10px] font-bold tracking-tight mb-2">{moderator.user_email}</p>
                  <p className="text-slate-600 text-[9px] font-black uppercase tracking-widest">
                    Desde {new Date(moderator.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => removeModerator(moderator.id)}
                  className="p-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all"
                  title="Remover moderador"
                >
                  <UserMinus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeratorManager;

