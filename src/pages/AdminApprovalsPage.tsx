import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { CheckCircle, XCircle, Clock, User, Hash, DollarSign, Calendar, AlertCircle, FileText } from 'lucide-react';

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
        const { whatsappService } = await import('../services/whatsappService');
        await whatsappService.sendExtraNumbersRejected({
          name: request.user_name,
          whatsapp: request.user_whatsapp,
          amount: request.payment_amount,
          reason: rejectionReason || undefined
        });
      } catch (whatsappError) {
        console.error('WhatsApp notification error:', whatsappError);
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
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow w-full relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-[500px] bg-blue-600/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-full h-[500px] bg-indigo-900/20 blur-[100px]" />
        </div>

        {/* Header Section */}
        <div className="relative py-8 sm:py-12 lg:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
                    APROVAÇÕES DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">SOLICITAÇÕES</span>
                  </h1>
                  <p className="text-blue-200/60 text-lg font-medium">
                    Gerencie e valide as solicitações de números extras dos usuários.
                  </p>
                </div>

                {pendingCount > 0 && (
                  <div className="inline-flex items-center px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md">
                    <AlertCircle className="h-5 w-5 text-amber-400 mr-3" />
                    <span className="text-amber-200 font-bold">
                      {pendingCount} Pendente{pendingCount > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-800/40 backdrop-blur-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-200/50 ml-1">Buscar Usuário</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Nome ou email..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-white/5 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-200/50 ml-1">Filtrar por Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/5 rounded-2xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="pending">Pendentes</option>
                    <option value="approved">Aprovados</option>
                    <option value="rejected">Rejeitados</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Clock className="h-4 w-4 text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="space-y-2 lg:text-right flex flex-col justify-end">
                <p className="text-slate-400 text-sm font-medium">
                  Mostrando <span className="text-white font-bold">{paginatedRequests.length}</span> de <span className="text-white font-bold">{filteredRequests.length}</span> registros
                </p>
                <p className="text-slate-500 text-xs">Página {currentPage} de {totalPages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {filteredRequests.length === 0 ? (
            <div className="glass-panel p-20 rounded-3xl text-center border border-white/5">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="h-10 w-10 text-slate-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Nenhuma solicitação encontrada</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Não existem solicitações que correspondam aos seus filtros atuais.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedRequests.map((request, index) => (
                <div
                  key={request.id}
                  className="glass-panel group overflow-hidden rounded-3xl border border-white/5 bg-slate-800/40 backdrop-blur-md hover:border-white/10 transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className="relative p-6 bg-gradient-to-r from-blue-900/30 to-slate-900/30 border-b border-white/5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                          <User className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-white truncate">{request.user_name}</h3>
                          <p className="text-slate-400 text-sm truncate">{request.user_email}</p>
                        </div>
                      </div>
                      <div className={`shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${request.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {getStatusText(request.status)}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-900/30 border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 leading-none">Valor Pago</p>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-emerald-400" />
                          <p className="text-lg font-black text-white">R$ {request.payment_amount.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-900/30 border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 leading-none">Data Solicitação</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <p className="text-sm font-bold text-white">{new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Proof Section */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${request.payment_proof_url ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                          {request.payment_proof_url ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                        </div>
                        <span className="text-sm font-medium text-slate-300">
                          {request.payment_proof_url ? 'Comprovante Enviado' : 'Sem Comprovante'}
                        </span>
                      </div>
                      {request.payment_proof_url && (
                        <button
                          onClick={() => {
                            setSelectedProofUrl(request.payment_proof_url!);
                            setSelectedProofRequest(request);
                            setShowProofModal(true);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                        >
                          Visualizar
                        </button>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {request.status === 'pending' && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(request.id); }}
                          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all shadow-xl ${!request.payment_proof_url
                            ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                            }`}
                        >
                          <CheckCircle className="h-5 w-5" />
                          Aprovar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(request.id); }}
                          className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-red-600/20"
                        >
                          <XCircle className="h-5 w-5" />
                          Rejeitar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-3 bg-slate-800 text-slate-400 rounded-2xl disabled:opacity-30 border border-white/5 hover:border-white/10 transition-all font-bold"
              >
                Anterior
              </button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-12 h-12 rounded-2xl font-black transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800 text-slate-400 border border-white/5 hover:border-white/10'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-3 bg-slate-800 text-slate-400 rounded-2xl disabled:opacity-30 border border-white/5 hover:border-white/10 transition-all font-bold"
              >
                Próximo
              </button>
            </div>
          )}
        </div>

        {/* Modals */}
        {showProofModal && selectedProofUrl && selectedProofRequest && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="glass-panel p-0 rounded-3xl border border-white/10 bg-slate-800/90 w-full max-w-4xl shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Comprovante de Pagamento</h3>
                    <p className="text-slate-400 text-sm">{selectedProofRequest.user_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProofModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <XCircle className="h-6 w-6 text-slate-400" />
                </button>
              </div>
              <div className="p-6">
                <div className="aspect-video relative rounded-2xl overflow-hidden bg-slate-900/50 border border-white/5 mb-6">
                  <img
                    src={selectedProofUrl}
                    alt="Proof"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowProofModal(false)}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-slate-800/90 w-full max-w-md shadow-2xl">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Rejeitar Solicitação</h3>
              <p className="text-slate-400 mb-6 font-medium">
                Tem certeza que deseja rejeitar esta solicitação? Esta ação informará o usuário que o pagamento não foi validado.
              </p>
              <div className="space-y-4 mb-8">
                <label className="text-sm font-bold text-blue-200/50 block ml-1">Observações (opcional)</label>
                <textarea
                  value={rejectionReason} // Changed from rejectionNotes to rejectionReason to match existing state
                  onChange={(e) => setRejectionReason(e.target.value)} // Changed from setRejectionNotes to setRejectionReason
                  placeholder="Motivo da rejeição..."
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/5 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all min-h-[100px]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReject} // Changed from confirmRejection to confirmReject
                  className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-slate-800/90 w-full max-w-md shadow-2xl">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Confirmar Aprovação</h3>
              <p className="text-slate-400 mb-8 font-medium">
                Deseja aprovar esta solicitação de números extras? O usuário receberá seus números imediatamente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmApproval} // Changed from confirmApprove to confirmApproval
                  className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20"
                >
                  Confirmar
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

