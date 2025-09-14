/**
 * Hook personalizado para usar o Vonage WhatsApp Service
 * Substitui o useWhatsApp para usar Vonage em vez de Twilio
 */

import { useState } from 'react';
import { vonageWhatsAppService, VonageResponse } from '../services/vonageService';

interface UseVonageReturn {
  sendMessage: (to: string, message: string) => Promise<VonageResponse>;
  sendRegistrationConfirmation: (userData: { name: string; whatsapp: string; confirmationCode: string }) => Promise<VonageResponse>;
  sendNumbersAssigned: (userData: { name: string; whatsapp: string; numbers: number[] }) => Promise<VonageResponse>;
  sendExtraNumbersApproved: (userData: { name: string; whatsapp: string; extraNumbers: number[] }) => Promise<VonageResponse>;
  sendNewRaffleNotification: (userData: { name: string; whatsapp: string; raffleName: string; appUrl: string }) => Promise<VonageResponse>;
  sendWinnerAnnouncement: (userData: { name: string; whatsapp: string; raffleName: string; prize: string }) => Promise<VonageResponse>;
  checkMessageStatus: (messageUuid: string) => Promise<any>;
  isLoading: boolean;
  error: string | null;
  lastResponse: VonageResponse | null;
}

export const useVonage = (): UseVonageReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<VonageResponse | null>(null);

  const handleVonageCall = async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🚀 Executando ${operationName} via Vonage...`);
      const result = await operation();
      console.log(`✅ ${operationName} executado com sucesso via Vonage`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`❌ Erro em ${operationName} via Vonage:`, errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (to: string, message: string): Promise<VonageResponse> => {
    return handleVonageCall(
      () => vonageWhatsAppService.sendMessage({ to, message }),
      'envio de mensagem'
    );
  };

  const sendRegistrationConfirmation = async (userData: { name: string; whatsapp: string; confirmationCode: string }): Promise<VonageResponse> => {
    const result = await handleVonageCall(
      () => vonageWhatsAppService.sendRegistrationConfirmation(userData),
      'confirmação de cadastro'
    );
    setLastResponse(result);
    return result;
  };

  const sendNumbersAssigned = async (userData: { name: string; whatsapp: string; numbers: number[] }): Promise<VonageResponse> => {
    const result = await handleVonageCall(
      () => vonageWhatsAppService.sendNumbersAssigned(userData),
      'envio de números selecionados'
    );
    setLastResponse(result);
    return result;
  };

  const sendExtraNumbersApproved = async (userData: { name: string; whatsapp: string; extraNumbers: number[] }): Promise<VonageResponse> => {
    const result = await handleVonageCall(
      () => vonageWhatsAppService.sendExtraNumbersApproved(userData),
      'aprovação de números extras'
    );
    setLastResponse(result);
    return result;
  };

  const sendNewRaffleNotification = async (userData: { name: string; whatsapp: string; raffleName: string; appUrl: string }): Promise<VonageResponse> => {
    const result = await handleVonageCall(
      () => vonageWhatsAppService.sendNewRaffleNotification(userData),
      'notificação de novo sorteio'
    );
    setLastResponse(result);
    return result;
  };

  const sendWinnerAnnouncement = async (userData: { name: string; whatsapp: string; raffleName: string; prize: string }): Promise<VonageResponse> => {
    const result = await handleVonageCall(
      () => vonageWhatsAppService.sendWinnerAnnouncement(userData),
      'anúncio de ganhador'
    );
    setLastResponse(result);
    return result;
  };

  const checkMessageStatus = async (messageUuid: string): Promise<any> => {
    return handleVonageCall(
      () => vonageWhatsAppService.checkMessageStatus(messageUuid),
      'verificação de status da mensagem'
    );
  };

  return {
    sendMessage,
    sendRegistrationConfirmation,
    sendNumbersAssigned,
    sendExtraNumbersApproved,
    sendNewRaffleNotification,
    sendWinnerAnnouncement,
    checkMessageStatus,
    isLoading,
    error,
    lastResponse
  };
};

export default useVonage;
