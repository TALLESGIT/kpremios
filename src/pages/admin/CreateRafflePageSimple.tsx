import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/shared/Header';
import Footer from '../../components/shared/Footer';
import { 
  ArrowLeft, 
  Trophy, 
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';

const CreateRafflePageSimple: React.FC = () => {
  const navigate = useNavigate();
  const { notifyAllUsersAboutNewRaffle } = useData();
  
  const [formData, setFormData] = useState({
    title: '',
    prize: '',
    startDate: '',
    endDate: '',
    description: '',
    maxParticipants: 1000,
    notifyUsers: true,
    prizeImage: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    notified?: number;
    total?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageType, setImageType] = useState<'upload' | 'url'>('upload');

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para lidar com upload de arquivo
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas arquivos de imagem');
        return;
      }
      
      // Verificar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 5MB');
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
    setFormData(prev => ({...prev, prizeImage: url}));
    setImagePreview(url);
    setImageType('url');
  };

  // Função para remover imagem
  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({...prev, prizeImage: ''}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validar dados
      if (!formData.title.trim()) {
        throw new Error('Título do sorteio é obrigatório');
      }
      
      if (!formData.prize.trim()) {
        throw new Error('Prêmio é obrigatório');
      }
      
      if (!formData.startDate) {
        throw new Error('Data de início é obrigatória');
      }
      
      if (!formData.endDate) {
        throw new Error('Data de fim é obrigatória');
      }

      // Upload da imagem se fornecida
      let imageUrl = formData.prizeImage;
      
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

      // Resetar todos os números antes de criar o sorteio
      const { error: resetError } = await supabase
        .from('numbers')
        .update({
          is_available: true,
          selected_by: null,
          is_free: false,
          assigned_at: null
        })
        .neq('number', 0);
      
      if (resetError) {
        throw new Error('Erro ao resetar números');
      }
      // Resetar dados dos usuários usando função SQL
      const { error: userResetError } = await supabase
        .rpc('reset_users_data');
      
      if (userResetError) {
        throw new Error('Erro ao resetar dados dos usuários');
      }
      // Limpar solicitações de números extras pendentes
      const { error: requestsResetError } = await supabase
        .from('extra_number_requests')
        .delete()
        .eq('status', 'pending');
      
      if (requestsResetError) {
        // Não falha o processo se não conseguir limpar as solicitações
      } else {
      }

      // Criar sorteio no banco de dados
      const raffleData = {
        title: formData.title,
        description: formData.description,
        prize: formData.prize,
        total_numbers: formData.maxParticipants,
        start_date: new Date(formData.startDate).toISOString(),
        end_date: new Date(formData.endDate).toISOString(),
        is_active: true,
        prize_image: imageUrl,
        created_at: new Date().toISOString()
      };

      const { data: raffle, error: raffleError } = await supabase
        .from('raffles')
        .insert([raffleData])
        .select()
        .single();

      if (raffleError) {
        throw new Error('Erro ao criar sorteio');
      }
      // Se notificação está habilitada, enviar para todos os usuários
      if (formData.notifyUsers) {
        const notificationResult = await notifyAllUsersAboutNewRaffle({
          title: formData.title,
          prize: formData.prize,
          startDate: formData.startDate,
          endDate: formData.endDate
        });

        if (notificationResult.success) {
          setResult({
            success: true,
            message: `Sorteio "${formData.title}" criado com sucesso!`,
            notified: notificationResult.notified,
            total: notificationResult.total
          });
        } else {
          setResult({
            success: true,
            message: `Sorteio "${formData.title}" criado, mas houve problemas com as notificações.`,
            notified: 0,
            total: notificationResult.total || 0
          });
        }
      } else {
        setResult({
          success: true,
          message: `Sorteio "${formData.title}" criado com sucesso!`,
          notified: 0,
          total: 0
        });
      }

      // Limpar formulário após sucesso
      setFormData({
        title: '',
        prize: '',
        startDate: '',
        endDate: '',
        description: '',
        maxParticipants: 1000,
        notifyUsers: true
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sorteio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <main className="flex-grow">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-6 sm:py-8 lg:py-12">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-700 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">
                  Criar Novo Sorteio
                </h1>
                <p className="text-slate-300 text-sm sm:text-base lg:text-lg">
                  Crie um novo sorteio e notifique todos os usuários via WhatsApp
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg">
            <div className="p-6 border-b border-slate-600/30">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                Informações do Sorteio
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
                    Título do Sorteio *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Ex: Sorteio de Natal 2024"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Prêmio */}
                <div>
                  <label htmlFor="prize" className="block text-sm font-medium text-slate-300 mb-2">
                    Prêmio *
                  </label>
                  <input
                    id="prize"
                    type="text"
                    value={formData.prize}
                    onChange={(e) => handleInputChange('prize', e.target.value)}
                    placeholder="Ex: iPhone 15 Pro Max"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Imagem do Prêmio */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    🏆 Imagem do Prêmio (opcional)
                  </label>
                  
                  {/* Tabs para escolher tipo de imagem */}
                  <div className="flex mb-3">
                    <button
                      type="button"
                      onClick={() => setImageType('upload')}
                      className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${
                        imageType === 'upload'
                          ? 'bg-blue-500 text-white border-blue-500'
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
                          ? 'bg-blue-500 text-white border-blue-500'
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
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        value={formData.prizeImage}
                        onChange={(e) => handleImageUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                {/* Datas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-2">
                      Data de Início *
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-2">
                      Data de Fim *
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descreva os detalhes do sorteio..."
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Máximo de participantes */}
                <div>
                  <label htmlFor="maxParticipants" className="block text-sm font-medium text-slate-300 mb-2">
                    Máximo de Participantes
                  </label>
                  <input
                    id="maxParticipants"
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Notificação WhatsApp */}
                <div className="flex items-center space-x-3 p-4 bg-slate-700/50 rounded-lg border border-slate-600/30">
                  <input
                    type="checkbox"
                    id="notifyUsers"
                    checked={formData.notifyUsers}
                    onChange={(e) => handleInputChange('notifyUsers', e.target.checked)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <label htmlFor="notifyUsers" className="text-slate-300 cursor-pointer">
                      Notificar todos os usuários via WhatsApp
                    </label>
                  </div>
                </div>

                {/* Resultado */}
                {result && (
                  <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-gray-900">{result.message}</p>
                        {result.notified !== undefined && result.total !== undefined && (
                          <p className="text-sm text-gray-600 mt-1">
                            📱 Notificações: {result.notified}/{result.total} usuários
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Erro */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-md flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando Sorteio...
                      </>
                    ) : (
                      <>
                        <Trophy className="h-4 w-4" />
                        Criar Sorteio
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => navigate('/admin')}
                    className="px-6 py-3 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CreateRafflePageSimple;

