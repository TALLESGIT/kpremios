import { useState } from 'react';
import { whatsappBusinessService, type WhatsAppMessage, type WhatsAppResponse } from '../services/whatsappBusinessApi';

interface UseWhatsAppBusinessReturn {
  sendMessage: (data: WhatsAppMessage) => Promise<WhatsAppResponse>;
  sendRegistrationConfirmation: (userData: { name: string; whatsapp: string; confirmationCode: string }) => Promise<WhatsAppResponse>;
  sendNumbersAssigned: (userData: { name: string; whatsapp: string; numbers: number[] }) => Promise<WhatsAppResponse>;
  sendExtraNumbersApproved: (userData: { name: string; whatsapp: string; extraNumbers: number[] }) => Promise<WhatsAppResponse>;
  sendNewRaffleNotification: (userData: { name: string; whatsapp: string; raffleName: string; appUrl: string }) => Promise<WhatsAppResponse>;
  sendWinnerAnnouncement: (userData: { name: string; whatsapp: string; raffleName: string; prize: string }) => Promise<WhatsAppResponse>;
  loading: boolean;
  error: string | null;
  success: string | null;
}

export const useWhatsAppBusiness = (): UseWhatsAppBusinessReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleWhatsAppCall = async (operation: () => Promise<WhatsAppResponse>, operationName: string): Promise<WhatsAppResponse> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await operation();
      setSuccess(`${operationName} enviado com sucesso!`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao ${operationName.toLowerCase()}: ${errorMessage}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = (data: WhatsAppMessage): Promise<WhatsAppResponse> => {
    return handleWhatsAppCall(() => whatsappBusinessService.sendMessage(data), 'Mensagem');
  };

  const sendRegistrationConfirmation = (userData: { name: string; whatsapp: string; confirmationCode: string }): Promise<WhatsAppResponse> => {
    return handleWhatsAppCall(() => whatsappBusinessService.sendRegistrationConfirmation(userData), 'Confirmação de cadastro');
  };

  const sendNumbersAssigned = (userData: { name: string; whatsapp: string; numbers: number[] }): Promise<WhatsAppResponse> => {
    return handleWhatsAppCall(() => whatsappBusinessService.sendNumbersAssigned(userData), 'Números selecionados');
  };

  const sendExtraNumbersApproved = (userData: { name: string; whatsapp: string; extraNumbers: number[] }): Promise<WhatsAppResponse> => {
    return handleWhatsAppCall(() => whatsappBusinessService.sendExtraNumbersApproved(userData), 'Números extras aprovados');
  };

  const sendNewRaffleNotification = (userData: { name: string; whatsapp: string; raffleName: string; appUrl: string }): Promise<WhatsAppResponse> => {
    return handleWhatsAppCall(() => whatsappBusinessService.sendNewRaffleNotification(userData), 'Notificação de novo sorteio');
  };

  const sendWinnerAnnouncement = (userData: { name: string; whatsapp: string; raffleName: string; prize: string }): Promise<WhatsAppResponse> => {
    return handleWhatsAppCall(() => whatsappBusinessService.sendWinnerAnnouncement(userData), 'Anúncio de ganhador');
  };

  return {
    sendMessage,
    sendRegistrationConfirmation,
    sendNumbersAssigned,
    sendExtraNumbersApproved,
    sendNewRaffleNotification,
    sendWinnerAnnouncement,
    loading,
    error,
    success
  };
};
