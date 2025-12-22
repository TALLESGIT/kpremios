// Configuração do Twilio
const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
const whatsappFrom = import.meta.env.VITE_TWILIO_WHATSAPP_FROM; // Número do WhatsApp Business

// URL da API do Twilio
const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

export interface WhatsAppMessage {
  to: string;
  message: string;
  type: 'registration' | 'numbers_assigned' | 'extra_numbers_approved' | 'new_raffle' | 'winner_announcement';
}

class WhatsAppService {
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');

    // Adiciona o código do país se não tiver
    if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
      return `whatsapp:+${cleanPhone}`;
    } else if (cleanPhone.length === 11) {
      return `whatsapp:+55${cleanPhone}`;
    } else if (cleanPhone.length === 10) {
      return `whatsapp:+55${cleanPhone}`;
    }

    return `whatsapp:+${cleanPhone}`;
  }

  private getMessageTemplate(type: string, data: any): string {
    const baseUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';

    switch (type) {
      case 'registration':
        return `🎉 *Bem-vindo ao ZK Oficial!*

Olá ${data.name}! 

Seu código de confirmação é: *${data.confirmationCode}*

Acesse o link para confirmar seu cadastro:
${baseUrl}/confirm?code=${data.confirmationCode}&email=${encodeURIComponent(data.email)}

Ou acesse diretamente: ${baseUrl}

Boa sorte! 🍀`;

      case 'numbers_assigned':
        return `🎯 *Seus números foram confirmados!*

Olá ${data.name}!

✅ Números atribuídos:
${(data.numbers || []).map((num: number) => `• Número ${num}`).join('\n')}

📱 Acompanhe seus números em: ${baseUrl}/my-numbers

Boa sorte no sorteio! 🍀`;

      case 'extra_numbers_approved':
        return `🎊 *Seus números extras foram aprovados!*

Olá ${data.name}!

✅ Números extras aprovados:
${(data.numbers || []).map((num: number) => `• Número ${num}`).join('\n')}

💰 Valor pago: R$ ${(data.amount || 0).toFixed(2)}

📱 Veja todos seus números em: ${baseUrl}/my-numbers

Boa sorte! 🍀`;

      case 'new_raffle':
        return `🎉 *NOVO SORTEIO DISPONÍVEL!*

Olá ${data.name}!

🏆 *${data.raffleTitle}*
🎁 Prêmio: ${data.prize}

📅 Período: ${new Date(data.startDate).toLocaleDateString('pt-BR')} a ${new Date(data.endDate).toLocaleDateString('pt-BR')}

🔗 Participe agora: ${baseUrl}

Não perca essa chance! 🍀`;

      case 'winner_announcement':
        return `🏆 *RESULTADO DO SORTEIO!*

Olá ${data.name}!

🎯 Número sorteado: *${data.winningNumber}*
🏆 Prêmio: ${data.prize}

${data.isWinner ?
            `🎉 *PARABÉNS! VOCÊ GANHOU!* 🎉\nEntre em contato conosco para receber seu prêmio!` :
            `Que pena! Não foi desta vez, mas continue participando dos nossos sorteios!`
          }

🔗 Veja o resultado completo: ${baseUrl}/winners

Obrigado por participar! 🍀`;

      default:
        return `Olá ${data.name}! Mensagem da ZK Oficial.`;
    }
  }

  async sendMessage(messageData: WhatsAppMessage): Promise<{ success: boolean; error?: string; messageSid?: string }> {
    try {
      if (!accountSid || !authToken || !whatsappFrom) {
        return { success: false, error: 'WhatsApp service not configured' };
      }

      const formattedPhone = this.formatPhoneNumber(messageData.to);
      const messageBody = this.getMessageTemplate(messageData.type, messageData);

      // Criar dados para enviar via fetch
      const formData = new URLSearchParams();
      formData.append('From', whatsappFrom);
      formData.append('To', formattedPhone);
      formData.append('Body', messageBody);

      // Fazer requisição para API do Twilio
      const response = await fetch(twilioApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageSid: result.sid
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to send message'
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }

  // Métodos específicos para cada tipo de notificação
  async sendRegistrationConfirmation(userData: {
    name: string;
    email: string;
    whatsapp: string;
    confirmationCode: string;
  }) {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'registration'
    });
  }

  async sendNumbersAssigned(userData: {
    name: string;
    whatsapp: string;
    numbers: number[];
  }) {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'numbers_assigned'
    });
  }

  async sendExtraNumbersApproved(userData: {
    name: string;
    whatsapp: string;
    numbers: number[];
    amount: number;
  }) {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'extra_numbers_approved'
    });
  }

  async sendNewRaffleNotification(userData: {
    name: string;
    whatsapp: string;
    raffleTitle: string;
    prize: string;
    startDate: string;
    endDate: string;
  }) {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'new_raffle'
    });
  }

  async sendWinnerAnnouncement(userData: {
    name: string;
    whatsapp: string;
    winningNumber: number;
    prize: string;
    isWinner: boolean;
  }) {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'winner_announcement'
    });
  }

  // Método para enviar para múltiplos usuários
  async sendBulkNotification(userDataList: any[], type: string) {
    const results = [];

    for (const userData of userDataList) {
      try {
        const result = await this.sendMessage({
          to: userData.whatsapp,
          message: '',
          type: type as any
        });
        results.push({ user: userData.email, success: result.success, error: result.error });

        // Pequena pausa entre mensagens para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({ user: userData.email, success: false, error: 'Failed to send' });
      }
    }

    return results;
  }
}

export const whatsappService = new WhatsAppService();
