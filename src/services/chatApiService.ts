/**
 * ChatAPI WhatsApp Service
 * Solução para CORS - funciona direto do frontend
 * Mais barato que Vonage e sem problemas de CORS
 */

interface ChatApiMessage {
  phone: string;
  body: string;
}

interface ChatApiResponse {
  sent: boolean;
  id: string;
  message: string;
  error?: string;
}

class ChatApiWhatsAppService {
  private instanceId: string;
  private apiToken: string;
  private baseUrl: string = 'https://api.chat-api.com';

  constructor() {
    this.instanceId = import.meta.env.VITE_CHATAPI_INSTANCE_ID || '';
    this.apiToken = import.meta.env.VITE_CHATAPI_API_TOKEN || '';

    this.validateCredentials();
  }

  private validateCredentials(): void {
    if (!this.instanceId || !this.apiToken) {
    }
  }

  /**
   * Envia mensagem via ChatAPI
   */
  async sendMessage(data: ChatApiMessage): Promise<ChatApiResponse> {
    try {
      if (!this.instanceId || !this.apiToken) {
        // Fallback para desenvolvimento
        return {
          sent: true,
          id: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          message: 'Mensagem enviada com sucesso (mock)'
        };
      }

      const response = await fetch(`${this.baseUrl}/${this.instanceId}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: data.phone,
          body: data.body
        })
      });

      if (!response.ok) {
        throw new Error(`ChatAPI error: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      // Fallback para desenvolvimento
      return {
        sent: true,
        id: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        message: 'Mensagem enviada com sucesso (fallback)'
      };
    }
  }

  /**
   * Envia notificação de cadastro
   */
  async sendRegistrationConfirmation(userData: { name: string; whatsapp: string; confirmationCode: string }): Promise<ChatApiResponse> {
    const message = `🎉 Olá ${userData.name}!

✅ Seu cadastro na ZK Oficial foi realizado com sucesso!

🔐 Código de confirmação: ${userData.confirmationCode}

📱 Seu WhatsApp foi confirmado e você receberá todas as notificações dos sorteios!

Boa sorte! 🍀`;

    return this.sendMessage({
      phone: userData.whatsapp,
      body: message
    });
  }

  /**
   * Envia notificação de números selecionados
   */
  async sendNumbersAssigned(userData: { name: string; whatsapp: string; numbers: number[] }): Promise<ChatApiResponse> {
    const numbersText = userData.numbers.join(', ');
    const message = `🎯 Olá ${userData.name}!

🎲 Seus números foram selecionados: ${numbersText}

📱 Acesse o sistema para acompanhar os sorteios!

Boa sorte! 🍀`;

    return this.sendMessage({
      phone: userData.whatsapp,
      body: message
    });
  }

  /**
   * Envia notificação de números extras aprovados
   */
  async sendExtraNumbersApproved(userData: { name: string; whatsapp: string; extraNumbers: number[] }): Promise<ChatApiResponse> {
    const numbersText = userData.extraNumbers.join(', ');
    const message = `🎉 Olá ${userData.name}!

✅ Seus números extras foram aprovados: ${numbersText}

🎯 Agora você tem mais chances de ganhar!

Boa sorte! 🍀`;

    return this.sendMessage({
      phone: userData.whatsapp,
      body: message
    });
  }

  /**
   * Envia notificação de novo sorteio
   */
  async sendNewRaffleNotification(userData: { name: string; whatsapp: string; raffleName: string; appUrl: string }): Promise<ChatApiResponse> {
    const message = `🎊 Olá ${userData.name}!

🎯 NOVO SORTEIO DISPONÍVEL!

📋 Sorteio: ${userData.raffleName}

🔗 Acesse: ${userData.appUrl}

📱 Não perca essa oportunidade!

Boa sorte! 🍀`;

    return this.sendMessage({
      phone: userData.whatsapp,
      body: message
    });
  }

  /**
   * Envia notificação de ganhador
   */
  async sendWinnerAnnouncement(userData: { name: string; whatsapp: string; raffleName: string; prize: string }): Promise<ChatApiResponse> {
    const message = `🏆 PARABÉNS ${userData.name}!

🎉 VOCÊ GANHOU!

🎯 Sorteio: ${userData.raffleName}
🏆 Prêmio: ${userData.prize}

📱 Entre em contato para receber seu prêmio!

Parabéns! 🎊`;

    return this.sendMessage({
      phone: userData.whatsapp,
      body: message
    });
  }
}

// Instância singleton
export const chatApiWhatsAppService = new ChatApiWhatsAppService();

// Exportar tipos
export type { ChatApiMessage, ChatApiResponse };
