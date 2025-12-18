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
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Shield className="w-5 h-5" />
        Gerenciar Moderadores
      </h3>

      {/* Usuários Participantes */}
      <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Usuários Participantes da Transmissão
        </label>
        {loadingParticipants ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto"></div>
          </div>
        ) : participatingUsers.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {participatingUsers.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{participant.name}</p>
                  <p className="text-slate-400 text-xs">{participant.email}</p>
                </div>
                <button
                  onClick={() => addModerator(participant.id)}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded text-sm transition-all flex items-center gap-1.5 font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Tornar Moderador
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-4">
            Nenhum usuário participando ainda
          </p>
        )}
      </div>

      {/* Adicionar Moderador (Busca por Email) */}
      <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Buscar Usuário por Email
        </label>
        <div className="flex gap-2 mb-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchUser();
                }
              }}
              placeholder="Buscar por email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white rounded-lg text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            onClick={searchUser}
            disabled={searching}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>
        </div>

        {/* Resultados da Busca */}
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((userResult) => (
              <div
                key={userResult.id}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{userResult.name || 'Usuário'}</p>
                  <p className="text-slate-400 text-sm">{userResult.email}</p>
                </div>
                <button
                  onClick={() => addModerator(userResult.id)}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchEmail && !searching && (
          <p className="text-slate-400 text-sm mt-2">Nenhum usuário encontrado</p>
        )}
      </div>

      {/* Lista de Moderadores */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Moderadores ({moderators.length})
        </h4>

        {moderators.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">
            Nenhum moderador adicionado ainda
          </p>
        ) : (
          <div className="space-y-2">
            {moderators.map((moderator) => (
              <div
                key={moderator.id}
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700"
              >
                <div>
                  <p className="text-white font-medium">{moderator.user_name}</p>
                  <p className="text-slate-400 text-sm">{moderator.user_email}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Adicionado em {new Date(moderator.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => removeModerator(moderator.id)}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors flex items-center gap-1.5"
                  title="Remover moderador"
                >
                  <UserMinus className="w-4 h-4" />
                  Remover
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

