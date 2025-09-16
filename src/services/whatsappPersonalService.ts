/**
 * WhatsApp Personal Service
 * Usa seu número pessoal via WhatsApp Web
 * Funciona sem APIs pagas
 */

interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text';
}

interface WhatsAppResponse {
  message_id: string;
  to: string;
  from: string;
  status: string;
}

class WhatsAppPersonalService {
  private fromNumber: string;

  constructor() {
    this.fromNumber = import.meta.env.VITE_WHATSAPP_PERSONAL_NUMBER || '+5533999030124';
  }

  /**
   * Simula envio via WhatsApp pessoal
   * Em produção, isso seria integrado com WhatsApp Web API
   */
  async sendMessage(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    console.log('📱 Simulando envio via WhatsApp Pessoal:', {
      to: data.to,
      message: data.message,
      from: this.fromNumber
    });

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Em produção real, aqui seria:
    // 1. Conectar com WhatsApp Web
    // 2. Enviar mensagem via puppeteer/playwright
    // 3. Retornar resultado real

    const mockResponse: WhatsAppResponse = {
      message_id: `whatsapp_personal_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      to: data.to,
      from: this.fromNumber,
      status: 'delivered'
    };

    console.log('✅ Mensagem simulada enviada via WhatsApp Pessoal:', mockResponse);
    return mockResponse;
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
}

// Instância singleton
export const whatsappPersonalService = new WhatsAppPersonalService();

// Exportar tipos
export type { WhatsAppMessage, WhatsAppResponse };
