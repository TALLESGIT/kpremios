/**
 * Serviço de WhatsApp Híbrido
 * Usa Evolution API como principal (gratuito)
 * Twilio como fallback opcional (quando configurado)
 * 
 * @author ZK Premios
 * @version 2.0.0
 */

import { evolutionApiService } from './evolutionApiService';

// Configuração do Twilio (opcional - apenas como fallback)
const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
const whatsappFrom = import.meta.env.VITE_TWILIO_WHATSAPP_FROM;

// URL da API do Twilio
const twilioApiUrl = accountSid ? `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json` : null;

// Configuração do serviço principal
export const USE_EVOLUTION_API = String(import.meta.env.VITE_EVOLUTION_API_ENABLED).toLowerCase() === 'true';
export const USE_TWILIO_FALLBACK = String(import.meta.env.VITE_TWILIO_FALLBACK_ENABLED).toLowerCase() === 'true';

// Exportar status para debug (mascarado se necessário)
export const TWILIO_ACCOUNT_SID_CONFIGURED = !!accountSid;
export const EVOLUTION_API_KEY_CONFIGURED = !!import.meta.env.VITE_EVOLUTION_API_KEY;
export const EVOLUTION_API_URL_CONFIGURED = !!import.meta.env.VITE_EVOLUTION_API_URL;

export interface WhatsAppMessage {
  to: string;
  message: string;
  type: 'registration' | 'numbers_assigned' | 'extra_numbers_approved' | 'new_raffle' | 'winner_announcement' | 'pool_winner';
  // Campos adicionais para templates
  name?: string;
  email?: string;
  confirmationCode?: string;
  numbers?: number[];
  amount?: number;
  raffleTitle?: string;
  prize?: string;
  startDate?: string;
  endDate?: string;
  winningNumber?: number;
  isWinner?: boolean;
  matchTitle?: string;
  predictedScore?: string;
  realScore?: string;
  totalAmount?: string;
  winnersCount?: string;
  [key: string]: any;
}

class WhatsAppService {
  private formatPhoneNumberForTwilio(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');

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
    const baseUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

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

      case 'pool_winner':
        return `🏆 *PARABÉNS ${data.name}!*

🎉 *VOCÊ GANHOU O BOLÃO!* 🎉

⚽ *${data.matchTitle}*

📊 Sua aposta: *${data.predictedScore}*
⚽ Resultado: *${data.realScore}*

💰 Prêmio: *R$ ${parseFloat(data.prize || '0').toFixed(2)}*

🎯 Você dividiu o prêmio total de R$ ${parseFloat(data.totalAmount || '0').toFixed(2)} com ${data.winnersCount} ganhador(es)!

📱 Entre em contato conosco para receber seu prêmio!

🔗 Veja os ganhadores: ${baseUrl}/winners

Parabéns! 🎊`;

      default:
        return `Olá ${data.name}! Mensagem da ZK Oficial.`;
    }
  }

  /**
   * Envia mensagem via Twilio (fallback)
   */
  private async sendViaTwilio(messageData: WhatsAppMessage): Promise<{ success: boolean; error?: string; messageSid?: string }> {
    try {
      if (!accountSid || !authToken || !whatsappFrom || !twilioApiUrl) {
        return { success: false, error: 'Twilio não configurado' };
      }

      const formattedPhone = this.formatPhoneNumberForTwilio(messageData.to);
      const messageBody = this.getMessageTemplate(messageData.type, messageData);

      const formData = new URLSearchParams();
      formData.append('From', whatsappFrom);
      formData.append('To', formattedPhone);
      formData.append('Body', messageBody);

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
          error: result.message || 'Falha ao enviar mensagem via Twilio'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao enviar via Twilio'
      };
    }
  }

  /**
   * Envia mensagem - Tenta Evolution API primeiro, fallback para Twilio se configurado
   */
  async sendMessage(messageData: WhatsAppMessage): Promise<{ success: boolean; error?: string; messageSid?: string }> {
    // Se Evolution API estiver habilitada, usar como principal
    if (USE_EVOLUTION_API) {
      try {
        const result = await evolutionApiService.sendMessage(messageData);

        if (result.success) {
          return {
            success: true,
            messageSid: result.messageId
          };
        }

        // Se Evolution API falhar e Twilio estiver configurado como fallback
        if (!result.success && USE_TWILIO_FALLBACK && accountSid && authToken) {
          console.warn('Evolution API falhou, tentando Twilio como fallback:', result.error);
          return await this.sendViaTwilio(messageData);
        }

        return {
          success: false,
          error: result.error || 'Falha ao enviar mensagem via Evolution API'
        };
      } catch (error: any) {
        console.error('Erro ao enviar via Evolution API:', error);

        // Fallback para Twilio se configurado
        if (USE_TWILIO_FALLBACK && accountSid && authToken) {
          console.warn('Tentando Twilio como fallback após erro na Evolution API');
          return await this.sendViaTwilio(messageData);
        }

        return {
          success: false,
          error: error.message || 'Erro ao enviar mensagem'
        };
      }
    }

    // Se Evolution API não estiver habilitada, usar Twilio (se configurado)
    if (accountSid && authToken) {
      return await this.sendViaTwilio(messageData);
    }

    return {
      success: false,
      error: 'Nenhum serviço de WhatsApp configurado. Configure Evolution API ou Twilio.'
    };
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
      type: 'registration',
      name: userData.name,
      email: userData.email,
      confirmationCode: userData.confirmationCode
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
      type: 'numbers_assigned',
      name: userData.name,
      numbers: userData.numbers
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
      type: 'extra_numbers_approved',
      name: userData.name,
      numbers: userData.numbers,
      amount: userData.amount
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
      type: 'new_raffle',
      name: userData.name,
      raffleTitle: userData.raffleTitle,
      prize: userData.prize,
      startDate: userData.startDate,
      endDate: userData.endDate
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
      type: 'winner_announcement',
      name: userData.name,
      winningNumber: userData.winningNumber,
      prize: userData.prize,
      isWinner: userData.isWinner
    });
  }

  async sendVipApprovedNotification(userData: {
    name: string;
    whatsapp: string;
  }) {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'vip_approved' as any,
      name: userData.name
    });
  }

  async sendPoolBetApprovedNotification(userData: {
    name: string;
    whatsapp: string;
    matchTitle: string;
    predictedScore: string;
    amount: number;
  }) {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'pool_bet_approved' as any,
      name: userData.name,
      matchTitle: userData.matchTitle,
      predictedScore: userData.predictedScore,
      amount: userData.amount
    });
  }

  async sendExtraNumbersRejected(userData: {
    name: string;
    whatsapp: string;
    amount: number;
    reason?: string;
  }) {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'extra_numbers_rejected' as any,
      name: userData.name,
      amount: userData.amount,
      reason: userData.reason
    });
  }

  async sendPoolWinnerNotification(userData: {
    name: string;
    whatsapp: string;
    matchTitle: string;
    predictedScore: string;
    realScore: string;
    prize: string;
    totalAmount: string;
    winnersCount: string;
  }) {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'pool_winner',
      name: userData.name,
      matchTitle: userData.matchTitle,
      predictedScore: userData.predictedScore,
      realScore: userData.realScore,
      prize: userData.prize,
      totalAmount: userData.totalAmount,
      winnersCount: userData.winnersCount
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
          type: type as any,
          ...userData
        });
        results.push({ user: userData.email || userData.name, success: result.success, error: result.error });

        // Pequena pausa entre mensagens para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({ user: userData.email || userData.name, success: false, error: 'Failed to send' });
      }
    }

    return results;
  }

  /**
   * Envia mídia via WhatsApp (Evolution API apenas)
   */
  async sendMedia(data: {
    to: string;
    media: string;
    mediatype: 'image' | 'video' | 'audio' | 'document';
    caption?: string;
    fileName?: string;
  }) {
    if (USE_EVOLUTION_API) {
      return await evolutionApiService.sendMedia(data);
    }
    return { success: false, error: 'Mídia só é suportada via Evolution API' };
  }
}

export const whatsappService = new WhatsAppService();
