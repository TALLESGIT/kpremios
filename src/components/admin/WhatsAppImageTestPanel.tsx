import React, { useState } from 'react';
import { whatsappService } from '../../services/whatsappService';

export default function WhatsAppImageTestPanel() {
  const [testNumber, setTestNumber] = useState('+5533999030124');
  const [imageUrl, setImageUrl] = useState('https://bukigyhhgrtgryklabjg.supabase.co/storage/v1/object/public/payment-proofs/payment_proof_315be42d-badc-4c3d-9fd1-1c862b3cc579_1758591470240.jpg');
  const [caption, setCaption] = useState('Teste de envio de imagem via Evolution API');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testEvolutionImage = async () => {
    setLoading(true);
    setResult('');

    try {
      const response = await whatsappService.sendMedia({
        to: testNumber,
        media: imageUrl,
        mediatype: 'image',
        caption: caption
      });

      setResult(`✅ Evolution API: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`❌ Evolution Error: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const testPaymentProof = async () => {
    setLoading(true);
    setResult('');

    try {
      const response = await whatsappService.sendMedia({
        to: testNumber,
        media: imageUrl,
        mediatype: 'image',
        caption: `🔔 *TESTE DE COMPROVANTE*

👤 *Usuário:* João Silva
📱 *WhatsApp:* ${testNumber}
📧 *Email:* joao@teste.com

💰 *Valor:* R$ 10,00
🔢 *Quantidade:* 100 números

🆔 *ID:* TEST_123`
      });

      setResult(`✅ Payment Proof (Evolution): ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`❌ Payment Proof Error: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-600/30">
      <h3 className="text-xl font-bold text-white mb-4">Teste de Envio de Imagens WhatsApp</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Número de Teste
          </label>
          <input
            type="text"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/30 rounded-lg text-white"
            placeholder="+5533999030124"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            URL da Imagem
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/30 rounded-lg text-white"
            placeholder="https://exemplo.com/imagem.jpg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Legenda da Imagem
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/30 rounded-lg text-white"
            rows={3}
            placeholder="Legenda da imagem..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={testEvolutionImage}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium"
          >
            {loading ? 'Enviando...' : 'Testar Evolution'}
          </button>

          <button
            onClick={testPaymentProof}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg font-medium"
          >
            {loading ? 'Enviando...' : 'Testar Comprovante'}
          </button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
            <pre className="text-sm text-slate-300 whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
