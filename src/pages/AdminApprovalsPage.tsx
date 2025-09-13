import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { CheckCircle, XCircle, Clock, User, Phone, Mail, Hash, DollarSign, Calendar, AlertCircle } from 'lucide-react';

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
}

export default function AdminApprovalsPage() {
  const { currentAppUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ExtraNumberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ExtraNumberRequest | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      // Buscar solicitações com dados do usuário
      const { data, error } = await supabase
        .from('extra_number_requests')
        .select(`
          *,
          users!inner(
            name,
            email,
            whatsapp
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRequests: ExtraNumberRequest[] = data.map((req: any) => ({
        id: req.id,
        user_id: req.user_id,
        user_name: req.users.name,
        user_email: req.users.email,
        user_whatsapp: req.users.whatsapp,
        payment_amount: req.payment_amount,
        status: req.status,
        created_at: req.created_at,
        processed_at: req.processed_at,
        processed_by: req.processed_by,
        extra_numbers: req.extra_numbers || []
      }));

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
      console.error('Erro ao aprovar solicitação:', error);
      alert('Erro ao aprovar solicitação');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('extra_number_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: currentAppUser?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadRequests();
      setShowModal(false);
      setSelectedRequest(null);
      
      alert('Solicitação rejeitada');
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
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

        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          {requests.length === 0 ? (
            <div className="text-center py-8 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-4">Nenhuma solicitação</h3>
              <p className="text-slate-400 text-base sm:text-lg px-4">Não há solicitações de números extras no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden shadow-2xl rounded-3xl border border-slate-600/30 backdrop-blur-sm hover:border-amber-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer"
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowModal(true);
                  }}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-3 sm:p-6 border-b border-slate-600/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
                          <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-lg font-black text-white truncate">{request.user_name}</h3>
                          <p className="text-slate-300 text-xs sm:text-sm truncate">{request.user_email}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-bold border flex-shrink-0 ml-2 ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
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
                        <div className="flex items-start justify-between">
                          <div className="flex items-center text-slate-300">
                            <Hash className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm font-medium">Números:</span>
                          </div>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {request.extra_numbers.map((num, index) => (
                              <span key={index} className="bg-amber-500/20 text-amber-200 px-1 py-0.5 sm:px-2 sm:py-1 rounded text-xs font-bold">
                                {num}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(request.id);
                          }}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                        >
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          Aprovar
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
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
