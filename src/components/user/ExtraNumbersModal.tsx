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
  const [showWhatsAppRedirect, setShowWhatsAppRedirect] = useState(false);
  const [whatsappConfirmed, setWhatsappConfirmed] = useState(false);
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string | null>(null);

  const currentRequest = getCurrentUserRequest();
  const calculatedNumbers = Math.floor(parseFloat(paymentAmount || '0') / 10) * 100;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Upload do arquivo imediatamente
      try {
        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `payment_proof_${user?.id}_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {

          setError('Erro ao fazer upload do comprovante. Tente novamente.');
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        setUploadedProofUrl(publicUrl);
        setShowWhatsAppRedirect(true);

      } catch (uploadErr) {

        setError('Erro ao fazer upload do comprovante. Tente novamente.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleWhatsAppRedirect = () => {
    const adminNumber = '5531972393341'; // Número do admin sem +55
    const message = `Olá! Gostaria de solicitar ${calculatedNumbers} números extras no valor de R$ ${paymentAmount}. 
    
Comprovante de pagamento: ${uploadedProofUrl}

Dados:
- Nome: ${currentAppUser?.name}
- Email: ${currentAppUser?.email}
- WhatsApp: ${currentAppUser?.whatsapp}`;

    const whatsappUrl = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleConfirmWhatsApp = () => {
    setWhatsappConfirmed(true);
    setShowWhatsAppRedirect(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {

      setError('Você precisa estar logado para solicitar números extras.');
      return;
    }

    if (!currentAppUser) {

      setError('Carregando dados do usuário...');
      return;
    }

    if (!currentAppUser.free_number) {

      setError('Você precisa escolher seu número gratuito primeiro.');
      return;
    }

    if (parseFloat(paymentAmount) < 10) {

      setError('Valor mínimo é R$ 10,00.');
      return;
    }

    if (parseFloat(paymentAmount) % 10 !== 0) {

      setError('O valor deve ser múltiplo de R$ 10,00.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use the already uploaded proof URL if available
      const paymentProofUrl = uploadedProofUrl || undefined;

      const success = await requestExtraNumbers(
        parseFloat(paymentAmount),
        calculatedNumbers,
        paymentProofUrl
      );

      if (success) {

        // Enviar comprovante para o WhatsApp do admin se houver
        if (paymentProofUrl && currentAppUser) {
          try {

            const { whatsappService } = await import('../../services/whatsappService');

            await whatsappService.sendMedia({
              to: '5531972393341', // Número do admin
              media: paymentProofUrl,
              mediatype: 'image',
              caption: `🔔 *NOVA SOLICITAÇÃO DE NÚMEROS EXTRAS*

👤 *Usuário:* ${currentAppUser.name}
📱 *WhatsApp:* ${currentAppUser.whatsapp}
📧 *Email:* ${currentAppUser.email}

💰 *Valor:* R$ ${parseFloat(paymentAmount).toFixed(2)}
🔢 *Quantidade:* ${calculatedNumbers} números

🔗 *Link do Comprovante:* ${paymentProofUrl}
🆔 *ID:* REQ_${Date.now()}`
            });

          } catch (whatsappError) {

            // Não falha a operação se o WhatsApp falhar
          }
        }

        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setPaymentAmount('10');
          setPaymentProof(null);
        }, 2000);
      } else {

        setError('Erro ao enviar solicitação. Tente novamente.');
      }
    } catch (err) {

      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Show WhatsApp redirect modal
  if (showWhatsAppRedirect) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Comprovante Enviado!
            </h3>

            <p className="text-slate-600 mb-4">
              Seu comprovante foi enviado com sucesso. Agora você precisa confirmar o envio via WhatsApp.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm mb-3">
                📱 <strong>Próximo passo:</strong> Clique no botão abaixo para abrir o WhatsApp e enviar uma mensagem confirmando o pagamento.
              </p>
              <p className="text-blue-700 text-xs">
                Isso garante que o administrador receba sua solicitação rapidamente.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleWhatsAppRedirect}
                className="flex-1 bg-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-2"
              >
                📱 Abrir WhatsApp
              </button>
              <button
                onClick={handleConfirmWhatsApp}
                className="flex-1 bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-200"
              >
                ✅ Já Enviei
              </button>
            </div>

            <p className="text-slate-500 text-xs mt-4">
              Após confirmar o envio, você poderá finalizar sua solicitação.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar">
        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Solicitação Enviada!
            </h3>
            <p className="text-slate-600 mb-3">
              Sua solicitação foi enviada com sucesso e está sendo analisada.
            </p>
            {paymentProof && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-800 text-sm">
                  📱 <strong>Comprovante enviado!</strong> O comprovante de pagamento foi enviado automaticamente para o WhatsApp do administrador para análise.
                </p>
              </div>
            )}
            <p className="text-slate-500 text-sm">
              Você será notificado quando a solicitação for aprovada ou rejeitada.
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

                {/* WhatsApp Confirmation Status */}
                {paymentProof && whatsappConfirmed && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800 font-medium">
                        ✅ WhatsApp confirmado! Você pode finalizar sua solicitação.
                      </span>
                    </div>
                  </div>
                )}

                {paymentProof && !whatsappConfirmed && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-800 font-medium">
                        📱 Confirme o envio no WhatsApp para continuar.
                      </span>
                    </div>
                  </div>
                )}
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
                disabled={loading || uploading || calculatedNumbers === 0 || (paymentProof && !whatsappConfirmed)}
                className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-semibold text-white transition-all duration-200 ${!loading && !uploading && calculatedNumbers > 0 && (!paymentProof || whatsappConfirmed)
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
                ) : paymentProof && !whatsappConfirmed ? (
                  <>
                    📱 Confirme o envio no WhatsApp primeiro
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