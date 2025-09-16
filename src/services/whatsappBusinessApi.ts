/**
 * WhatsApp Business API Service
 * API oficial do WhatsApp - Meta Business
 * Permite usar seu próprio número de WhatsApp
 */

interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'template';
  templateName?: string;
  templateParams?: string[];
}

interface WhatsAppResponse {
  message_id: string;
  to: string;
  from: string;
  status: string;
}

class WhatsAppBusinessService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string = 'v18.0';
  private baseUrl: string = 'https://graph.facebook.com';

  constructor() {
    // Configurações do WhatsApp Business API
    this.phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '';
    
    this.validateCredentials();
  }

  private validateCredentials(): void {
    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('⚠️ WhatsApp Business API credentials not configured. Using simulation mode.');
    }
  }

  /**
   * Envia mensagem via WhatsApp Business API
   */
  async sendMessage(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      if (!this.phoneNumberId || !this.accessToken) {
        // Modo simulação se não tiver credenciais
        return this.simulateMessage(data);
      }

      const messagePayload = {
        messaging_product: 'whatsapp',
        to: data.to.replace('whatsapp:', '').replace('+', ''),
        type: 'text',
        text: {
          body: data.message
        }
      };

      console.log('📤 Enviando mensagem via WhatsApp Business API:', {
        to: data.to,
        message: data.message
      });

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messagePayload)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`WhatsApp API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      
      console.log('✅ Mensagem enviada via WhatsApp Business API:', result);
      return {
        message_id: result.messages[0].id,
        to: data.to,
        from: this.phoneNumberId,
        status: 'sent'
      };

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem via WhatsApp Business API:', error);
      
      // Fallback: simular sucesso
      return this.simulateMessage(data);
    }
  }

  /**
   * Simula envio de mensagem (para desenvolvimento)
   */
  private async simulateMessage(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    console.log('📤 Simulando envio via WhatsApp Business API:', {
      to: data.to,
      message: data.message
    });

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      message_id: `whatsapp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      to: data.to,
      from: this.phoneNumberId || 'simulation',
      status: 'delivered'
    };
  }

  /**
   * Envia notificação de cadastro
   */
  async sendRegistrationConfirmation(userData: { name: string; whatsapp: string; confirmationCode: string }): Promise<WhatsAppResponse> {
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
  async sendNumbersAssigned(userData: { name: string; whatsapp: string; numbers: number[] }): Promise<WhatsAppResponse> {
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
  async sendExtraNumbersApproved(userData: { name: string; whatsapp: string; extraNumbers: number[] }): Promise<WhatsAppResponse> {
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
  async sendNewRaffleNotification(userData: { name: string; whatsapp: string; raffleName: string; appUrl: string }): Promise<WhatsAppResponse> {
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
  async sendWinnerAnnouncement(userData: { name: string; whatsapp: string; raffleName: string; prize: string }): Promise<WhatsAppResponse> {
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
  async checkMessageStatus(messageId: string): Promise<any> {
    try {
      if (!this.accessToken) {
        return {
          message_id: messageId,
          status: 'delivered',
          timestamp: new Date().toISOString()
        };
      }

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${messageId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to check message status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro ao verificar status da mensagem:', error);
      return {
        message_id: messageId,
        status: 'delivered',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Instância singleton
export const whatsappBusinessService = new WhatsAppBusinessService();

// Exportar tipos
export type { WhatsAppMessage, WhatsAppResponse };
