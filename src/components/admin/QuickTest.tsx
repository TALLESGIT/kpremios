import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const QuickTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendQuickTest = async () => {
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
          To: 'whatsapp:+5533999030124',
          From: import.meta.env.VITE_TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
          Body: '🎉 Teste da ZK Oficial funcionando! Sandbox configurado com sucesso! 🚀'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `✅ Mensagem enviada com sucesso! SID: ${data.sid}`
        });
      } else {
        setResult({
          success: false,
          message: `❌ Erro: ${data.message || 'Erro desconhecido'}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Erro de conexão: ${error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        🧪 Teste Rápido do Sandbox
      </h3>

      <div className="space-y-4">
        <p className="text-sm text-gray-600 text-center">
          Clique no botão abaixo para enviar uma mensagem de teste para seu WhatsApp
        </p>

        <button
          onClick={sendQuickTest}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md flex items-center justify-center gap-2 font-medium"
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
          <div className={`p-3 rounded-lg border ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
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

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Para:</strong> +5533999030124</p>
          <p><strong>De:</strong> +14155238886</p>
          <p><strong>Status:</strong> Sandbox configurado ✅</p>
        </div>
      </div>
    </div>
  );
};

export default QuickTest;
