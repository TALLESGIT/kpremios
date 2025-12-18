import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { CheckCircle, XCircle, Clock, User, Hash, DollarSign, Calendar, AlertCircle, Image, FileText } from 'lucide-react';

interface ExtraNumberRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_whatsapp: string;
  payment_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  extra_numbers?: number[];
  payment_proof_url?: string;
  rejection_reason?: string;
}

export default function AdminApprovalsPage() {
  const { currentUser: currentAppUser, notifyExtraNumbersApproved } = useData();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ExtraNumberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ExtraNumberRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [requestToReject, setRequestToReject] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedProofRequest, setSelectedProofRequest] = useState<ExtraNumberRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage] = useState(10);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Verificar se é admin
  useEffect(() => {
    if (currentAppUser && !currentAppUser.is_admin) {
      navigate('/');
    }
  }, [currentAppUser, navigate]);

  // Carregar solicitações
  useEffect(() => {
    loadRequests();
  }, []);

  // Real-time subscription for requests updates
  useEffect(() => {
    if (!currentAppUser?.is_admin) return;

    console.log('AdminApprovalsPage - Configurando subscription em tempo real para solicitações...');

    const subscription = supabase
      .channel('admin-requests-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'extra_number_requests' 
      }, (payload) => {
        console.log('AdminApprovalsPage - Mudança detectada na tabela extra_number_requests:', payload);
        console.log('AdminApprovalsPage - Evento:', payload.eventType);
        console.log('AdminApprovalsPage - Dados:', payload.new || payload.old);
        
        // Recarregar solicitações para todos os admins
        loadRequests();
      })
      .subscribe((status) => {
        console.log('AdminApprovalsPage - Status da subscription:', status);
      });

    return () => {
      console.log('AdminApprovalsPage - Desconectando subscription...');
      subscription.unsubscribe();
    };
  }, [currentAppUser?.is_admin]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      // Primeiro, buscar todas as solicitações
      const { data: requestsData, error: requestsError } = await supabase
        .from('extra_number_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Erro ao carregar solicitações:', requestsError);
        throw requestsError;
      }

      console.log('Solicitações recebidas:', requestsData);

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Buscar dados dos usuários separadamente
      const userIds = [...new Set(requestsData.map(req => req.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, whatsapp')
        .in('id', userIds);

      if (usersError) {
        console.error('Erro ao carregar usuários:', usersError);
        // Continuar mesmo com erro nos usuários
      }

      console.log('Usuários recebidos:', usersData);

      // Criar mapa de usuários para facilitar a busca
      const usersMap = new Map();
      if (usersData) {
        usersData.forEach(user => {
          usersMap.set(user.id, user);
        });
      }

      const formattedRequests: ExtraNumberRequest[] = requestsData.map((req: any) => {
        const user = usersMap.get(req.user_id);
        return {
          id: req.id,
          user_id: req.user_id,
          user_name: user?.name || 'Usuário não encontrado',
          user_email: user?.email || 'Email não encontrado',
          user_whatsapp: user?.whatsapp || 'WhatsApp não encontrado',
          payment_amount: req.payment_amount,
          status: req.status,
          created_at: req.created_at,
          processed_at: req.processed_at,
          processed_by: req.processed_by,
          extra_numbers: req.extra_numbers || [],
          payment_proof_url: req.payment_proof_url,
          rejection_reason: req.rejection_reason
        };
      });

      console.log('Solicitações formatadas:', formattedRequests);
      setRequests(formattedRequests);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      // Encontrar a solicitação para obter a quantidade correta
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }
      
      // Verificar se há comprovante de pagamento
      if (!request.payment_proof_url) {
        // Abrir modal de confirmação em vez de bloquear
        setPendingApprovalId(requestId);
        setShowConfirmModal(true);
        return;
      }
      
      // Calcular quantidade correta: 100 números por cada R$ 10,00
      const quantity = Math.floor(request.payment_amount / 10) * 100;
      
      // Usar a função assign_random_extra_numbers_with_raffle_limit para atribuir números automaticamente
      // Esta função considera o total_numbers do sorteio ativo
      const { data: assignedNumbers, error: assignError } = await supabase
        .rpc('assign_random_extra_numbers_with_raffle_limit', {
          request_id: request.id,
          quantity: quantity
        });

      if (assignError) throw assignError;
      
      // Atualizar status da solicitação com os números atribuídos
      const { error: updateError } = await supabase
        .from('extra_number_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: currentAppUser?.id,
          assigned_numbers: assignedNumbers
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Recarregar lista
      await loadRequests();
      setShowModal(false);
      setSelectedRequest(null);
      
      // Notificar o usuário sobre a aprovação
      try {
        await notifyExtraNumbersApproved(requestId);
      } catch (notifyError) {

        // Não falha a operação se a notificação falhar
      }
      
      alert('Solicitação aprovada com sucesso!');
    } catch (error) {

      alert('Erro ao aprovar solicitação');
    }
  };

  const confirmApproval = async () => {
    if (!pendingApprovalId) return;
    
    try {
      // Encontrar a solicitação para obter a quantidade correta
      const request = requests.find(r => r.id === pendingApprovalId);
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }
      
      // Calcular quantidade correta: 100 números por cada R$ 10,00
      const quantity = Math.floor(request.payment_amount / 10) * 100;
      
      // Usar a função assign_random_extra_numbers_with_raffle_limit para atribuir números automaticamente
      const { data: assignedNumbers, error: assignError } = await supabase
        .rpc('assign_random_extra_numbers_with_raffle_limit', {
          request_id: request.id,
          quantity: quantity
        });

      if (assignError) throw assignError;
      
      // Atualizar status da solicitação com os números atribuídos e notas opcionais
      const updateData: any = {
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: currentAppUser?.id,
        assigned_numbers: assignedNumbers
      };
      
      // Adicionar notas se fornecidas
      if (approvalNotes.trim()) {
        updateData.admin_notes = approvalNotes.trim();
      }
      
      const { error: updateError } = await supabase
        .from('extra_number_requests')
        .update(updateData)
        .eq('id', pendingApprovalId);

      if (updateError) throw updateError;

      // Recarregar lista
      await loadRequests();
      setShowConfirmModal(false);
      setPendingApprovalId(null);
      setApprovalNotes('');
      setShowModal(false);
      setSelectedRequest(null);
      
      // Notificar o usuário sobre a aprovação
      try {
        await notifyExtraNumbersApproved(pendingApprovalId);
      } catch (notifyError) {
        // Não falha a operação se a notificação falhar
      }
      
      alert('Solicitação aprovada com sucesso!');
    } catch (error) {
      alert('Erro ao aprovar solicitação');
    }
  };

  const handleReject = (requestId: string) => {
    setRequestToReject(requestId);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!requestToReject) return;
    
    try {
      // Encontrar a solicitação para obter os dados do usuário
      const request = requests.find(r => r.id === requestToReject);
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }

      const { error } = await supabase
        .from('extra_number_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: currentAppUser?.id,
          rejection_reason: rejectionReason || null
        })
        .eq('id', requestToReject);

      if (error) throw error;

      // Enviar notificação WhatsApp para o usuário
      try {
        const { whatsappPersonalService } = await import('../services/whatsappPersonalService');
        await whatsappPersonalService.sendExtraNumbersRejected({
          name: request.user_name,
          whatsapp: request.user_whatsapp,
          amount: request.payment_amount,
          reason: rejectionReason || undefined
        });
      } catch (whatsappError) {

        // Não falha a operação se o WhatsApp falhar
      }

      await loadRequests();
      setShowRejectModal(false);
      setRequestToReject(null);
      setRejectionReason('');
      
      alert('Solicitação rejeitada e usuário notificado via WhatsApp');
    } catch (error) {

      alert('Erro ao rejeitar solicitação');
    }
  };

  const generateRandomNumbers = (count: number): number[] => {
    const numbers: number[] = [];
    while (numbers.length < count) {
      const randomNum = Math.floor(Math.random() * 1000) + 1;
      if (!numbers.includes(randomNum)) {
        numbers.push(randomNum);
      }
    }
    return numbers.sort((a, b) => a - b);
  };

  // Função para organizar números em faixas de 100
  const organizeNumbersInRanges = (numbers: number[]) => {
    const ranges: { [key: string]: number[] } = {};
    
    numbers.forEach(num => {
      const rangeStart = Math.floor((num - 1) / 100) * 100 + 1;
      const rangeEnd = rangeStart + 99;
      const rangeKey = `${rangeStart}-${rangeEnd}`;
      
      if (!ranges[rangeKey]) {
        ranges[rangeKey] = [];
      }
      ranges[rangeKey].push(num);
    });
    
    return ranges;
  };

  // Funções de filtro e paginação
  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      request.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  console.log('Status filter:', statusFilter);
  console.log('Search term:', searchTerm);
  console.log('Total requests:', requests.length);
  console.log('Filtered requests:', filteredRequests.length);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-700 bg-yellow-100 border-2 border-yellow-300';
      case 'approved': return 'text-green-700 bg-green-100 border-2 border-green-300';
      case 'rejected': return 'text-red-700 bg-red-100 border-2 border-red-300';
      default: return 'text-gray-700 bg-gray-100 border-2 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      default: return 'Desconhecido';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-blue-600 font-semibold">Carregando solicitações...</p>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-grow w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 py-6 sm:py-8 lg:py-12 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-20">
            <motion.div
              className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center sm:text-left"
            >
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-4 tracking-tight" style={{
                textShadow: '3px 3px 0px rgba(251, 191, 36, 0.8)',
              }}>
                Aprovações
              </h1>
              <p className="text-blue-100 text-sm sm:text-base lg:text-lg font-semibold">
                Gerencie solicitações de números extras
              </p>
              {pendingCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mt-3 sm:mt-4 inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-red-100 border-2 border-red-300"
                >
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 mr-1 sm:mr-2" />
                  <span className="text-red-700 font-black text-xs sm:text-sm">
                    {pendingCount} solicitação{pendingCount > 1 ? 'ões' : ''} pendente{pendingCount > 1 ? 's' : ''}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Controles de Filtro e Busca */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-blue-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Busca */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Buscar por nome ou email
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Digite nome ou email..."
                  className="w-full px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Filtro por Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filtrar por status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="all">Todos ({requests.length})</option>
                  <option value="pending">Pendentes ({requests.filter(r => r.status === 'pending').length})</option>
                  <option value="approved">Aprovados ({requests.filter(r => r.status === 'approved').length})</option>
                  <option value="rejected">Rejeitados ({requests.filter(r => r.status === 'rejected').length})</option>
                </select>
              </div>

              {/* Estatísticas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estatísticas
                </label>
                <div className="text-gray-600 text-sm font-semibold">
                  <p>Mostrando {paginatedRequests.length} de {filteredRequests.length} solicitações</p>
                  <p>Página {currentPage} de {totalPages}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Lista de Solicitações */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {filteredRequests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 sm:py-16"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 sm:mb-4">
                {searchTerm || statusFilter !== 'all' ? 'Nenhuma solicitação encontrada' : 'Nenhuma solicitação'}
              </h3>
              <p className="text-gray-600 text-base sm:text-lg px-4 font-semibold">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca ou status.' 
                  : 'Não há solicitações de números extras no momento.'
                }
              </p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                {paginatedRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className={`group bg-white overflow-hidden shadow-lg rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    request.payment_proof_url 
                      ? 'border-green-300 hover:border-green-400 hover:shadow-xl' 
                      : 'border-yellow-300 hover:border-yellow-400 hover:shadow-xl'
                  }`}
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowModal(true);
                  }}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-6 border-b-2 border-blue-300 relative">
                    {/* Badge de Comprovante - posicionado no canto superior direito, responsivo */}
                    {request.payment_proof_url ? (
                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-green-100 border-2 border-green-300 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-1 z-10">
                        <Image className="h-3 w-3 text-green-700" />
                        <span className="text-green-700 text-xs font-black hidden sm:inline">Comprovante</span>
                        <span className="text-green-700 text-xs font-black sm:hidden">Comp</span>
                      </div>
                    ) : (
                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-yellow-100 border-2 border-yellow-300 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-1 z-10">
                        <FileText className="h-3 w-3 text-yellow-700" />
                        <span className="text-yellow-700 text-xs font-black hidden sm:inline">Sem Comprovante</span>
                        <span className="text-yellow-700 text-xs font-black sm:hidden">Sem</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pr-16 sm:pr-20">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
                          <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-lg font-black text-white truncate">{request.user_name}</h3>
                          <p className="text-blue-100 text-xs sm:text-sm truncate">{request.user_email}</p>
                        </div>
                      </div>
                      {/* Badge de Status - posicionado abaixo do badge de comprovante, menor no mobile */}
                      <div className={`absolute top-10 sm:top-12 right-2 sm:right-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold flex-shrink-0 ${getStatusColor(request.status)}`}>
                        <span className="hidden sm:inline">{getStatusText(request.status)}</span>
                        <span className="sm:hidden">
                          {request.status === 'pending' ? 'Pend' : 
                           request.status === 'approved' ? 'Aprov' : 
                           request.status === 'rejected' ? 'Rej' : '?'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-3 sm:p-6 bg-white">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm font-semibold">Valor:</span>
                        </div>
                        <span className="text-gray-900 font-black text-sm sm:text-base">R$ {request.payment_amount.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm font-semibold">Solicitado:</span>
                        </div>
                        <span className="text-gray-900 font-bold text-xs sm:text-sm">
                          {new Date(request.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {request.extra_numbers && request.extra_numbers.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center text-gray-600">
                            <Hash className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm font-semibold">Números Extras:</span>
                          </div>
                          
                          {/* Faixas de números */}
                          <div className="space-y-2">
                            {Object.entries(organizeNumbersInRanges(request.extra_numbers)).map(([range, numbers]) => (
                              <div key={range} className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-blue-700 font-black text-sm">{range}</span>
                                  <span className="text-gray-600 text-xs font-semibold">{numbers.length} números</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {numbers.map((num, index) => (
                                    <span key={index} className="bg-blue-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
                                      {num}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comprovante de Pagamento */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-600">
                          <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm font-semibold">Comprovante:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.payment_proof_url ? (
                            <>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-green-700 text-xs sm:text-sm font-semibold">Enviado</span>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProofUrl(request.payment_proof_url!);
                                  setSelectedProofRequest(request);
                                  setShowProofModal(true);
                                }}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border-2 border-blue-300 shadow-lg"
                              >
                                <Image className="h-3 w-3" />
                                Visualizar
                              </motion.button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-red-700 text-xs sm:text-sm font-semibold">Não enviado</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(request.id);
                          }}
                          className={`flex-1 font-black py-2 sm:py-3 px-3 sm:px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm shadow-lg ${
                            !request.payment_proof_url
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                          }`}
                        >
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          {!request.payment_proof_url ? 'Aprovar (Sem Comprovante)' : 'Aprovar'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(request.id);
                          }}
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-black py-2 sm:py-3 px-3 sm:px-4 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm shadow-lg"
                        >
                          <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          Rejeitar
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 flex justify-center"
                >
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Anterior
                    </motion.button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <motion.button
                        key={page}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 rounded-lg transition-colors font-bold ${
                          currentPage === page
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {page}
                      </motion.button>
                    ))}
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Próximo
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      
      {/* Modal de Rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-600/30 w-full max-w-md mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 p-6 border-b border-slate-600/30 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Rejeitar Solicitação</h3>
                  <p className="text-slate-300 text-sm">Informe o motivo da rejeição</p>
                </div>
              </div>
            </div>
            
            {/* Conteúdo */}
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Motivo da rejeição (opcional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: Comprovante ilegível, valor incorreto, documento inválido..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-200 resize-none"
                  rows={4}
                />
              </div>
              
              <div className="text-xs text-slate-400 mb-6 bg-slate-700/30 p-3 rounded-xl">
                💡 <strong>Dica:</strong> Fornecer um motivo ajuda o usuário a entender o problema e fazer uma nova solicitação correta.
              </div>
            </div>
            
            {/* Botões */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRequestToReject(null);
                  setRejectionReason('');
                }}
                className="flex-1 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 font-bold py-3 px-4 rounded-xl transition-all duration-200 border border-slate-600/30"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
       )}
       
       {/* Modal de Confirmação para Aprovação Sem Comprovante */}
       {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-600/30 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 p-4 sm:p-6 border-b border-slate-600/30 rounded-t-2xl sm:rounded-t-3xl">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-black text-white leading-tight">Aprovar sem Comprovante?</h3>
                  <p className="text-slate-300 text-xs sm:text-sm">Solicitação precisa de atenção</p>
                </div>
              </div>
            </div>
            
            {/* Conteúdo */}
            <div className="p-4 sm:p-6">
              <div className="mb-4 sm:mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <p className="text-amber-200 text-xs sm:text-sm leading-relaxed">
                  ⚠️ <strong>Atenção:</strong> Esta solicitação não possui comprovante anexado no sistema.
                </p>
                <p className="text-amber-200/80 text-xs mt-1 sm:mt-2">
                  Aprove apenas se o comprovante foi enviado por WhatsApp, email, etc.
                </p>
              </div>
              
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-2 sm:mb-3">
                  Notas da aprovação (opcional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Ex: Comprovante via WhatsApp..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-200 resize-none"
                  rows={2}
                />
              </div>
              
              <div className="text-xs text-slate-400 bg-slate-700/30 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                💡 <strong>Dica:</strong> Notas ajudam a manter o histórico da aprovação.
              </div>
            </div>
            
            {/* Botões */}
            <div className="p-4 sm:p-6 pt-0 flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingApprovalId(null);
                  setApprovalNotes('');
                }}
                className="flex-1 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-200 border border-slate-600/30 text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={confirmApproval}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
              >
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Aprovar Mesmo Assim</span>
                <span className="sm:hidden">Aprovar</span>
              </button>
            </div>
          </div>
        </div>
       )}
       
       {/* Modal de Visualização de Comprovante */}
       {showProofModal && selectedProofUrl && selectedProofRequest && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-600/30 w-full max-w-4xl mx-auto max-h-[90vh] overflow-hidden">
             {/* Header */}
             <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 p-6 border-b border-slate-600/30">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                     <Image className="h-6 w-6 text-blue-400" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-white">Comprovante de Pagamento</h3>
                     <p className="text-slate-300 text-sm">{selectedProofRequest.user_name} - R$ {selectedProofRequest.payment_amount.toFixed(2)}</p>
                   </div>
                 </div>
                 <button
                   onClick={() => {
                     setShowProofModal(false);
                     setSelectedProofUrl(null);
                     setSelectedProofRequest(null);
                   }}
                   className="w-10 h-10 bg-slate-700/50 hover:bg-slate-700/70 rounded-xl flex items-center justify-center transition-colors duration-200"
                 >
                   <XCircle className="h-5 w-5 text-slate-400" />
                 </button>
               </div>
             </div>
             
             {/* Conteúdo */}
             <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
               <div className="bg-slate-700/30 rounded-2xl p-4 mb-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="text-slate-400 font-medium">Usuário:</span>
                     <p className="text-white font-bold">{selectedProofRequest.user_name}</p>
                   </div>
                   <div>
                     <span className="text-slate-400 font-medium">Email:</span>
                     <p className="text-white font-bold">{selectedProofRequest.user_email}</p>
                   </div>
                   <div>
                     <span className="text-slate-400 font-medium">WhatsApp:</span>
                     <p className="text-white font-bold">{selectedProofRequest.user_whatsapp}</p>
                   </div>
                   <div>
                     <span className="text-slate-400 font-medium">Valor:</span>
                     <p className="text-white font-bold">R$ {selectedProofRequest.payment_amount.toFixed(2)}</p>
                   </div>
                   <div>
                     <span className="text-slate-400 font-medium">Data:</span>
                     <p className="text-white font-bold">{new Date(selectedProofRequest.created_at).toLocaleDateString('pt-BR')}</p>
                   </div>
                   <div>
                     <span className="text-slate-400 font-medium">Status:</span>
                     <p className={`font-bold ${
                       selectedProofRequest.status === 'approved' ? 'text-emerald-400' :
                       selectedProofRequest.status === 'rejected' ? 'text-red-400' : 'text-amber-400'
                     }`}>
                       {selectedProofRequest.status === 'approved' ? 'Aprovado' :
                        selectedProofRequest.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                     </p>
                   </div>
                 </div>
               </div>
               
               {/* Imagem do Comprovante */}
               <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
                 <img
                   src={selectedProofUrl}
                   alt="Comprovante de Pagamento"
                   className="max-w-full max-h-96 object-contain rounded-xl shadow-lg"
                   onError={(e) => {
                     const target = e.target as HTMLImageElement;
                     target.style.display = 'none';
                     const parent = target.parentElement;
                     if (parent) {
                       parent.innerHTML = `
                         <div class="text-center py-8">
                           <div class="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                             <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                           </div>
                           <p class="text-slate-600 font-medium">Erro ao carregar imagem</p>
                           <a href="${selectedProofUrl}" target="_blank" class="text-blue-600 hover:text-blue-700 font-medium text-sm mt-2 inline-block">Abrir em nova aba</a>
                         </div>
                       `;
                     }
                   }}
                 />
               </div>
             </div>
             
             {/* Botões de Ação */}
             {selectedProofRequest.status === 'pending' && (
               <div className="p-6 pt-0 border-t border-slate-600/30">
                 <div className="flex gap-3">
                   <button
                     onClick={() => {
                       setShowProofModal(false);
                       handleApprove(selectedProofRequest.id);
                     }}
                     className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                   >
                     <CheckCircle className="h-4 w-4" />
                     Aprovar
                   </button>
                   <button
                     onClick={() => {
                       setShowProofModal(false);
                       handleReject(selectedProofRequest.id);
                     }}
                     className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                   >
                     <XCircle className="h-4 w-4" />
                     Rejeitar
                   </button>
                 </div>
               </div>
             )}
           </div>
         </div>
       )}
    </div>
  );
}
