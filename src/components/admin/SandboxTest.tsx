import React, { useState } from 'react';
// Componentes UI removidos - usando HTML simples
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const SandboxTest: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+5533999030124');
  const [message, setMessage] = useState('Teste do sandbox - ZK Premios');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; sid?: string } | null>(null);

  const sendTestMessage = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
      const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
      
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
        },
        body: new URLSearchParams({
          To: `whatsapp:${phoneNumber}`,
          From: import.meta.env.VITE_TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
          Body: message
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `Mensagem enviada com sucesso! SID: ${data.sid}`,
          sid: data.sid
        });
      } else {
        setResult({
          success: false,
          message: `Erro: ${data.message || 'Erro desconhecido'}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Erro de conexão: ${error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>🧪 Teste do Sandbox</span>
        </h3>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Número do WhatsApp</label>
          <input
            id="phone"
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+5533999030124"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">Mensagem de teste</label>
          <input
            id="message"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Teste do sandbox"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button 
          onClick={sendTestMessage} 
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            '📱 Enviar Teste'
          )}
        </button>

        {result && (
          <div className={`p-4 rounded-lg border ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-700">
                {result.message}
              </span>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>⚠️ Importante:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Configure o sandbox primeiro</li>
            <li>Escaneie o QR Code no Twilio</li>
            <li>Envie a mensagem de confirmação</li>
            <li>Use o número: +14155238886</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SandboxTest;
