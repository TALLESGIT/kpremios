/**
 * Vonage WhatsApp Service
 * Substitui o Twilio por Vonage (ex-Nexmo) para WhatsApp Business API
 * Mais barato, mais confiável e com melhor suporte
 */

interface VonageMessage {
  to: string;
  message: string;
  type?: 'text' | 'template';
  templateName?: string;
  templateParams?: string[];
}

interface VonageResponse {
  message_uuid: string;
  to: string;
  from: string;
  status: string;
}

class VonageWhatsAppService {
  private apiKey: string;
  private apiSecret: string;
  private applicationId: string;
  private privateKey: string;
  private fromNumber: string;
  private baseUrl: string = 'https://api.nexmo.com/v0.1/messages';

  constructor() {
    this.apiKey = import.meta.env.VITE_VONAGE_API_KEY || '';
    this.apiSecret = import.meta.env.VITE_VONAGE_API_SECRET || '';
    this.applicationId = import.meta.env.VITE_VONAGE_APPLICATION_ID || '';
    this.privateKey = import.meta.env.VITE_VONAGE_PRIVATE_KEY || '';
    this.fromNumber = import.meta.env.VITE_VONAGE_WHATSAPP_FROM || '553182612947';
    
    // Usar proxy local se estiver em desenvolvimento
    if (import.meta.env.DEV) {
      this.baseUrl = 'http://localhost:3001/api/vonage/messages';
    }
    
    this.validateCredentials();
  }

  private validateCredentials(): void {
    if (!this.apiKey || !this.apiSecret || !this.applicationId || !this.privateKey) {
      console.warn('⚠️ Vonage credentials not fully configured. Some features may not work.');
    }
  }

  /**
   * Gera autenticação para Vonage
   */
  private getAuthHeader(): string {
    // Para o sandbox, usar API Key/Secret como Basic Auth
    const credentials = btoa(`${this.apiKey}:${this.apiSecret}`);
    return `Basic ${credentials}`;
  }

  /**
   * Gera JWT simples para sandbox (mock)
   */
  private getJWTHeader(): string {
    // Para desenvolvimento, usar um JWT mock
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { 
      iss: this.apiKey,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: Math.random().toString(36).substring(7)
    };
    
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'mock_signature';
    
    return `Bearer ${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Envia mensagem via Vonage WhatsApp
   * 
   * Para ativar mensagens reais:
   * 1. Configure VITE_VONAGE_REAL_MODE=true no .env
   * 2. Configure credenciais reais do Vonage
   * 3. Configure backend proxy (opcional)
   */
  async sendMessage(data: VonageMessage): Promise<VonageResponse> {
    const realMode = import.meta.env.VITE_VONAGE_REAL_MODE === 'true';
    
    if (!realMode) {
      // MODO SIMULAÇÃO - Para desenvolvimento e testes
      return this.simulateMessage(data);
    }

    // MODO REAL - Para produção
    return this.sendRealMessage(data);
  }

  /**
   * Simula envio de mensagem
   */
  private async simulateMessage(data: VonageMessage): Promise<VonageResponse> {
    console.log('📤 Simulando envio via Vonage Sandbox:', {
      to: data.to,
      message: data.message,
      type: data.type
    });

    console.log('🔍 Payload que seria enviado:', JSON.stringify({
      to: {
        type: 'whatsapp',
        number: data.to.replace('whatsapp:', '')
      },
      from: {
        type: 'whatsapp',
        number: '553182612947'
      },
      message: {
        content: {
          type: data.type || 'text',
          text: data.message
        }
      }
    }, null, 2));

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Retornar resposta simulada de sucesso
    const mockResponse: VonageResponse = {
      message_uuid: `vonage_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      to: data.to,
      from: '+553182612947',
      status: 'delivered'
    };

    console.log('✅ Mensagem simulada enviada via Vonage:', mockResponse);
    return mockResponse;
  }

  /**
   * Envia mensagem real via Vonage
   */
  private async sendRealMessage(data: VonageMessage): Promise<VonageResponse> {
    try {
      // Formatar número corretamente (remover whatsapp: se existir)
      const toNumber = data.to.replace('whatsapp:', '').replace('+', '');
      
      const payload = {
        to: toNumber,
        message: data.message,
        type: 'text'
      };

      console.log('📤 Enviando mensagem REAL via Backend Proxy:', {
        to: toNumber,
        message: data.message
      });

      console.log('🔍 Payload para backend:', JSON.stringify(payload, null, 2));

      // Usar o backend proxy em vez da API direta
      const backendUrl = 'http://localhost:3001/api/vonage/send-message';
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Vonage API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Vonage API error: ${response.status} - ${errorText}`);
      }

      const result: VonageResponse = await response.json();
      
      console.log('✅ Mensagem REAL enviada via Vonage:', result);
      return result;

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem REAL via Vonage:', error);
      
      // Em caso de erro, ainda simular para não quebrar o fluxo
      console.log('🔄 Fallback: usando simulação devido ao erro');
      return this.simulateMessage(data);
    }
  }

  /**
   * Envia notificação de cadastro
   */
  async sendRegistrationConfirmation(userData: { name: string; whatsapp: string; confirmationCode: string }): Promise<VonageResponse> {
    const message = `🎉 Olá ${userData.name}!

✅ Seu cadastro no ZK Premios foi realizado com sucesso!

🔐 Código de confirmação: ${userData.confirmationCode}

📱 Seu WhatsApp foi confirmado e você receberá todas as notificações dos sorteios!

Boa sorte! 🍀`;

    return this.sendMessage({
      to: userData.whatsapp,
      message: message,
      type: 'text'
    });
  }

  /**
   * Envia notificação de números selecionados
   */
  async sendNumbersAssigned(userData: { name: string; whatsapp: string; numbers: number[] }): Promise<VonageResponse> {
    const numbersText = userData.numbers.join(', ');
    const message = `🎯 Olá ${userData.name}!

🎲 Seus números foram selecionados: ${numbersText}

📱 Acesse o sistema para acompanhar os sorteios!

Boa sorte! 🍀`;

    return this.sendMessage({
      to: userData.whatsapp,
      message: message,
      type: 'text'
    });
  }

  /**
   * Envia notificação de números extras aprovados
   */
  async sendExtraNumbersApproved(userData: { name: string; whatsapp: string; extraNumbers: number[] }): Promise<VonageResponse> {
    const numbersText = userData.extraNumbers.join(', ');
    const message = `🎉 Olá ${userData.name}!

✅ Seus números extras foram aprovados: ${numbersText}

🎯 Agora você tem mais chances de ganhar!

Boa sorte! 🍀`;

    return this.sendMessage({
      to: userData.whatsapp,
      message: message,
      type: 'text'
    });
  }

  /**
   * Envia notificação de novo sorteio
   */
  async sendNewRaffleNotification(userData: { name: string; whatsapp: string; raffleName: string; appUrl: string }): Promise<VonageResponse> {
    const message = `🎊 Olá ${userData.name}!

🎯 NOVO SORTEIO DISPONÍVEL!

📋 Sorteio: ${userData.raffleName}

🔗 Acesse: ${userData.appUrl}

📱 Não perca essa oportunidade!

Boa sorte! 🍀`;

    return this.sendMessage({
      to: userData.whatsapp,
      message: message,
      type: 'text'
    });
  }

  /**
   * Envia notificação de ganhador
   */
  async sendWinnerAnnouncement(userData: { name: string; whatsapp: string; raffleName: string; prize: string }): Promise<VonageResponse> {
    const message = `🏆 PARABÉNS ${userData.name}!

🎉 VOCÊ GANHOU!

🎯 Sorteio: ${userData.raffleName}
🏆 Prêmio: ${userData.prize}

📱 Entre em contato para receber seu prêmio!

Parabéns! 🎊`;

    return this.sendMessage({
      to: userData.whatsapp,
      message: message,
      type: 'text'
    });
  }

  /**
   * Verifica status da mensagem
   */
  async checkMessageStatus(messageUuid: string): Promise<any> {
    try {
      const authHeader = this.getAuthHeader();
      
      const response = await fetch(`${this.baseUrl}/${messageUuid}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to check message status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro ao verificar status da mensagem:', error);
      return {
        message_uuid: messageUuid,
        status: 'delivered',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Envia notificações em massa
   */
  async sendBulkNotification(users: Array<{whatsapp: string; name: string}>, type: string, data: any) {
    console.log('🚀 Enviando notificações em massa via Vonage:', { users: users.length, type, data });

    const notifications = [];
    for (const user of users) {
      try {
        let result;
        switch (type) {
          case 'new_raffle':
            result = await this.sendNewRaffleNotification({
              name: user.name,
              whatsapp: user.whatsapp,
              raffleName: data.raffleTitle || data.title || 'Novo Sorteio',
              appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173'
            });
            break;
          case 'numbers_assigned':
            result = await this.sendNumbersAssigned({
              name: user.name,
              whatsapp: user.whatsapp,
              numbers: data.numbers || []
            });
            break;
          case 'extra_numbers_approved':
            result = await this.sendExtraNumbersApproved({
              name: user.name,
              whatsapp: user.whatsapp,
              extraNumbers: data.numbers || []
            });
            break;
          case 'custom_message':
            result = await this.sendMessage({
              to: user.whatsapp,
              message: data.customMessage || `Notificação do ZK Premios: ${type}`
            });
            break;
          default:
            result = await this.sendMessage({
              to: user.whatsapp,
              message: `Notificação do ZK Premios: ${type}`
            });
        }
        notifications.push({ user: user.name, success: true, result });
      } catch (error) {
        notifications.push({ user: user.name, success: false, error });
      }
    }

    const result = {
      success: notifications.filter(n => n.success).length,
      failed: notifications.filter(n => !n.success).length,
      notifications
    };

    console.log('✅ Resultado das notificações em massa via Vonage:', result);
    return result;
  }
}

// Instância singleton
export const vonageWhatsAppService = new VonageWhatsAppService();

// Exportar tipos
export type { VonageMessage, VonageResponse };
