import { supabase } from '../lib/supabase';

export interface WhatsAppMessage {
  to: string;
  message: string;
  type: 'registration' | 'numbers_assigned' | 'extra_numbers_approved' | 'new_raffle' | 'test';
  data?: any;
}

export interface WhatsAppResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
}

class WhatsAppServiceEnhanced {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    this.authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    this.fromNumber = import.meta.env.VITE_TWILIO_WHATSAPP_FROM;

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');

    // Se não começar com 55 (Brasil), adiciona
    if (!cleaned.startsWith('55')) {
      return `whatsapp:+55${cleaned}`;
    }

    return `whatsapp:+${cleaned}`;
  }

  private getMessageTemplate(type: WhatsAppMessage['type'], data: any): string {
    const baseUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

    if (!data) {
      return `Olá! Mensagem da ZK Oficial. Houve um erro ao gerar o conteúdo da mensagem.`;
    }

    switch (type) {
      case 'registration':
        return `🎉 *Bem-vindo ao ZK Oficial!*

Olá ${data.name || 'usuário'}!

✅ Seu cadastro foi realizado com sucesso!

🔐 *Código de confirmação:* ${data.confirmationCode || 'N/A'}

📱 *Seu WhatsApp foi confirmado!*

🚀 Acesse o sistema: ${baseUrl}

Boa sorte nos sorteios! 🍀`;

      case 'numbers_assigned':
        const assignedNumbers = data.numbers || [];
        if (!Array.isArray(assignedNumbers)) {
          return `Olá ${data.name || 'usuário'}! Seus números foram confirmados, mas houve um erro ao listar.`;
        }
        return `🎯 *Seus números foram confirmados!*

Olá ${data.name || 'usuário'}!

✅ Números atribuídos:
${assignedNumbers.map((num: number) => `• Número ${num}`).join('\n')}

📱 Acompanhe seus números em: ${baseUrl}/my-numbers

Boa sorte no sorteio! 🍀`;

      case 'extra_numbers_approved':
        const extraNumbers = data.extraNumbers || [];
        if (!Array.isArray(extraNumbers)) {
          return `Olá ${data.name || 'usuário'}! Seus números extras foram aprovados, mas houve um erro ao listar.`;
        }
        return `🎉 *Números extras aprovados!*

Olá ${data.name || 'usuário'}!

✅ Números extras aprovados:
${extraNumbers.map((num: number) => `• Número ${num}`).join('\n')}

📱 Acompanhe todos os seus números em: ${baseUrl}/my-numbers

Boa sorte no sorteio! 🍀`;

      case 'new_raffle':
        return `🎊 *Novo sorteio disponível!*

Olá ${data.name || 'usuário'}!

🎯 *${data.raffleTitle || 'Novo Sorteio'}*

🏆 *Prêmio:* ${data.prize || 'Prêmio especial'}

📅 *Data do sorteio:* ${data.drawDate || 'Em breve'}

🔗 *Participe agora:* ${baseUrl}/raffles/${data.raffleId || ''}

Boa sorte! 🍀`;

      case 'test':
        return `🧪 *Teste do Sistema*

Olá ${data.name || 'usuário'}!

✅ Sistema WhatsApp funcionando perfeitamente!

📱 Esta é uma mensagem de teste da ZK Oficial.

🚀 Sistema operacional!`;

      default:
        return `Olá ${data.name || 'usuário'}! Mensagem da ZK Oficial.`;
    }
  }

  private async sendMessageWithRetry(messageData: WhatsAppMessage, maxRetries: number = 3): Promise<WhatsAppResponse> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`
            },
            body: new URLSearchParams({
              To: this.formatPhoneNumber(messageData.to),
              From: this.fromNumber,
              Body: this.getMessageTemplate(messageData.type, messageData.data)
            })
          }
        );

        const data = await response.json();

        if (response.ok) {
          return {
            success: true,
            messageSid: data.sid
          };
        } else {
          lastError = data.message || `HTTP ${response.status}`;
          if (attempt < maxRetries) {
            // Aguarda antes da próxima tentativa (backoff exponencial)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`
    };
  }

  async sendMessage(messageData: WhatsAppMessage): Promise<WhatsAppResponse> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return {
        success: false,
        error: 'Twilio configuration missing'
      };
    }

    if (!messageData.to) {
      return {
        success: false,
        error: 'Phone number is required'
      };
    }

    // Validação básica do número
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanedPhone = messageData.to.replace(/\D/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    try {
      const result = await this.sendMessageWithRetry(messageData);

      // Log da tentativa no banco de dados
      await this.logMessageAttempt(messageData, result);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async logMessageAttempt(messageData: WhatsAppMessage, result: WhatsAppResponse): Promise<void> {
    try {
      const logData = {
        phone_number: messageData.to,
        message_type: messageData.type,
        message_body: this.getMessageTemplate(messageData.type, messageData.data),
        status: result.success ? 'sent' : 'failed',
        message_sid: result.messageSid || null,
        error_message: result.error || null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notification_logs')
        .insert(logData);

      if (error) {
      }
    } catch (error) {
    }
  }

  // Métodos específicos para cada tipo de notificação
  async sendRegistrationConfirmation(userData: { whatsapp: string; name: string; confirmationCode: string }): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'registration',
      data: {
        name: userData.name,
        confirmationCode: userData.confirmationCode
      }
    });
  }

  async sendNumbersAssigned(userData: { whatsapp: string; name: string; numbers: number[] }): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'numbers_assigned',
      data: {
        name: userData.name,
        numbers: userData.numbers
      }
    });
  }

  async sendExtraNumbersApproved(userData: { whatsapp: string; name: string; extraNumbers: number[] }): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'extra_numbers_approved',
      data: {
        name: userData.name,
        extraNumbers: userData.extraNumbers
      }
    });
  }

  async sendNewRaffleNotification(userData: { whatsapp: string; name: string; raffleData: any }): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'new_raffle',
      data: {
        name: userData.name,
        ...userData.raffleData
      }
    });
  }

  async sendTestMessage(userData: { whatsapp: string; name: string }): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'test',
      data: {
        name: userData.name
      }
    });
  }

  // Método para envio em massa
  async sendBulkNotification(users: Array<{ whatsapp: string; name: string }>, type: WhatsAppMessage['type'], data: any): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Processa em lotes para evitar rate limiting
    const batchSize = 5;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const promises = batch.map(async (user) => {
        try {
          const result = await this.sendMessage({
            to: user.whatsapp,
            message: '',
            type,
            data: { ...data, name: user.name }
          });

          if (result.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`${user.name}: ${result.error}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`${user.name}: ${error}`);
        }
      });

      await Promise.all(promises);

      // Aguarda entre lotes para evitar rate limiting
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Método para verificar status de uma mensagem
  async getMessageStatus(messageSid: string): Promise<{ status: string; error?: string }> {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${messageSid}.json`,
        {
          headers: {
            'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        return { status: data.status };
      } else {
        return { status: 'error', error: data.message };
      }
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const whatsappServiceEnhanced = new WhatsAppServiceEnhanced();
