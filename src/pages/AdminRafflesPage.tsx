import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  prize_image?: string;
}

export default function AdminRafflesPage() {
  const { currentUser: currentAppUser, loadNumbers } = useData();
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
    setFormData({ ...formData, prize_image: url });
    setImagePreview(url);
    setImageType('url');
  };

  // Função para remover imagem
  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, prize_image: '' });
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

    } finally {
      setLoading(false);
    }
  };

  const handleCreateRaffle = () => {
    setEditingRaffle(null);
    setFormData({
      title: '',
      prize_image: '',
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
      description: raffle.description || '',
      prize: raffle.prize,
      total_numbers: raffle.total_numbers,
      prize_image: '',
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

        // Se o sorteio está ativo e o total_numbers foi alterado, recarregar números
        if (editingRaffle.is_active && editingRaffle.total_numbers !== formData.total_numbers) {
          console.log(`AdminRafflesPage - Total de números alterado de ${editingRaffle.total_numbers} para ${formData.total_numbers}, recarregando números...`);

          // Se o total_numbers foi reduzido, limpar números órfãos
          if (formData.total_numbers < editingRaffle.total_numbers) {
            console.log(`AdminRafflesPage - Aviso: Total de números reduzido de ${editingRaffle.total_numbers} para ${formData.total_numbers}`);
            console.log(`AdminRafflesPage - Limpando números órfãos de ${formData.total_numbers + 1} a ${editingRaffle.total_numbers}...`);

            try {
              const { error: cleanupError } = await supabase
                .rpc('cleanup_orphaned_numbers_by_range', { max_number: formData.total_numbers });

              if (cleanupError) {
                console.warn('Erro ao limpar números órfãos:', cleanupError);
              } else {
                console.log('AdminRafflesPage - Números órfãos limpos com sucesso');
              }
            } catch (cleanupError) {
              console.warn('Erro ao limpar números órfãos:', cleanupError);
            }
          }

          // Recarregar números no DataContext
          try {
            // Aguardar um pouco para garantir que as mudanças sejam propagadas
            await new Promise(resolve => setTimeout(resolve, 500));
            await loadNumbers();
            console.log('AdminRafflesPage - Números recarregados com sucesso');
          } catch (reloadError) {
            console.warn('Erro ao recarregar números:', reloadError);
            // Continuar mesmo com erro
          }
        }
      } else {
        // Resetar sistema usando função RPC otimizada
        const { error: resetError } = await supabase
          .rpc('reset_system_safe');

        if (resetError) {
          throw new Error('Erro ao resetar sistema');
        }

        // Limpar solicitações de números extras pendentes e aprovadas
        const { error: requestsResetError } = await supabase
          .from('extra_number_requests')
          .delete()
          .in('status', ['pending', 'approved']);

        if (requestsResetError) {
          // Não falha o processo se não conseguir limpar as solicitações
          console.warn('Erro ao limpar solicitações:', requestsResetError);
        } else {
          console.log('Solicitações de números extras resetadas com sucesso');
        }

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

      alert('Erro ao salvar sorteio');
    }
  };

  const handleDeleteRaffle = async (raffleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este sorteio?\n\n⚠️ ATENÇÃO: Esta ação irá excluir:\n- O sorteio\n- Todos os números selecionados\n- Todas as solicitações de números extras\n- Todos os resultados de sorteio relacionados\n\nEsta ação não pode ser desfeita!')) return;

    try {
      console.log('AdminRafflesPage - Iniciando exclusão do sorteio:', raffleId);

      // Usar função RPC específica para excluir dados do sorteio
      const { data: result, error } = await supabase
        .rpc('delete_specific_raffle_data', {
          raffle_id_to_delete: raffleId
        });

      console.log('AdminRafflesPage - Resultado da exclusão:', { result, error });

      if (error) {
        console.error('Erro ao excluir sorteio:', error);
        throw new Error(`Erro na chamada RPC: ${error.message}`);
      }

      if (!result) {
        console.error('Nenhum resultado retornado pela função');
        throw new Error('Nenhum resultado retornado pela função de exclusão');
      }

      if (!result.success) {
        console.error('Erro na função de exclusão:', result.message);
        throw new Error(result.message);
      }

      console.log('AdminRafflesPage - Exclusão realizada com sucesso:', result);

      // Recarregar números para refletir as mudanças
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadNumbers();

      // Recarregar lista de sorteios
      await loadRaffles();

      alert('Sorteio e todos os dados relacionados foram excluídos com sucesso!');
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

      alert('Erro ao alterar status do sorteio');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        <Header />
        <main className="flex-grow flex items-center justify-center relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/10 blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-full h-[500px] bg-blue-900/20 blur-[100px]" />
          </div>
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 animate-pulse">
              <Trophy className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-blue-200/60 text-lg font-medium animate-pulse">Carregando sorteios...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow w-full relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-[500px] bg-blue-600/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-full h-[500px] bg-indigo-900/20 blur-[100px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

        {/* Header Section */}
        <div className="relative py-8 sm:py-12 lg:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
                  GESTÃO DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">SORTEIOS</span>
                </h1>
                <p className="text-blue-200/60 text-lg font-medium">
                  Crie, edite e acompanhe seus sorteios ativos de forma profissional.
                </p>
              </div>
              <button
                onClick={handleCreateRaffle}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-blue-600/20 hover:-translate-y-1 active:scale-[0.98]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Novo Sorteio
              </button>
            </div>
          </div>
        </div>

        {/* Raffles List */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {raffles.length === 0 ? (
            <div className="glass-panel p-20 rounded-3xl text-center border border-white/5 bg-slate-800/50 backdrop-blur-xl max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                <Trophy className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Nenhum sorteio encontrado</h3>
              <p className="text-blue-200/60 mb-8 font-medium">Você ainda não criou nenhum sorteio. Comece agora mesmo!</p>
              <button
                onClick={handleCreateRaffle}
                className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Criar Primeiro Sorteio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {raffles.map((raffle) => (
                <div
                  key={raffle.id}
                  className="glass-panel group overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-800/40 backdrop-blur-md hover:border-white/10 transition-all duration-500"
                >
                  {/* Card Header/Banner */}
                  <div className="relative h-48 bg-slate-900 overflow-hidden">
                    {raffle.prize_image ? (
                      <img src={raffle.prize_image} alt={raffle.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-slate-900/50 flex items-center justify-center">
                        <Trophy className="h-20 w-20 text-blue-500/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                    <div className="absolute top-6 right-6">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border backdrop-blur-md ${raffle.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                        {raffle.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-2xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors uppercase italic">{raffle.title}</h3>
                      <p className="text-blue-200 font-bold flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        {raffle.prize}
                      </p>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-8 space-y-8">
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                      {raffle.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-3xl bg-slate-900/50 border border-white/5 group-hover:bg-slate-900 transition-colors">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 leading-none">Total Números</p>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-blue-400" />
                          <p className="text-lg font-black text-white">{raffle.total_numbers.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-3xl bg-slate-900/50 border border-white/5 group-hover:bg-slate-900 transition-colors">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 leading-none">Status</p>
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-blue-400" />
                          <p className={`text-sm font-bold ${raffle.is_active ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {raffle.is_active ? 'Rodando' : 'Pausado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-200/80 text-xs font-bold uppercase tracking-wider">
                        {new Date(raffle.start_date).toLocaleDateString('pt-BR')} - {new Date(raffle.end_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                      <button
                        onClick={() => handleEditRaffle(raffle)}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-[1.25rem] transition-all duration-300"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => toggleRaffleStatus(raffle.id, raffle.is_active)}
                        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 font-black rounded-[1.25rem] transition-all duration-300 ${raffle.is_active
                          ? 'bg-amber-500 hover:bg-amber-400 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                      >
                        {raffle.is_active ? <X className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                        {raffle.is_active ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleDeleteRaffle(raffle.id)}
                        className="p-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-[1.25rem] transition-all duration-300 border border-red-500/20"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create/Edit Raffle */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <div className="glass-panel p-0 rounded-[2.5rem] border border-white/10 bg-slate-800 w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Trophy className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
                      {editingRaffle ? 'Editar Sorteio' : 'Novo Sorteio'}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  <X className="h-6 w-6 text-slate-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="grid gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-blue-200/50 uppercase tracking-widest ml-1">Título</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-[1.25rem] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                          placeholder="Ex: Sorteio do Milhão"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-blue-200/50 uppercase tracking-widest ml-1">Prêmio</label>
                        <input
                          type="text"
                          value={formData.prize}
                          onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-[1.25rem] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                          placeholder="Ex: iPhone 15 Pro Max"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-200/50 uppercase tracking-widest ml-1">Descrição</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-[1.25rem] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium resize-none"
                        placeholder="Detalhes sobre o sorteio..."
                      />
                    </div>
                  </div>

                  {/* Image/Numbers Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-200/50 uppercase tracking-widest ml-1">Total de Números</label>
                      <input
                        type="number"
                        value={formData.total_numbers}
                        onChange={(e) => setFormData({ ...formData, total_numbers: parseInt(e.target.value) || 1000 })}
                        className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-[1.25rem] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-black text-xl"
                        min="100"
                        max="10000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-200/50 uppercase tracking-widest ml-1">Tipo de Imagem</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setImageType('upload')}
                          className={`flex-1 py-4 rounded-2xl font-bold border transition-all ${imageType === 'upload' ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-900'}`}
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageType('url')}
                          className={`flex-1 py-4 rounded-2xl font-bold border transition-all ${imageType === 'url' ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-900'}`}
                        >
                          URL
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Date Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-200/50 uppercase tracking-widest ml-1">Data Início</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-[1.25rem] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-200/50 uppercase tracking-widest ml-1">Data Fim</label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-[1.25rem] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-white/5 bg-slate-900/30 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveRaffle}
                  className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 uppercase italic"
                >
                  <Save className="h-5 w-5" />
                  Salvar Sorteio
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
