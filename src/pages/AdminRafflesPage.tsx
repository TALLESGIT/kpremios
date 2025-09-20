import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { Plus, Edit, Trash2, Trophy, Calendar, Users, Hash, Target, Settings, Save, X } from 'lucide-react';

interface Raffle {
  id: string;
  title: string;
  description: string;
  prize: string;
  total_numbers: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminRafflesPage() {
  const { currentUser: currentAppUser } = useData();
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageType, setImageType] = useState<'upload' | 'url'>('upload');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize: '',
    total_numbers: 1000,
    start_date: '',
    end_date: '',
    is_active: true,
    prize_image: ''
  });

  // Verificar se é admin
  useEffect(() => {
    if (currentAppUser && !currentAppUser.is_admin) {
      navigate('/');
    }
  }, [currentAppUser, navigate]);

  // Carregar sorteios
  useEffect(() => {
    loadRaffles();
  }, []);

  // Função para lidar com upload de arquivo
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem');
        return;
      }
      
      // Verificar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB');
        return;
      }
      
      setImageFile(file);
      setImageType('upload');
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para lidar com URL de imagem
  const handleImageUrl = (url: string) => {
    setFormData({...formData, prize_image: url});
    setImagePreview(url);
    setImageType('url');
  };

  // Função para remover imagem
  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData({...formData, prize_image: ''});
  };

  const loadRaffles = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRaffles(data || []);
    } catch (error) {
      console.error('Erro ao carregar sorteios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRaffle = () => {
    setEditingRaffle(null);
    setFormData({
      title: '',
      description: '',
      prize: '',
      total_numbers: 1000,
      start_date: '',
      end_date: '',
      is_active: true
    });
    setShowModal(true);
  };

  const handleEditRaffle = (raffle: Raffle) => {
    setEditingRaffle(raffle);
    setFormData({
      title: raffle.title,
      description: raffle.description,
      prize: raffle.prize,
      total_numbers: raffle.total_numbers,
      start_date: raffle.start_date.split('T')[0],
      end_date: raffle.end_date.split('T')[0],
      is_active: raffle.is_active
    });
    setShowModal(true);
  };

  const handleSaveRaffle = async () => {
    try {
      // Upload da imagem se fornecida
      let imageUrl = formData.prize_image;
      
      if (imageFile && imageType === 'upload') {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `prize-images/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('prize-images')
          .upload(filePath, imageFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('prize-images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
      }

      const raffleData = {
        ...formData,
        prize_image: imageUrl,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editingRaffle) {
        // Atualizar sorteio existente
        const { error } = await supabase
          .from('raffles')
          .update(raffleData)
          .eq('id', editingRaffle.id);

        if (error) throw error;
      } else {
        // Criar novo sorteio
        const { error } = await supabase
          .from('raffles')
          .insert([{
            ...raffleData,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      await loadRaffles();
      setShowModal(false);
      setEditingRaffle(null);
      setImageFile(null);
      setImagePreview('');
      
      alert(editingRaffle ? 'Sorteio atualizado com sucesso!' : 'Sorteio criado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar sorteio:', error);
      alert('Erro ao salvar sorteio');
    }
  };

  const handleDeleteRaffle = async (raffleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este sorteio?')) return;

    try {
      const { error } = await supabase
        .from('raffles')
        .delete()
        .eq('id', raffleId);

      if (error) throw error;

      await loadRaffles();
      alert('Sorteio excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir sorteio:', error);
      alert('Erro ao excluir sorteio');
    }
  };

  const toggleRaffleStatus = async (raffleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('raffles')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', raffleId);

      if (error) throw error;

      await loadRaffles();
      alert(`Sorteio ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar status do sorteio:', error);
      alert('Erro ao alterar status do sorteio');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500/30 border-t-amber-500 mx-auto mb-4"></div>
            <p className="text-amber-200 font-medium text-lg">Carregando sorteios...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full">
      <Header />
      <main className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-6 sm:py-8 lg:py-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"></div>
          <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-amber-500 via-amber-400 to-amber-500"></div>
          
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative z-10">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-4 tracking-tight">
                  Gestão de Sorteios
                </h1>
                <p className="text-slate-300 text-sm sm:text-base lg:text-lg font-medium">
                  Crie e gerencie sorteios personalizados
                </p>
              </div>
              <button
                onClick={handleCreateRaffle}
                className="inline-flex items-center px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 shadow-2xl hover:shadow-amber-500/25 transform hover:-translate-y-1 hover:scale-105 text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                Novo Sorteio
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          {raffles.length === 0 ? (
            <div className="text-center py-8 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-4">Nenhum sorteio criado</h3>
              <p className="text-slate-400 text-base sm:text-lg mb-6 sm:mb-8 px-4">Crie seu primeiro sorteio personalizado.</p>
              <button
                onClick={handleCreateRaffle}
                className="inline-flex items-center px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 shadow-2xl hover:shadow-amber-500/25 transform hover:-translate-y-1 hover:scale-105 text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                Criar Primeiro Sorteio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              {raffles.map((raffle) => (
                <div
                  key={raffle.id}
                  className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-slate-600/30 backdrop-blur-sm hover:border-amber-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-4 sm:p-6 border-b border-slate-600/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                          <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-white">{raffle.title}</h3>
                          <p className="text-slate-300 text-xs sm:text-sm">{raffle.prize}</p>
                        </div>
                      </div>
                      <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold border ${
                        raffle.is_active 
                          ? 'text-emerald-400 bg-emerald-400/20 border-emerald-400/30' 
                          : 'text-slate-400 bg-slate-400/20 border-slate-400/30'
                      }`}>
                        {raffle.is_active ? 'Ativo' : 'Inativo'}
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-4 sm:p-6">
                    <p className="text-slate-300 mb-4 sm:mb-6 text-xs sm:text-sm leading-relaxed">
                      {raffle.description}
                    </p>

                    <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-300">
                          <Hash className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm font-medium">Total de números:</span>
                        </div>
                        <span className="text-white font-bold text-xs sm:text-sm">{raffle.total_numbers.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-300">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm font-medium">Período:</span>
                        </div>
                        <span className="text-white font-bold text-xs sm:text-sm">
                          {new Date(raffle.start_date).toLocaleDateString('pt-BR')} - {new Date(raffle.end_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <div className="flex gap-2 sm:gap-3 flex-1">
                        <button
                          onClick={() => handleEditRaffle(raffle)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => toggleRaffleStatus(raffle.id, raffle.is_active)}
                          className={`flex-1 font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${
                            raffle.is_active
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700'
                              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
                          }`}
                        >
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                          {raffle.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteRaffle(raffle.id)}
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="sm:hidden">Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Criação/Edição */}
        {showModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto backdrop-blur-md">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity">
                <div className="absolute inset-0 bg-black/60"></div>
              </div>
              <div className="inline-block align-bottom bg-slate-800 rounded-2xl px-6 pt-6 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-600/30">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 sm:mx-0">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-2xl font-black text-white mb-6">
                      {editingRaffle ? 'Editar Sorteio' : 'Novo Sorteio'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                          Título do Sorteio
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder="Ex: Sorteio iPhone 15 Pro Max"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                          Descrição
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder="Descreva o sorteio e suas regras..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                          Prêmio
                        </label>
                        <input
                          type="text"
                          value={formData.prize}
                          onChange={(e) => setFormData({...formData, prize: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder="Ex: iPhone 15 Pro Max 256GB"
                        />
                      </div>

                      {/* Imagem do Prêmio */}
                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                          🏆 Imagem do Prêmio (opcional)
                        </label>
                        
                        {/* Tabs para escolher tipo de imagem */}
                        <div className="flex mb-3">
                          <button
                            type="button"
                            onClick={() => setImageType('upload')}
                            className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${
                              imageType === 'upload'
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                            }`}
                          >
                            📁 Upload do PC
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageType('url')}
                            className={`px-3 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                              imageType === 'url'
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                            }`}
                          >
                            🌐 URL (Unsplash)
                          </button>
                        </div>

                        {/* Upload de arquivo */}
                        {imageType === 'upload' && (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                              Formatos aceitos: JPG, PNG, GIF, WebP. Máximo: 5MB
                            </p>
                          </div>
                        )}

                        {/* URL de imagem */}
                        {imageType === 'url' && (
                          <div>
                            <input
                              type="url"
                              value={formData.prize_image}
                              onChange={(e) => handleImageUrl(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              placeholder="https://images.unsplash.com/photo-..."
                            />
                            <p className="text-xs text-slate-400 mt-1">
                              Cole aqui a URL da imagem (Unsplash, Imgur, etc.)
                            </p>
                          </div>
                        )}

                        {/* Preview da imagem */}
                        {imagePreview && (
                          <div className="mt-3">
                            <div className="relative inline-block">
                              <img
                                src={imagePreview}
                                alt="Preview do prêmio"
                                className="w-32 h-32 object-cover rounded-lg border border-slate-600"
                              />
                              <button
                                type="button"
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-300 mb-2">
                            Total de Números
                          </label>
                          <input
                            type="number"
                            value={formData.total_numbers}
                            onChange={(e) => setFormData({...formData, total_numbers: parseInt(e.target.value) || 1000})}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            min="100"
                            max="10000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-300 mb-2">
                            Status
                          </label>
                          <select
                            value={formData.is_active ? 'active' : 'inactive'}
                            onChange={(e) => setFormData({...formData, is_active: e.target.value === 'active'})}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          >
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-300 mb-2">
                            Data de Início
                          </label>
                          <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-300 mb-2">
                            Data de Fim
                          </label>
                          <input
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3 sm:flex-row-reverse">
                  <button
                    type="button"
                    className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black hover:from-amber-600 hover:to-amber-700 transition-all duration-300 shadow-2xl hover:shadow-amber-500/25"
                    onClick={handleSaveRaffle}
                  >
                    <Save className="h-5 w-5 mr-2" />
                    Salvar
                  </button>
                  <button
                    type="button"
                    className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-xl px-6 py-3 border border-slate-600 bg-slate-700 text-slate-300 font-bold hover:bg-slate-600 transition-all duration-300"
                    onClick={() => setShowModal(false)}
                  >
                    <X className="h-5 w-5 mr-2" />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
