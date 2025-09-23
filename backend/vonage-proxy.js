/**
 * Backend Proxy para Vonage WhatsApp
 * Gera JWT válido e faz proxy das mensagens
 */

// Carregar variáveis de ambiente do arquivo .env do diretório pai
require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configurações do Vonage
const VONAGE_API_KEY = process.env.VITE_VONAGE_API_KEY || '1f83881f';
const VONAGE_API_SECRET = process.env.VITE_VONAGE_API_SECRET || 'ZkPremios2024!';
const VONAGE_APPLICATION_ID = process.env.VITE_VONAGE_APPLICATION_ID || '2ac17003-9897-415e-b1f4-db6b2c059b2c';
const VONAGE_PRIVATE_KEY = process.env.VITE_VONAGE_PRIVATE_KEY || '';

/**
 * Gera header de autenticação Basic para Vonage
 */
function getBasicAuthHeader() {
  const credentials = Buffer.from(`${VONAGE_API_KEY}:${VONAGE_API_SECRET}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Proxy para enviar imagens via Vonage
 */
app.post('/api/vonage/send-image', async (req, res) => {
  try {
    const { to, imageUrl, caption = '', type = 'image' } = req.body;
    const fromNumber = process.env.VITE_VONAGE_WHATSAPP_FROM || '553182612947';

    if (!to || !imageUrl) {
      return res.status(400).json({ error: 'to e imageUrl são obrigatórios' });
    }

    console.log('📤 Tentativa de envio de imagem:');
    console.log('   Para:', to);
    console.log('   De:', fromNumber);
    console.log('   Imagem:', imageUrl);
    console.log('   Legenda:', caption);
    
    // Verificar se o número remetente está configurado
    if (!fromNumber) {
      console.error('❌ ERRO: Número remetente não configurado (VITE_VONAGE_WHATSAPP_FROM)');
      return res.status(500).json({ 
        error: 'Número remetente WhatsApp não configurado',
        details: 'VITE_VONAGE_WHATSAPP_FROM não está definido no .env'
      });
    }
    
    // Verificar formato do número remetente
    if (!fromNumber.match(/^\d{10,15}$/)) {
      console.error('❌ ERRO: Formato inválido do número remetente:', fromNumber);
      return res.status(500).json({ 
        error: 'Formato inválido do número remetente',
        details: `Número ${fromNumber} deve conter apenas dígitos (10-15 caracteres)`
      });
    }

    const messagePayload = {
      to: {
        type: 'whatsapp',
        number: to.replace('whatsapp:', '').replace('+', '')
      },
      from: {
        type: 'whatsapp',
        number: fromNumber
      },
      message: {
        content: {
          type: 'image',
          image: {
            url: imageUrl,
            caption: caption
          }
        }
      }
    };

    console.log('🔄 Enviando imagem via API Vonage...');
    console.log('📤 Payload completo:', JSON.stringify(messagePayload, null, 2));

    // Usar Basic Auth
    const authHeader = getBasicAuthHeader();

    // Fazer requisição para Vonage
    const response = await fetch('https://api.nexmo.com/v0.1/messages', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messagePayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ ERRO DETALHADO da API Vonage:');
      console.error('   Status HTTP:', response.status);
      console.error('   Resposta:', JSON.stringify(result, null, 2));
      
      return res.status(response.status).json({
        ...result,
        suggestion: 'Verifique se o número está registrado para WhatsApp Business na Vonage'
      });
    }

    console.log('✅ Imagem enviada via API Vonage:', JSON.stringify(result, null, 2));
    console.log('📋 ID da mensagem:', result.message_uuid);
    
    res.json({
      ...result,
      from: fromNumber,
      to: to,
      warning: 'Se a imagem não chegar, verifique se o número está registrado para WhatsApp Business'
    });

  } catch (error) {
    console.error('❌ ERRO DETALHADO no proxy de imagem:');
    console.error('   Tipo do erro:', error.constructor.name);
    console.error('   Mensagem:', error.message);
    console.error('   Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message,
      suggestion: 'Verifique se o número está registrado para WhatsApp Business na Vonage'
    });
  }
});

/**
 * Proxy para enviar mensagens via Vonage
 */
app.post('/api/vonage/send-message', async (req, res) => {
  try {
    const { to, message, type = 'text' } = req.body;
    const fromNumber = process.env.VITE_VONAGE_WHATSAPP_FROM || '553182612947';

    if (!to || !message) {
      return res.status(400).json({ error: 'to e message são obrigatórios' });
    }

    console.log('📤 Tentativa de envio de mensagem:');
    console.log('   Para:', to);
    console.log('   De:', fromNumber);
    console.log('   🔍 DEBUG - Variável de ambiente VITE_VONAGE_WHATSAPP_FROM:', process.env.VITE_VONAGE_WHATSAPP_FROM);
    console.log('   🔍 DEBUG - fromNumber final:', fromNumber);
    console.log('   Mensagem:', message);
    console.log('   API Key:', VONAGE_API_KEY ? 'Configurada' : 'NÃO CONFIGURADA');
    
    // Verificar se o número remetente está configurado
    if (!fromNumber) {
      console.error('❌ ERRO: Número remetente não configurado (VITE_VONAGE_WHATSAPP_FROM)');
      return res.status(500).json({ 
        error: 'Número remetente WhatsApp não configurado',
        details: 'VITE_VONAGE_WHATSAPP_FROM não está definido no .env'
      });
    }
    
    // Verificar formato do número remetente
    if (!fromNumber.match(/^\d{10,15}$/)) {
      console.error('❌ ERRO: Formato inválido do número remetente:', fromNumber);
      return res.status(500).json({ 
        error: 'Formato inválido do número remetente',
        details: `Número ${fromNumber} deve conter apenas dígitos (10-15 caracteres)`
      });
    }

    const messagePayload = {
      to: {
        type: 'whatsapp',
        number: to.replace('whatsapp:', '').replace('+', '')
      },
      from: {
        type: 'whatsapp',
        number: fromNumber
      },
      message: {
        content: {
          type: type,
          text: message
        }
      }
    };

    console.log('🔄 Enviando via API Vonage...');
    console.log('📤 Payload completo:', JSON.stringify(messagePayload, null, 2));

            // Usar Basic Auth
            const authHeader = getBasicAuthHeader();

            // Fazer requisição para Vonage
            const response = await fetch('https://api.nexmo.com/v0.1/messages', {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(messagePayload)
            });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ ERRO DETALHADO da API Vonage:');
      console.error('   Status HTTP:', response.status);
      console.error('   Resposta:', JSON.stringify(result, null, 2));
      
      // Verificar erros específicos da Vonage
      if (response.status === 401) {
        console.error('🔑 ERRO DE AUTENTICAÇÃO: Verifique API_KEY e API_SECRET');
      } else if (response.status === 403) {
        console.error('🚫 ERRO DE PERMISSÃO: Número pode não estar registrado para WhatsApp Business');
      } else if (response.status === 422) {
        console.error('📝 ERRO DE VALIDAÇÃO: Verifique formato dos dados enviados');
      }
      
      return res.status(response.status).json({
        ...result,
        suggestion: 'Verifique se o número está registrado para WhatsApp Business na Vonage'
      });
    }

    console.log('✅ Resposta da API Vonage:', JSON.stringify(result, null, 2));
    console.log('📋 ID da mensagem:', result.message_uuid);
    console.log('⚠️  IMPORTANTE: Se a mensagem não chegar, o número', fromNumber, 'pode não estar registrado para WhatsApp Business na Vonage');
    console.log('📖 Para registrar: https://api.support.vonage.com/hc/en-us/articles/6025833602580');
    
    res.json({
      ...result,
      from: fromNumber,
      to: to,
      warning: 'Se a mensagem não chegar, verifique se o número está registrado para WhatsApp Business'
    });

  } catch (error) {
    console.error('❌ ERRO DETALHADO no proxy:');
    console.error('   Tipo do erro:', error.constructor.name);
    console.error('   Mensagem:', error.message);
    console.error('   Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message,
      suggestion: 'Verifique se o número está registrado para WhatsApp Business na Vonage'
    });
  }
});

/**
 * Verificar status de mensagem
 */
app.get('/api/vonage/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ error: 'messageId é obrigatório' });
    }

    // Para mensagens simuladas, retornar status mock
    if (messageId.startsWith('vonage_')) {
      const mockStatus = {
        message_uuid: messageId,
        status: 'delivered',
        timestamp: new Date().toISOString(),
        to: '5533999030124',
        from: '553182612947',
        network: 'whatsapp'
      };
      console.log('📊 Status simulado:', mockStatus);
      return res.json(mockStatus);
    }

    // Para mensagens reais, retornar status genérico
    // A API da Vonage não fornece endpoint direto para consulta de status
    // O status real deve ser recebido via webhook
    console.log(`🔍 Verificando status para messageId: ${messageId}`);
    console.log('ℹ️  API da Vonage não suporta consulta direta de status. Use webhooks para status em tempo real.');
    
    const genericStatus = {
      message_uuid: messageId,
      status: 'submitted',
      timestamp: new Date().toISOString(),
      to: '5533999030124',
      from: '553182612947',
      network: 'whatsapp',
      note: 'Status genérico - configure webhook para status em tempo real'
    };
    
    console.log('📊 Status genérico retornado:', genericStatus);
    res.json(genericStatus);

  } catch (error) {
    console.error('❌ Erro no backend ao verificar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Webhook para receber status de mensagens da Vonage
 */
app.post('/api/vonage/status', (req, res) => {
  try {
    const statusData = req.body;
    console.log('📨 Status de mensagem recebido via Webhook:', JSON.stringify(statusData, null, 2));
    
    // Aqui você pode salvar o status no banco de dados,
    // emitir eventos para o frontend via WebSocket, etc.
    
    res.status(200).json({ message: 'Webhook recebido com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Vonage Proxy rodando na porta ${PORT}`);
  console.log(`📱 Pronto para enviar mensagens WhatsApp via Vonage`);
});
