import { useState } from 'react';
import { whatsappService } from '../services/whatsappService';

interface WhatsAppHook {
  loading: boolean;
  error: string | null;
  sendRegistrationConfirmation: (userData: {
    name: string;
    email: string;
    whatsapp: string;
    confirmationCode: string;
  }) => Promise<boolean>;
  sendNumbersAssigned: (userData: {
    name: string;
    whatsapp: string;
    numbers: number[];
  }) => Promise<boolean>;
  sendExtraNumbersApproved: (userData: {
    name: string;
    whatsapp: string;
    numbers: number[];
    amount: number;
  }) => Promise<boolean>;
  sendNewRaffleNotification: (userData: {
    name: string;
    whatsapp: string;
    raffleTitle: string;
    prize: string;
    startDate: string;
    endDate: string;
  }) => Promise<boolean>;
  sendWinnerAnnouncement: (userData: {
    name: string;
    whatsapp: string;
    winningNumber: number;
    prize: string;
    isWinner: boolean;
  }) => Promise<boolean>;
  sendBulkNotification: (userDataList: any[], type: string, raffleData?: any) => Promise<any[]>;
  sendWhatsAppMessage: (to: string, message: string) => Promise<boolean>;
}

export const useWhatsApp = (): WhatsAppHook => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWhatsAppCall = async (callback: () => Promise<{ success: boolean; error?: string }>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await callback();
      if (!result.success) {
        setError(result.error || 'Falha ao enviar mensagem');
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendRegistrationConfirmation = async (userData: {
    name: string;
    email: string;
    whatsapp: string;
    confirmationCode: string;
  }) => {
    return handleWhatsAppCall(() =>
      whatsappService.sendRegistrationConfirmation(userData)
    );
  };

  const sendNumbersAssigned = async (userData: {
    name: string;
    whatsapp: string;
    numbers: number[];
  }) => {
    return handleWhatsAppCall(() =>
      whatsappService.sendNumbersAssigned(userData)
    );
  };

  const sendExtraNumbersApproved = async (userData: {
    name: string;
    whatsapp: string;
    numbers: number[];
    amount: number;
  }) => {
    return handleWhatsAppCall(() =>
      whatsappService.sendExtraNumbersApproved(userData)
    );
  };

  const sendNewRaffleNotification = async (userData: {
    name: string;
    whatsapp: string;
    raffleTitle: string;
    prize: string;
    startDate: string;
    endDate: string;
  }) => {
    return handleWhatsAppCall(() =>
      whatsappService.sendNewRaffleNotification(userData)
    );
  };

  const sendWinnerAnnouncement = async (userData: {
    name: string;
    whatsapp: string;
    winningNumber: number;
    prize: string;
    isWinner: boolean;
  }) => {
    return handleWhatsAppCall(() =>
      whatsappService.sendWinnerAnnouncement(userData)
    );
  };

  const sendBulkNotification = async (userDataList: any[], type: string, raffleData?: any) => {
    setLoading(true);
    setError(null);

    try {
      const results = await whatsappService.sendBulkNotification(userDataList, type, raffleData);
      return results;
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar notificações em massa');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    sendRegistrationConfirmation,
    sendNumbersAssigned,
    sendExtraNumbersApproved,
    sendNewRaffleNotification,
    sendWinnerAnnouncement,
    sendBulkNotification,
    sendWhatsAppMessage: async (to: string, message: string) => {
      return handleWhatsAppCall(() =>
        whatsappService.sendMessage({ to, message, type: 'custom' as any })
      );
    }
  };
};
