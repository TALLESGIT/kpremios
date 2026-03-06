import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, Music, ExternalLink, Play } from 'lucide-react';
import { SpotifyService, SpotifyRelease } from '../../services/SpotifyService';
import { toast } from 'react-hot-toast';

const AdminSpotifyPage: React.FC = () => {
  const [releases, setReleases] = useState<SpotifyRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReleases();
  }, []);

  const loadReleases = async () => {
    try {
      setLoading(true);
      const data = await SpotifyService.getAll();
      setReleases(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !embedUrl) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setSubmitting(true);
      const newRelease = await SpotifyService.add(title, embedUrl);

      // Se marcado para notificar, chamar a Edge Function
      if (notifyUsers && newRelease) {
        try {
          await supabase.functions.invoke('notify-music-added', {
            body: { record: newRelease, type: 'INSERT' }
          });
          toast.success('Lançamento adicionado e usuários notificados!');
        } catch (notifyErr) {
          console.error('Erro ao notificar usuários:', notifyErr);
          toast.success('Lançamento adicionado (falha ao notificar)');
        }
      } else {
        toast.success('Lançamento adicionado!');
      }

      setTitle('');
      setEmbedUrl('');
      loadReleases();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar lançamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;

    try {
      await SpotifyService.delete(id);
      toast.success('Lançamento removido!');
      loadReleases();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover lançamento');
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
          <Music className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Gerenciar Spotify</h1>
          <p className="text-white/60">Adicione ou remova lançamentos do ZK</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-24">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              Novo Lançamento
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Título da Música/Album</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Ex: Novo Hit do Verão"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Link ou Código de Embed</label>
                <textarea
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors h-32 resize-none"
                  placeholder='Cole o link do Spotify ou o código <iframe src="..." ...></iframe>'
                />
                <p className="text-xs text-white/40 mt-2">
                  Você pode colar o link direto da música ou o código de incorporação (Embed) do Spotify.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="notifyUsers"
                  checked={notifyUsers}
                  onChange={(e) => setNotifyUsers(e.target.checked)}
                  className="w-5 h-5 rounded border-white/10 bg-black/20 text-green-500 focus:ring-green-500 focus:ring-offset-0"
                />
                <label htmlFor="notifyUsers" className="text-sm font-bold text-white cursor-pointer select-none">
                  Notificar Usuários via Push
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adicionando...' : 'Adicionar Lançamento'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTitle(''); setEmbedUrl(''); }}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold rounded-xl transition-all border border-white/10"
                >
                  Limpar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-green-400" />
            Lançamentos Ativos ({releases.length})
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : releases.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-white/40">Nenhum lançamento cadastrado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {releases.map((release) => (
                <div key={release.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center group hover:bg-white/10 transition-colors">
                  <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Play className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{release.title}</h3>
                    <p className="text-xs text-white/40 truncate font-mono">{release.embed_url}</p>
                    <p className="text-xs text-white/30 mt-1">
                      Adicionado em {new Date(release.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <a
                      href={release.embed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Testar Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(release.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSpotifyPage;
