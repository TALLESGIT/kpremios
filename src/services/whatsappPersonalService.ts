/**
 * WhatsApp Personal Service
 * Usa seu número pessoal via WhatsApp Web
 * Funciona sem APIs pagas
 */

interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  imageCaption?: string;
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
    return mockResponse;
  }

  /**
   * Envia imagem via WhatsApp pessoal
   */
  async sendImage(data: { to: string; imageUrl: string; caption?: string }): Promise<WhatsAppResponse> {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Em produção real, aqui seria:
    // 1. Conectar com WhatsApp Web
    // 2. Enviar imagem via puppeteer/playwright
    // 3. Retornar resultado real

    const mockResponse: WhatsAppResponse = {
      message_id: `whatsapp_image_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      to: data.to,
      from: this.fromNumber,
      status: 'delivered'
    };
    return mockResponse;
  }

  /**
   * Envia notificação de cadastro
   */
  async sendRegistrationConfirmation(userData: { name: string; whatsapp: string; confirmationCode: string }): Promise<WhatsAppResponse> {
    const message = `🎉 Olá ${userData.name}!

✅ Seu cadastro na ZK Oficial foi realizado com sucesso!

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
   * Envia notificação de solicitação rejeitada
   */
  async sendExtraNumbersRejected(userData: { name: string; whatsapp: string; amount: number; reason?: string }): Promise<WhatsAppResponse> {
    const reasonText = userData.reason ? `\n\n📝 Motivo: ${userData.reason}` : '';
    const message = `❌ Olá ${userData.name}!

😔 Sua solicitação de números extras no valor de R$ ${userData.amount.toFixed(2)} foi rejeitada.${reasonText}

📱 Você pode fazer uma nova solicitação a qualquer momento!

💬 Em caso de dúvidas, entre em contato conosco.

Obrigado pela compreensão! 🙏`;

    return this.sendMessage({
      to: userData.whatsapp,
      message: message,
      type: 'text'
    });
  }

  async sendWinnerNotification(data: {
    name: string;
    whatsapp: string;
    winningNumber: number;
    prize: string;
  }): Promise<WhatsAppResponse> {
    const message = `🎉 *PARABÉNS! VOCÊ GANHOU!* 🎉

Olá *${data.name}*! 🏆

🎯 *SEU NÚMERO FOI SORTEADO!*

*Número da Sorte:* #${data.winningNumber}
*Prêmio:* ${data.prize}

🎊 *Você é o ganhador oficial do sorteio!* 🎊

Entre em contato conosco imediatamente para receber seu prêmio!

📱 *WhatsApp:* +55 33 99903-0124
📧 *Email:* contato@zkoficial.com

*Parabéns e boa sorte!* 🍀✨`;

    return this.sendMessage({
      to: data.whatsapp,
      message: message,
      type: 'text'
    });
  }

  /**
   * Envia comprovante de pagamento para o admin
   */
  async sendPaymentProofToAdmin(data: {
    userName: string;
    userWhatsapp: string;
    userEmail: string;
    amount: number;
    quantity: number;
    proofUrl: string;
    requestId: string;
  }): Promise<WhatsAppResponse> {
    const adminNumber = '+5531972393341'; // Número do admin
    const caption = `📋 *NOVA SOLICITAÇÃO DE NÚMEROS EXTRAS*

👤 *Cliente:*
• Nome: ${data.userName}
• WhatsApp: ${data.userWhatsapp}
• Email: ${data.userEmail}

💰 *Pagamento:*
• Valor: R$ ${data.amount.toFixed(2)}
• Quantidade: ${data.quantity} números extras
• ID da Solicitação: ${data.requestId}

🔗 *Acesse o painel admin para aprovar/rejeitar*

⏰ *Data:* ${new Date().toLocaleString('pt-BR')}`;

    // Enviar imagem com legenda
    return this.sendImage({
      to: adminNumber,
      imageUrl: data.proofUrl,
      caption: caption
    });
  }
}

// Instância singleton
export const whatsappPersonalService = new WhatsAppPersonalService();

// Exportar tipos
export type { WhatsAppMessage, WhatsAppResponse };
