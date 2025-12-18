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
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl mb-4 shadow-lg"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl font-black text-white"
              >
                ZK
              </motion.span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-700 text-xl font-semibold"
            >
              Carregando sorteios...
            </motion.p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-grow w-full py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg"
                  >
                    <Trophy className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                      Gestão de Sorteios
                    </h1>
                    <p className="text-gray-600 text-sm font-semibold">
                      Crie e gerencie sorteios personalizados
                    </p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateRaffle}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Novo Sorteio
              </motion.button>
            </div>
          </motion.div>

          {raffles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-8 text-center"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Trophy className="h-8 w-8 text-blue-600" />
              </motion.div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Nenhum sorteio criado</h3>
              <p className="text-gray-600 mb-6 font-semibold">Crie seu primeiro sorteio personalizado.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateRaffle}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 shadow-lg"
              >
                <Plus className="h-5 w-5 inline mr-2" />
                Criar Primeiro Sorteio
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {raffles.map((raffle, index) => (
                <motion.div
                  key={raffle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 border-b-2 border-blue-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4">
                          <Trophy className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">{raffle.title}</h3>
                          <p className="text-blue-100 text-sm">{raffle.prize}</p>
                        </div>
                      </div>
                      <motion.span
                        whileHover={{ scale: 1.1 }}
                        className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${
                          raffle.is_active 
                            ? 'bg-green-100 text-green-700 border-green-300' 
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        {raffle.is_active ? 'Ativo' : 'Inativo'}
                      </motion.span>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-6 bg-white">
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                      {raffle.description}
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                        <div className="flex items-center text-gray-700">
                          <Hash className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-sm font-semibold">Total de números:</span>
                        </div>
                        <span className="text-gray-900 font-bold text-sm">{raffle.total_numbers.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                        <div className="flex items-center text-gray-700">
                          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-sm font-semibold">Período:</span>
                        </div>
                        <span className="text-gray-900 font-bold text-sm">
                          {new Date(raffle.start_date).toLocaleDateString('pt-BR')} - {new Date(raffle.end_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditRaffle(raffle)}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleRaffleStatus(raffle.id, raffle.is_active)}
                        className={`flex-1 font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                          raffle.is_active
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
                        }`}
                      >
                        <Settings className="h-4 w-4" />
                        {raffle.is_active ? 'Desativar' : 'Ativar'}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteRaffle(raffle.id)}
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 px-4 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Criação/Edição */}
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed z-50 inset-0 overflow-y-auto backdrop-blur-md"
          >
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity">
                <div className="absolute inset-0 bg-black/60"></div>
              </div>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-block align-bottom bg-white rounded-2xl px-6 pt-6 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border-2 border-blue-200"
              >
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 sm:mx-0">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-2xl font-black text-gray-900 mb-6">
                      {editingRaffle ? 'Editar Sorteio' : 'Novo Sorteio'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Título do Sorteio
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ex: Sorteio iPhone 15 Pro Max"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Descrição
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Descreva o sorteio e suas regras..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Prêmio
                        </label>
                        <input
                          type="text"
                          value={formData.prize}
                          onChange={(e) => setFormData({...formData, prize: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className={`px-3 py-2 text-sm font-medium rounded-l-lg border-2 ${
                              imageType === 'upload'
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            📁 Upload do PC
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageType('url')}
                            className={`px-3 py-2 text-sm font-medium rounded-r-lg border-2 ${
                              imageType === 'url'
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
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
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
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
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="https://images.unsplash.com/photo-..."
                            />
                            <p className="text-xs text-gray-500 mt-1">
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
                                className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
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
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Total de Números
                          </label>
                          <input
                            type="number"
                            value={formData.total_numbers}
                            onChange={(e) => setFormData({...formData, total_numbers: parseInt(e.target.value) || 1000})}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="100"
                            max="10000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Status
                          </label>
                          <select
                            value={formData.is_active ? 'active' : 'inactive'}
                            onChange={(e) => setFormData({...formData, is_active: e.target.value === 'active'})}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Data de Início
                          </label>
                          <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Data de Fim
                          </label>
                          <input
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3 sm:flex-row-reverse">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-lg px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                    onClick={handleSaveRaffle}
                  >
                    <Save className="h-5 w-5 mr-2" />
                    Salvar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="flex-1 sm:flex-none sm:w-auto inline-flex justify-center rounded-lg px-6 py-3 border-2 border-gray-300 bg-white text-gray-700 font-bold hover:bg-gray-50 transition-all duration-200"
                    onClick={() => setShowModal(false)}
                  >
                    <X className="h-5 w-5 mr-2" />
                    Cancelar
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}
