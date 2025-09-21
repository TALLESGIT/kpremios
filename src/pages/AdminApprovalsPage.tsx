import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { currentUser: currentAppUser } = useData();
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

    const subscription = supabase
      .channel('admin-requests-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'extra_number_requests' 
      }, (payload) => {

        loadRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentAppUser?.is_admin]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      // Buscar solicitações com dados do usuário
      const { data, error } = await supabase
        .from('extra_number_requests')
        .select(`
          *,
          users(
            name,
            email,
            whatsapp
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar solicitações:', error);
        throw error;
      }

      console.log('Dados brutos recebidos:', data);

      const formattedRequests: ExtraNumberRequest[] = data.map((req: any) => ({
        id: req.id,
        user_id: req.user_id,
        user_name: req.users?.name || 'Usuário não encontrado',
        user_email: req.users?.email || 'Email não encontrado',
        user_whatsapp: req.users?.whatsapp || 'WhatsApp não encontrado',
        payment_amount: req.payment_amount,
        status: req.status,
        created_at: req.created_at,
        processed_at: req.processed_at,
        processed_by: req.processed_by,
        extra_numbers: req.extra_numbers || [],
        payment_proof_url: req.payment_proof_url
      }));

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
        alert('⚠️ Esta solicitação não possui comprovante de pagamento. É recomendado rejeitar ou solicitar o comprovante antes de aprovar.');
        return;
      }
      
      // Calcular quantidade correta: 100 números por cada R$ 10,00
      const quantity = Math.floor(request.payment_amount / 10) * 100;
      
      // Gerar números extras aleatórios (não sequenciais)
      const extraNumbers = generateRandomNumbers(quantity);
      
      // Atualizar status da solicitação
      const { error: updateError } = await supabase
        .from('extra_number_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: currentAppUser?.id,
          extra_numbers: extraNumbers
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Atualizar números no banco (marcar como indisponíveis)
      const { error: numbersError } = await supabase
        .from('numbers')
        .update({
          is_available: false,
          selected_by: request.user_id,
          assigned_at: new Date().toISOString()
        })
        .in('number', extraNumbers);

      if (numbersError) throw numbersError;

      // Atualizar campo extra_numbers do usuário
      const { error: userError } = await supabase
        .from('users')
        .update({
          extra_numbers: extraNumbers
        })
        .eq('id', request.user_id);

      if (userError) throw userError;

      // Recarregar lista
      await loadRequests();
      setShowModal(false);
      setSelectedRequest(null);
      
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
      case 'pending': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'approved': return 'text-emerald-400 bg-emerald-400/20 border-emerald-400/30';
      case 'rejected': return 'text-red-400 bg-red-400/20 border-red-400/30';
      default: return 'text-slate-400 bg-slate-400/20 border-slate-400/30';
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
      <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500/30 border-t-amber-500 mx-auto mb-4"></div>
            <p className="text-amber-200 font-medium text-lg">Carregando solicitações...</p>
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
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-4 tracking-tight">
                Aprovações
              </h1>
              <p className="text-slate-300 text-sm sm:text-base lg:text-lg font-medium">
                Gerencie solicitações de números extras
              </p>
              {pendingCount > 0 && (
                <div className="mt-3 sm:mt-4 inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-red-500/20 border border-red-400/30">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400 mr-1 sm:mr-2" />
                  <span className="text-red-200 font-bold text-xs sm:text-sm">
                    {pendingCount} solicitação{pendingCount > 1 ? 'ões' : ''} pendente{pendingCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controles de Filtro e Busca */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mb-6 sm:mb-8">
          <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-4 sm:p-6 backdrop-blur-sm border border-slate-600/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Busca */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Buscar por nome ou email
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Digite nome ou email..."
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                />
              </div>

              {/* Filtro por Status */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Filtrar por status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                >
                  <option value="all">Todos ({requests.length})</option>
                  <option value="pending">Pendentes ({requests.filter(r => r.status === 'pending').length})</option>
                  <option value="approved">Aprovados ({requests.filter(r => r.status === 'approved').length})</option>
                  <option value="rejected">Rejeitados ({requests.filter(r => r.status === 'rejected').length})</option>
                </select>
              </div>

              {/* Estatísticas */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Estatísticas
                </label>
                <div className="text-slate-400 text-sm">
                  <p>Mostrando {paginatedRequests.length} de {filteredRequests.length} solicitações</p>
                  <p>Página {currentPage} de {totalPages}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Solicitações */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        </div>

        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-4">
                {searchTerm || statusFilter !== 'all' ? 'Nenhuma solicitação encontrada' : 'Nenhuma solicitação'}
              </h3>
              <p className="text-slate-400 text-base sm:text-lg px-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca ou status.' 
                  : 'Não há solicitações de números extras no momento.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                {paginatedRequests.map((request) => (
                <div
                  key={request.id}
                  className={`group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border backdrop-blur-sm hover:border-amber-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer ${
                    request.payment_proof_url 
                      ? 'border-emerald-500/30 hover:border-emerald-400/50' 
                      : 'border-amber-500/30 hover:border-amber-400/50'
                  }`}
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowModal(true);
                  }}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-3 sm:p-6 border-b border-slate-600/30 relative">
                    {/* Badge de Comprovante - posicionado no canto superior direito, responsivo */}
                    {request.payment_proof_url ? (
                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-emerald-500/20 border border-emerald-400/30 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-1 z-10">
                        <Image className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-bold hidden sm:inline">Comprovante</span>
                        <span className="text-emerald-400 text-xs font-bold sm:hidden">Comp</span>
                      </div>
                    ) : (
                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-amber-500/20 border border-amber-400/30 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-1 z-10">
                        <FileText className="h-3 w-3 text-amber-400" />
                        <span className="text-amber-400 text-xs font-bold hidden sm:inline">Sem Comprovante</span>
                        <span className="text-amber-400 text-xs font-bold sm:hidden">Sem</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pr-16 sm:pr-20">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
                          <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-lg font-black text-white truncate">{request.user_name}</h3>
                          <p className="text-slate-300 text-xs sm:text-sm truncate">{request.user_email}</p>
                        </div>
                      </div>
                      {/* Badge de Status - posicionado abaixo do badge de comprovante, menor no mobile */}
                      <div className={`absolute top-10 sm:top-12 right-2 sm:right-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold border flex-shrink-0 ${getStatusColor(request.status)}`}>
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
                  <div className="p-3 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-300">
                          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm font-medium">Valor:</span>
                        </div>
                        <span className="text-white font-bold text-sm sm:text-base">R$ {request.payment_amount.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-300">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm font-medium">Solicitado:</span>
                        </div>
                        <span className="text-white font-bold text-xs sm:text-sm">
                          {new Date(request.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {request.extra_numbers && request.extra_numbers.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center text-slate-300">
                            <Hash className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm font-medium">Números Extras:</span>
                          </div>
                          
                          {/* Faixas de números */}
                          <div className="space-y-2">
                            {Object.entries(organizeNumbersInRanges(request.extra_numbers)).map(([range, numbers]) => (
                              <div key={range} className="bg-slate-700/30 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-amber-400 font-bold text-sm">{range}</span>
                                  <span className="text-slate-400 text-xs">{numbers.length} números</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {numbers.map((num, index) => (
                                    <span key={index} className="bg-amber-500/20 text-amber-200 px-2 py-1 rounded text-xs font-bold">
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
                        <div className="flex items-center text-slate-300">
                          <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm font-medium">Comprovante:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.payment_proof_url ? (
                            <>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                <span className="text-emerald-400 text-xs sm:text-sm font-medium">Enviado</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProofUrl(request.payment_proof_url!);
                                  setSelectedProofRequest(request);
                                  setShowProofModal(true);
                                }}
                                className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 text-blue-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border border-blue-400/30"
                              >
                                <Image className="h-3 w-3" />
                                Visualizar
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                              <span className="text-red-400 text-xs sm:text-sm font-medium">Não enviado</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(request.id);
                          }}
                          className={`flex-1 font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${
                            !request.payment_proof_url
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                          }`}
                        >
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          {!request.payment_proof_url ? 'Aprovar (Sem Comprovante)' : 'Aprovar'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(request.id);
                          }}
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                        >
                          <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          Rejeitar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-slate-700/50 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600/50 transition-colors"
                    >
                      Anterior
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-slate-700/50 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600/50 transition-colors"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
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
