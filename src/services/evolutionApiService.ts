/**
 * Serviço de integração com Evolution API
 * Alternativa gratuita ao Twilio para envio de mensagens WhatsApp
 * 
 * Documentação: https://doc.evolution-api.com
 */

export interface EvolutionMessage {
  to: string;
  message: string;
  type: 'registration' | 'numbers_assigned' | 'extra_numbers_approved' | 'new_raffle' | 'winner_announcement' | 'pool_winner' | 'vip_approved' | 'pool_bet_approved' | 'extra_numbers_rejected';
  name?: string;
  matchTitle?: string;
  predictedScore?: string;
  realScore?: string;
  prize?: string;
  totalAmount?: string;
  winnersCount?: string;
  [key: string]: any;
}

export interface EvolutionResponse {
  success: boolean;
  error?: string;
  messageId?: string;
  instance?: {
    instanceName: string;
    status: 'open' | 'close' | 'connecting';
  };
}

class EvolutionApiService {
  private apiUrl: string;
  private apiKey: string;
  private instanceName: string;
  private enabled: boolean;

  constructor() {
    this.apiUrl = import.meta.env.VITE_EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || '';
    this.instanceName = import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'ZkOficial';
    this.enabled = import.meta.env.VITE_EVOLUTION_API_ENABLED === 'true' && !!this.apiKey;
  }

  /**
   * Formata número de telefone para o formato esperado pela Evolution API
   * Remove caracteres não numéricos e adiciona código do país se necessário
   */
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');

    // Adiciona código do país se não tiver
    if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
      return cleanPhone;
    } else if (cleanPhone.length === 11) {
      return `55${cleanPhone}`;
    } else if (cleanPhone.length === 10) {
      return `55${cleanPhone}`;
    }

    return cleanPhone;
  }

  /**
   * Gera template de mensagem baseado no tipo
   */
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

      case 'vip_approved':
        return `💎 *VIP ATIVADO!*

Olá ${data.name}!

🎉 Parabéns! Sua assinatura VIP na ZK Oficial foi aprovada e já está ativa!

✨ *Seus novos benefícios:*
• Mensagens destacadas no chat
• Áudio liberado nas lives
• Slow mode reduzido
• Cores personalizadas
• Acesso ao grupo exclusivo

🚀 Aproveite agora: ${baseUrl}

Bem-vindo ao clube VIP! 💎`;

      case 'pool_bet_approved':
        return `⚽ *APOSTA CONFIRMADA!*

Olá ${data.name}!

✅ Sua aposta no bolão foi confirmada com sucesso!

⚽ *Jogo:* ${data.matchTitle}
📊 *Seu palpite:* ${data.predictedScore}

💰 Valor da aposta: R$ ${parseFloat(data.amount || '0').toFixed(2)}

Boa sorte no bolão! ⚽🍀`;

      case 'extra_numbers_rejected':
        return `❌ *SOLICITAÇÃO NÃO APROVADA*

Olá ${data.name}!

Ref: Solicitação de números extras (R$ ${parseFloat(data.amount || '0').toFixed(2)})

Infelizmente não conseguimos validar seu pagamento. ${data.reason ? `\n\n📝 *Motivo:* ${data.reason}` : ''}

📱 Por favor, verifique os dados e tente novamente ou entre em contato com nosso suporte.

Sentimos muito pelo inconveniente. 🙏`;

      default:
        return `Olá ${data.name}! Mensagem da ZK Oficial.`;
    }
  }

  /**
   * Conecta a instância ao WhatsApp (gera QR Code se necessário)
   */
  async connectInstance(): Promise<{ success: boolean; qrcode?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Evolution API não está habilitada' };
    }

    try {
      // Tenta o endpoint de conexão
      const response = await fetch(
        `${this.apiUrl}/instance/connect/${this.instanceName}`,
        {
          method: 'GET',
          headers: {
            'apikey': this.apiKey
          }
        }
      );

      const data = await response.json();
      
      // Se retornar QR Code, a instância precisa ser escaneada
      if (data.qrcode?.base64 || data.qrcode?.code || data.base64) {
        return {
          success: true,
          qrcode: data.qrcode?.base64 || data.qrcode?.code || data.base64
        };
      }

      // Se já estiver conectada
      if (data.instance?.status === 'open' || data.instance?.state === 'open' || response.ok) {
        return { success: true };
      }

      // Se houver erro na resposta
      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `Erro ao conectar: ${response.status}`
        };
      }

      return {
        success: false,
        error: `Status: ${data.instance?.status || data.instance?.state || 'desconhecido'}`
      };
    } catch (error: any) {
      console.error('Erro ao conectar instância:', error);
      return {
        success: false,
        error: error.message || 'Erro ao conectar instância. Verifique se a Evolution API está rodando.'
      };
    }
  }

  /**
   * Verifica se a instância está conectada e pronta
   */
  async checkInstanceStatus(): Promise<{ connected: boolean; status?: string }> {
    if (!this.enabled) {
      return { connected: false };
    }

    try {
      // Primeiro tenta o endpoint v2 específico da instância
      const connectionResponse = await fetch(
        `${this.apiUrl}/instance/connectionState/${this.instanceName}`,
        {
          method: 'GET',
          headers: {
            'apikey': this.apiKey
          }
        }
      );

      if (connectionResponse.ok) {
        const connectionData = await connectionResponse.json();
        const state = connectionData.instance?.state || connectionData.state;
        return {
          connected: state === 'open' || state === 'connected',
          status: state
        };
      }

      // Fallback para o endpoint de listagem
      const response = await fetch(
        `${this.apiUrl}/instance/fetchInstances`,
        {
          method: 'GET',
          headers: {
            'apikey': this.apiKey
          }
        }
      );

      if (!response.ok) {
        return { connected: false };
      }

      const data = await response.json();
      // Handle array or single instance object
      const instances = Array.isArray(data) ? data : (data.instances || []);
      const instance = instances.find((inst: any) =>
        (inst.instance?.instanceName === this.instanceName) || (inst.name === this.instanceName)
      );

      if (!instance) {
        return { connected: false };
      }

      const status = instance.instance?.status || instance.status || instance.instance?.state || instance.state;
      return {
        connected: status === 'open' || status === 'connected',
        status: status
      };
    } catch (error) {
      console.error('Erro ao verificar status da instância:', error);
      return { connected: false };
    }
  }

  /**
   * Envia mensagem de texto via Evolution API
   */
  async sendMessage(messageData: EvolutionMessage): Promise<EvolutionResponse> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Evolution API não está habilitada'
      };
    }

    try {
      // Verificar se a instância está conectada
      const status = await this.checkInstanceStatus();
      if (!status.connected) {
        // Se estiver "connecting", tentar conectar
        if (status.status === 'connecting' || status.status === 'close') {
          const connectResult = await this.connectInstance();
          if (!connectResult.success && connectResult.qrcode) {
            return {
              success: false,
              error: `Instância precisa ser conectada. Escaneie o QR Code no servidor da Evolution API. Status: ${status.status}`
            };
          }
          // Aguardar um pouco e verificar novamente
          await new Promise(resolve => setTimeout(resolve, 2000));
          const newStatus = await this.checkInstanceStatus();
          if (!newStatus.connected) {
            return {
              success: false,
              error: `Instância não conectada. Status: ${newStatus.status || 'desconhecido'}. Verifique se escaneou o QR Code.`
            };
          }
        } else {
          return {
            success: false,
            error: `Instância não conectada. Status: ${status.status || 'desconhecido'}. Use o endpoint /instance/connect/${this.instanceName} para conectar.`
          };
        }
      }

      const formattedPhone = this.formatPhoneNumber(messageData.to);
      const messageBody = this.getMessageTemplate(messageData.type, messageData);

      const response = await fetch(
        `${this.apiUrl}/message/sendText/${this.instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: messageBody
          })
        }
      );

      const result = await response.json();

      if (response.ok && (result.key || result.messageId)) {
        return {
          success: true,
          messageId: result.key?.id || result.messageId
        };
      } else {
        return {
          success: false,
          error: result.message || result.error || 'Falha ao enviar mensagem'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao enviar mensagem via Evolution API'
      };
    }
  }

  /**
   * Envia mídia (imagem, áudio, vídeo, documento) via Evolution API
   */
  async sendMedia(data: {
    to: string;
    media: string;
    mediatype: 'image' | 'video' | 'audio' | 'document';
    caption?: string;
    fileName?: string;
  }): Promise<EvolutionResponse> {
    if (!this.enabled) {
      return { success: false, error: 'Evolution API não está habilitada' };
    }

    try {
      const status = await this.checkInstanceStatus();
      if (!status.connected) {
        // Se estiver "connecting", tentar conectar
        if (status.status === 'connecting' || status.status === 'close') {
          const connectResult = await this.connectInstance();
          if (!connectResult.success && connectResult.qrcode) {
            return {
              success: false,
              error: `Instância precisa ser conectada. Escaneie o QR Code no servidor da Evolution API. Status: ${status.status}`
            };
          }
          // Aguardar um pouco e verificar novamente
          await new Promise(resolve => setTimeout(resolve, 2000));
          const newStatus = await this.checkInstanceStatus();
          if (!newStatus.connected) {
            return {
              success: false,
              error: `Instância não conectada. Status: ${newStatus.status || 'desconhecido'}. Verifique se escaneou o QR Code.`
            };
          }
        } else {
          return {
            success: false,
            error: `Instância não conectada. Status: ${status.status || 'desconhecido'}. Acesse o Manager da Evolution API (http://seu-servidor:3000) ou use o endpoint /instance/connect/${this.instanceName} para conectar.`
          };
        }
      }

      const formattedPhone = this.formatPhoneNumber(data.to);

      const response = await fetch(
        `${this.apiUrl}/message/sendMedia/${this.instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          },
          body: JSON.stringify({
            number: formattedPhone,
            media: data.media,
            mediatype: data.mediatype,
            caption: data.caption,
            fileName: data.fileName
          })
        }
      );

      const result = await response.json();

      if (response.ok && (result.key || result.messageId)) {
        return {
          success: true,
          messageId: result.key?.id || result.messageId
        };
      } else {
        return {
          success: false,
          error: result.message || result.error || 'Falha ao enviar mídia'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao enviar mídia via Evolution API'
      };
    }
  }

  /**
   * Envia mensagem de confirmação de registro
   */
  async sendRegistrationConfirmation(userData: {
    name: string;
    email: string;
    whatsapp: string;
    confirmationCode: string;
  }): Promise<EvolutionResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'registration',
      name: userData.name,
      confirmationCode: userData.confirmationCode,
      email: userData.email
    });
  }

  /**
   * Envia notificação de números atribuídos
   */
  async sendNumbersAssigned(userData: {
    name: string;
    whatsapp: string;
    numbers: number[];
  }): Promise<EvolutionResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'numbers_assigned',
      name: userData.name,
      numbers: userData.numbers
    });
  }

  /**
   * Envia notificação de números extras aprovados
   */
  async sendExtraNumbersApproved(userData: {
    name: string;
    whatsapp: string;
    numbers: number[];
    amount: number;
  }): Promise<EvolutionResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'extra_numbers_approved',
      name: userData.name,
      numbers: userData.numbers,
      amount: userData.amount
    });
  }

  /**
   * Envia notificação de solicitação rejeitada
   */
  async sendExtraNumbersRejected(userData: {
    name: string;
    whatsapp: string;
    amount: number;
    reason?: string;
  }): Promise<EvolutionResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'extra_numbers_rejected',
      name: userData.name,
      amount: userData.amount,
      reason: userData.reason
    });
  }

  /**
   * Envia notificação de novo sorteio
   */
  async sendNewRaffleNotification(userData: {
    name: string;
    whatsapp: string;
    raffleTitle: string;
    prize: string;
    startDate: string;
    endDate: string;
  }): Promise<EvolutionResponse> {
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

  /**
   * Envia anúncio de ganhador
   */
  async sendWinnerAnnouncement(userData: {
    name: string;
    whatsapp: string;
    winningNumber: number;
    prize: string;
    isWinner: boolean;
  }): Promise<EvolutionResponse> {
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

  /**
   * Envia notificação de aprovação VIP
   */
  async sendVipApprovedNotification(userData: {
    name: string;
    whatsapp: string;
  }): Promise<EvolutionResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'vip_approved',
      name: userData.name
    });
  }

  /**
   * Envia notificação de aposta aprovada
   */
  async sendPoolBetApprovedNotification(userData: {
    name: string;
    whatsapp: string;
    matchTitle: string;
    predictedScore: string;
    amount: number;
  }): Promise<EvolutionResponse> {
    return this.sendMessage({
      to: userData.whatsapp,
      message: '',
      type: 'pool_bet_approved',
      name: userData.name,
      matchTitle: userData.matchTitle,
      predictedScore: userData.predictedScore,
      amount: userData.amount
    });
  }

  /**
   * Envia notificação de ganhador do bolão
   */
  async sendPoolWinnerNotification(userData: {
    name: string;
    whatsapp: string;
    matchTitle: string;
    predictedScore: string;
    realScore: string;
    prize: string;
    totalAmount: string;
    winnersCount: string;
  }): Promise<EvolutionResponse> {
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

  /**
   * Envia notificações em massa
   */
  async sendBulkNotification(userDataList: any[], type: string): Promise<Array<{ user: string; success: boolean; error?: string }>> {
    const results = [];

    for (const userData of userDataList) {
      try {
        const result = await this.sendMessage({
          to: userData.whatsapp,
          message: '',
          type: type as any,
          ...userData
        });

        results.push({
          user: userData.email || userData.name,
          success: result.success,
          error: result.error
        });

        // Pequena pausa entre mensagens para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.push({
          user: userData.email || userData.name,
          success: false,
          error: error.message || 'Falha ao enviar'
        });
      }
    }

    return results;
  }
}

export const evolutionApiService = new EvolutionApiService();

