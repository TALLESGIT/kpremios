import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, Edit2, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getYouTubeId, getYouTubeThumbnail } from '../../utils/youtube';

interface YouTubeClip {
  id: string;
  title: string;
  youtube_url: string;
  thumbnail_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
  description?: string;
}



const AdminClipsPage: React.FC = () => {
  const [clips, setClips] = useState<YouTubeClip[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddingClip, setIsAddingClip] = useState(false);
  const [editingClip, setEditingClip] = useState<YouTubeClip | null>(null);
  const [clipForm, setClipForm] = useState<Partial<YouTubeClip>>({
    title: '',
    youtube_url: '',
    category: 'Clipes',
    is_active: true,
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClips();
  }, []);

  const loadClips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('youtube_clips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao buscar clipes');
    } else {
      setClips(data || []);
    }
    setLoading(false);
  };

  const handleSaveClip = async () => {
    if (!clipForm.title || !clipForm.youtube_url) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const videoId = getYouTubeId(clipForm.youtube_url);

    if (!videoId) {
      toast.error('URL do YouTube inválida');
      return;
    }

    const thumbnail_url = getYouTubeThumbnail(videoId);

    const payload = {
      ...clipForm,
      thumbnail_url,
      youtube_url: videoId,
      updated_at: new Date().toISOString()
    };

    try {
      setSaving(true);
      if (editingClip) {
        const { error } = await supabase
          .from('youtube_clips')
          .update(payload)
          .eq('id', editingClip.id);

        if (error) throw error;
        toast.success('Clipe atualizado');
      } else {
        const { data: insertedClip, error } = await supabase
          .from('youtube_clips')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        // Enviar push notification para os usuários
        try {
          await supabase.functions.invoke('notify-music-added', {
            body: { record: { id: insertedClip.id, title: clipForm.title }, type: 'INSERT', content_type: 'clip' }
          });
          toast.success('Clipe adicionado e usuários notificados!');
        } catch (notifyErr) {
          console.error('Erro ao notificar usuários:', notifyErr);
          toast.success('Clipe adicionado (falha ao notificar)');
        }
      }
      setIsAddingClip(false);
      setEditingClip(null);
      setClipForm({ title: '', youtube_url: '', category: 'Clipes', is_active: true, description: '' });
      loadClips();
    } catch (error: any) {
      toast.error('Erro ao salvar clipe: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClip = async (id: string) => {
    if (!window.confirm('Excluir este clipe?')) return;

    const { error } = await supabase
      .from('youtube_clips')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Clipe excluído');
      loadClips();
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Video className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Gerenciar Clipes e Bastidores</h1>
          <p className="text-white/60">Adicione novos vídeos para o ZK TV</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Video className="text-blue-500" />
            Galeria de Vídeos
          </h2>
          <button
            onClick={() => {
              setClipForm({ title: '', youtube_url: '', category: 'Clipes', is_active: true, description: '' });
              setEditingClip(null);
              setIsAddingClip(true);
            }}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" /> Adicionar Vídeo
          </button>
        </div>

        {isAddingClip && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 mb-8 transform transition-all">
            <h3 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-4">
              {editingClip ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
              {editingClip ? 'Editar Vídeo' : 'Novo Vídeo'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Título do Vídeo</label>
                <input
                  type="text"
                  value={clipForm.title}
                  onChange={(e) => setClipForm({ ...clipForm, title: e.target.value })}
                  placeholder="Ex: Bastidores da Vitória"
                  className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">URL ou ID do YouTube</label>
                <input
                  type="text"
                  value={clipForm.youtube_url}
                  onChange={(e) => setClipForm({ ...clipForm, youtube_url: e.target.value })}
                  placeholder="youtube.com/watch?v=..."
                  className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Categoria</label>
                <select
                  value={clipForm.category}
                  onChange={(e) => setClipForm({ ...clipForm, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Clipes">Clipes</option>
                  <option value="Bastidores">Bastidores</option>
                  <option value="Entrevistas">Entrevistas</option>
                  <option value="Melhores Momentos">Melhores Momentos</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-2">Descrição (Opcional)</label>
                <textarea
                  value={clipForm.description || ''}
                  onChange={(e) => setClipForm({ ...clipForm, description: e.target.value })}
                  placeholder="Uma breve descrição sobre o vídeo..."
                  className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="clip-active"
                  checked={clipForm.is_active}
                  onChange={(e) => setClipForm({ ...clipForm, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-600"
                />
                <label htmlFor="clip-active" className="text-sm font-bold cursor-pointer">Visível no app?</label>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsAddingClip(false)} className="px-6 py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700">Cancelar</button>
              <button onClick={handleSaveClip} disabled={saving} className="px-8 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-400">Carregando clipes...</div>
        ) : clips.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Nenhum clipe cadastrado.</div>
        ) : (
          <div className="space-y-8">
            {Array.from(new Set(clips.map(c => c.category))).map(category => (
              <div key={category} className="space-y-4 group/row">
                <h3 className="text-lg font-black text-white px-2 border-l-4 border-blue-500">{category}</h3>

                {/* Horizontal Scroll / Playlists form */}
                <div className="relative">
                  {/* Left Scroll Button */}
                  <button
                    onClick={() => {
                      const container = document.getElementById(`scroll-cat-admin-${category}`);
                      if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto hover:bg-blue-600 hover:border-blue-500 hover:scale-110 shadow-2xl transition-all hidden md:flex"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div
                    id={`scroll-cat-admin-${category}`}
                    className="flex flex-nowrap w-full overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide px-4 md:px-0 touch-pan-x"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {clips.filter(c => c.category === category).map((clip) => (
                      <div key={clip.id} className="flex-none w-[85vw] sm:w-[320px] snap-center bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden group">
                        <div className="relative aspect-video">
                          <img
                            draggable={false}
                            src={getYouTubeThumbnail(clip.youtube_url)}
                            alt={clip.title}
                            className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                          />
                          <div className="absolute top-3 right-3 flex gap-2">
                            <button
                              onClick={() => {
                                setEditingClip(clip);
                                setClipForm(clip);
                                setIsAddingClip(true);
                              }}
                              className="p-2 bg-blue-600 rounded-lg text-white shadow-lg focus:outline-none"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClip(clip.id)}
                              className="p-2 bg-red-600 rounded-lg text-white shadow-lg focus:outline-none"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-white mb-1 truncate">{clip.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">{clip.description || 'Sem descrição.'}</p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase ${clip.is_active ? 'text-emerald-500' : 'text-slate-600'}`}>
                              {clip.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                            <span className="text-[10px] text-slate-600">
                              {new Date(clip.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right Scroll Button */}
                  <button
                    onClick={() => {
                      const container = document.getElementById(`scroll-cat-admin-${category}`);
                      if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto hover:bg-blue-600 hover:border-blue-500 hover:scale-110 shadow-2xl transition-all hidden md:flex"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClipsPage;
