import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { vonageWhatsAppService } from '../../services/vonageService';

const SandboxTest: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+5533999030124');
  const [message, setMessage] = useState('Teste do Vonage Sandbox - ZK Premios 🚀');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; message_uuid?: string } | null>(null);

  const sendTestMessage = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🚀 Enviando mensagem via Vonage...');
      
      const result = await vonageWhatsAppService.sendMessage({
        to: phoneNumber,
        message: message
      });

      console.log('✅ Mensagem enviada via Vonage:', result);
      
      setResult({
        success: true,
        message: `Mensagem enviada com sucesso via Vonage!`,
        message_uuid: result.message_uuid
      });

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem via Vonage:', error);
      
      setResult({
        success: false,
        message: `Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRegistrationMessage = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🚀 Testando confirmação de cadastro via Vonage...');
      
      const result = await vonageWhatsAppService.sendRegistrationConfirmation({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        confirmationCode: 'TEST123'
      });

      console.log('✅ Confirmação de cadastro enviada via Vonage:', result);
      
      setResult({
        success: true,
        message: `Confirmação de cadastro enviada com sucesso!`,
        message_uuid: result.message_uuid
      });

    } catch (error) {
      console.error('❌ Erro ao enviar confirmação via Vonage:', error);
      
      setResult({
        success: false,
        message: `Erro ao enviar confirmação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testNumbersAssigned = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🚀 Testando números selecionados via Vonage...');
      
      const result = await vonageWhatsAppService.sendNumbersAssigned({
        name: 'Usuário Teste',
        whatsapp: phoneNumber,
        numbers: [7, 13, 21, 33]
      });

      console.log('✅ Números selecionados enviados via Vonage:', result);
      
      setResult({
        success: true,
        message: `Números selecionados enviados com sucesso!`,
        message_uuid: result.message_uuid
      });

    } catch (error) {
      console.error('❌ Erro ao enviar números via Vonage:', error);
      
      setResult({
        success: false,
        message: `Erro ao enviar números: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🚀 Teste Vonage WhatsApp</h2>
          <p className="text-gray-600">Teste o sistema WhatsApp via Vonage (empresa sólida)</p>
        </div>
        <div className="bg-blue-100 border border-blue-200 rounded-md p-3">
          <h3 className="font-medium text-blue-800 mb-2">⚙️ Configuração:</h3>
          <p className="text-sm text-blue-700">
            <strong>Provider:</strong> Vonage<br/>
            <strong>Empresa:</strong> NYSE<br/>
            <strong>Status:</strong> Profissional
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            📱 Número do WhatsApp
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+5533999030124"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            💬 Mensagem de Teste
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Digite sua mensagem de teste..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={sendTestMessage}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          📤 Enviar Mensagem
        </button>

        <button
          onClick={testRegistrationMessage}
          disabled={isLoading}
          className="bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          ✅ Testar Cadastro
        </button>

        <button
          onClick={testNumbersAssigned}
          disabled={isLoading}
          className="bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          🎯 Testar Números
        </button>
      </div>

      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <div className="flex items-center">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
            <span className="text-blue-800">Enviando mensagem via Vonage...</span>
          </div>
        </div>
      )}

      {result && (
        <div className={`border rounded-md p-4 ${
          result.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            )}
            <div>
              <h4 className={`font-medium ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? '✅ Sucesso!' : '❌ Erro'}
              </h4>
              <p className={`text-sm mt-1 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
              {result.message_uuid && (
                <p className="text-xs text-gray-600 mt-2">
                  <strong>Message UUID:</strong> {result.message_uuid}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 className="font-medium text-gray-800 mb-2">📋 Informações do Vonage:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li><strong>Provider:</strong> Vonage (ex-Nexmo)</li>
          <li><strong>Empresa:</strong> NYSE Listada ✅</li>
          <li><strong>Suporte:</strong> 24/7 Profissional ✅</li>
          <li><strong>Seu Número:</strong> +5533999030124</li>
          <li><strong>Status:</strong> Empresa sólida e confiável</li>
        </ul>
      </div>
    </div>
  );
};

export default SandboxTest;