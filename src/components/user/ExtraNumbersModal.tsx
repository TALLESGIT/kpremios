import { useState } from 'react';
import { X, Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface ExtraNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ExtraNumbersModal({ isOpen, onClose }: ExtraNumbersModalProps) {
  const { requestExtraNumbers, getCurrentUserRequest, currentUser: currentAppUser } = useData();
  const { user } = useAuth();
  const [paymentAmount, setPaymentAmount] = useState('10');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const currentRequest = getCurrentUserRequest();
  const calculatedNumbers = Math.floor(parseFloat(paymentAmount || '0') / 10) * 100;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Apenas imagens são aceitas.');
        return;
      }
      setPaymentProof(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('ExtraNumbersModal - handleSubmit called');
    console.log('ExtraNumbersModal - user:', user);
    console.log('ExtraNumbersModal - currentAppUser:', currentAppUser);
    
    if (!user) {
      console.log('ExtraNumbersModal - User not authenticated');
      setError('Você precisa estar logado para solicitar números extras.');
      return;
    }

    if (!currentAppUser) {
      console.log('ExtraNumbersModal - User data not loaded yet');
      setError('Carregando dados do usuário...');
      return;
    }

    if (!currentAppUser.free_number) {
      console.log('ExtraNumbersModal - User has no free number');
      setError('Você precisa escolher seu número gratuito primeiro.');
      return;
    }

    if (parseFloat(paymentAmount) < 10) {
      console.log('ExtraNumbersModal - Payment amount too low');
      setError('Valor mínimo é R$ 10,00.');
      return;
    }

    if (parseFloat(paymentAmount) % 10 !== 0) {
      console.log('ExtraNumbersModal - Payment amount not multiple of 10');
      setError('O valor deve ser múltiplo de R$ 10,00.');
      return;
    }
    
    console.log('ExtraNumbersModal - Starting request process');
    setLoading(true);
    setError('');

    try {
      let paymentProofUrl: string | undefined;
      
      // Upload file if provided (optional - won't block request if fails)
      if (paymentProof) {
        console.log('ExtraNumbersModal - Attempting to upload file');
        setUploading(true);
        try {
          // Create a unique filename
          const fileExt = paymentProof.name.split('.').pop();
          const fileName = `payment_proof_${user.id}_${Date.now()}.${fileExt}`;
          
          // Try to upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, paymentProof, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) {
            console.warn('Upload error (continuing without file):', uploadError);
            // Don't block the request if upload fails
            paymentProofUrl = undefined;
          } else {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('payment-proofs')
              .getPublicUrl(fileName);
              
            paymentProofUrl = publicUrl;
            console.log('ExtraNumbersModal - File uploaded successfully:', paymentProofUrl);
          }
        } catch (uploadErr) {
          console.warn('Upload failed (continuing without file):', uploadErr);
          // Don't block the request if upload fails
          paymentProofUrl = undefined;
        } finally {
          setUploading(false);
        }
      }

      console.log('ExtraNumbersModal - Calling requestExtraNumbers with:', {
        paymentAmount: parseFloat(paymentAmount),
        calculatedNumbers,
        paymentProofUrl
      });

      const success = await requestExtraNumbers(
        parseFloat(paymentAmount),
        calculatedNumbers,
        paymentProofUrl
      );

      console.log('ExtraNumbersModal - requestExtraNumbers result:', success);

      if (success) {
        console.log('ExtraNumbersModal - Request successful');
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setPaymentAmount('10');
          setPaymentProof(null);
        }, 2000);
      } else {
        console.log('ExtraNumbersModal - Request failed');
        setError('Erro ao enviar solicitação. Tente novamente.');
      }
    } catch (err) {
      console.error('ExtraNumbersModal - Unexpected error:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Show pending request status
  if (currentRequest) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Solicitação Pendente</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Aguardando Aprovação
            </h3>
            
            <div className="space-y-2 text-sm text-slate-600 mb-6">
              <p>Valor: <strong className="text-slate-900">R$ {currentRequest.payment_amount.toFixed(2)}</strong></p>
              <p>Números solicitados: <strong className="text-slate-900">{currentRequest.requested_quantity}</strong></p>
              <p>Status: <strong className="text-amber-600 capitalize">{currentRequest.status}</strong></p>
            </div>

            <p className="text-slate-600 text-sm">
              Sua solicitação está sendo analisada. Você será notificado quando for aprovada ou rejeitada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Solicitação Enviada!
            </h3>
            <p className="text-slate-600">
              Sua solicitação foi enviada com sucesso e está sendo analisada.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Números Extras</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-800 mb-2">Como funciona:</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Cada R$ 10,00 = 100 números aleatórios</li>
                  <li>• Números serão atribuídos após aprovação</li>
                  <li>• Pagamento via PIX ou transferência</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <label htmlFor="payment-amount" className="block text-sm font-semibold text-slate-700 mb-2">
                  Valor do Pagamento (R$)
                </label>
                <input
                  type="number"
                  id="payment-amount"
                  name="payment-amount"
                  min="10"
                  step="10"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  autoComplete="off"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="10"
                />
                <p className="mt-2 text-sm text-slate-600">
                  Você receberá <strong className="text-amber-600">{calculatedNumbers} números</strong> aleatórios
                </p>
              </div>

              {/* Payment Proof */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Comprovante de Pagamento (Opcional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="payment-proof"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="payment-proof"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-amber-400 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-600">
                      {paymentProof ? paymentProof.name : 'Clique para enviar'}
                    </span>
                  </label>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Você pode enviar depois. Máximo 5MB, apenas imagens.
                </p>
              </div>

              {/* Payment Instructions */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">✅</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Comprovante de Pagamento</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                      <h4 className="font-semibold text-slate-800">Você já comprou a ação da rifa</h4>
                    </div>
                    <p className="text-sm text-slate-600 ml-9">
                      Perfeito! Agora só falta enviar o comprovante de pagamento
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                      <h4 className="font-semibold text-slate-800">Envie o comprovante</h4>
                    </div>
                    <p className="text-sm text-slate-600 ml-9">
                      Faça upload da foto ou print do comprovante de pagamento
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">3</span>
                      </div>
                      <h4 className="font-semibold text-slate-800">Aguarde a aprovação</h4>
                    </div>
                    <p className="text-sm text-slate-600 ml-9">
                      Nossos administradores validarão o pagamento em até 24h
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    💡 <strong>Dica:</strong> Você pode enviar o comprovante agora ou depois - o importante é que seja enviado para liberar seus números!
                  </p>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || uploading || calculatedNumbers === 0}
                className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-semibold text-white transition-all duration-200 ${
                  !loading && !uploading && calculatedNumbers > 0
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'bg-slate-400 cursor-not-allowed'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Enviando arquivo...
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Enviando...
                  </>
                ) : (
                  <>
                    Solicitar {calculatedNumbers} Números
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ExtraNumbersModal;