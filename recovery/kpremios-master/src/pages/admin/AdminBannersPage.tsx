import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Header from '../../components/shared/Header';
import Footer from '../../components/shared/Footer';
import { Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, BarChart, Upload, X as XIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Advertisement {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  position: string;
  is_active: boolean;
  display_order: number;
  start_date?: string;
  end_date?: string;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export default function AdminBannersPage() {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    position: 'homepage',
    is_active: true,
    display_order: 0,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadAdvertisements();
  }, []);

  const loadAdvertisements = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvertisements(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar banners:', error);
      toast.error('Erro ao carregar banners');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const adData = {
        ...formData,
        display_order: parseInt(formData.display_order.toString()) || 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(adData)
          .eq('id', editingAd.id);

        if (error) throw error;
        toast.success('Banner atualizado com sucesso!');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('advertisements')
          .insert([{ ...adData, created_by: user?.id }]);

        if (error) throw error;
        toast.success('Banner criado com sucesso!');
      }

      setShowModal(false);
      setEditingAd(null);
      resetForm();
      loadAdvertisements();
    } catch (error: any) {
      console.error('Erro ao salvar banner:', error);
      toast.error('Erro ao salvar banner');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar imagem: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url || '',
      link_url: ad.link_url || '',
      position: ad.position,
      is_active: ad.is_active,
      display_order: ad.display_order,
      start_date: ad.start_date ? ad.start_date.split('T')[0] : '',
      end_date: ad.end_date ? ad.end_date.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;

    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Banner excluído com sucesso!');
      loadAdvertisements();
    } catch (error: any) {
      console.error('Erro ao excluir banner:', error);
      toast.error('Erro ao excluir banner');
    }
  };

  const toggleActive = async (ad: Advertisement) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ is_active: !ad.is_active })
        .eq('id', ad.id);

      if (error) throw error;
      toast.success(`Banner ${!ad.is_active ? 'ativado' : 'desativado'}!`);
      loadAdvertisements();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      link_url: '',
      position: 'homepage',
      is_active: true,
      display_order: 0,
      start_date: '',
      end_date: '',
    });
    setEditingAd(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Gerenciar Banners</h1>
          <p className="text-blue-200/60">Gerencie os banners e anúncios exibidos no site</p>
        </div>

        <div className="mb-6">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Banner
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advertisements.map((ad) => (
            <div
              key={ad.id}
              className="glass-panel p-6 rounded-3xl relative overflow-hidden"
            >
              {ad.image_url && (
                <div className="mb-4 rounded-xl overflow-hidden">
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-white">{ad.title}</h3>
                <button
                  onClick={() => toggleActive(ad)}
                  className={`p-2 rounded-lg ${ad.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
                >
                  {ad.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>

              {ad.description && (
                <p className="text-blue-200/60 text-sm mb-4 line-clamp-2">{ad.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-blue-200/40 mb-4">
                <span className="flex items-center gap-1">
                  <BarChart className="w-4 h-4" />
                  {ad.click_count} cliques
                </span>
                <span className="px-2 py-1 bg-blue-500/20 rounded">
                  {ad.position}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(ad)}
                  className="flex-1 btn btn-outline border-blue-400/30 hover:bg-blue-500/20 text-blue-300"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(ad.id)}
                  className="btn btn-outline border-red-400/30 hover:bg-red-500/20 text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {advertisements.length === 0 && (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-blue-400/40 mx-auto mb-4" />
            <p className="text-blue-200/60 text-lg">Nenhum banner cadastrado</p>
            <p className="text-blue-200/40 text-sm mt-2">Clique em "Novo Banner" para começar</p>
          </div>
        )}

        {/* Modal de Edição/Criação */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass-panel-dark max-w-2xl w-full p-8 rounded-3xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingAd ? 'Editar Banner' : 'Novo Banner'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-white font-medium mb-2">Título *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Imagem do Banner *</label>

                  <div className="flex flex-col gap-4">
                    {formData.image_url ? (
                      <div className="relative rounded-xl overflow-hidden group border border-white/10 aspect-video bg-slate-800">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-800 hover:bg-slate-750 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-blue-400 mb-2" />
                            <p className="text-sm text-blue-200/60 font-medium">
                              {uploading ? 'Enviando...' : 'Clique para fazer upload'}
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                        </label>
                      </div>
                    )}

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ImageIcon className="h-5 w-5 text-slate-500" />
                      </div>
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ou cole a URL da imagem aqui..."
                      />
                    </div>
                  </div>

                  <p className="text-blue-200/40 text-[10px] mt-2 italic uppercase">
                    Formatos recomendados: JPG, PNG, WEBP. Tamanho ideal: 1920x600 para homepage.
                  </p>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Link de Redirecionamento</label>
                  <input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://exemplo.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Posição</label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="homepage">Homepage</option>
                      <option value="sidebar">Sidebar</option>
                      <option value="footer">Footer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Ordem de Exibição</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Data de Início</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Data de Fim</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="is_active" className="text-white font-medium">
                    Banner Ativo
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 btn btn-primary"
                  >
                    {editingAd ? 'Atualizar' : 'Criar'} Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn btn-outline border-white/20 hover:bg-white/10 text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

