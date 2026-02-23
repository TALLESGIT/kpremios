import { useState, useEffect } from 'react';

interface UseLoadingOptions {
  initialLoading?: boolean;
  minLoadingTime?: number; // Tempo mínimo de carregamento em ms
  messages?: string[];
  messageInterval?: number; // Intervalo para trocar mensagens em ms
}

interface UseLoadingReturn {
  isLoading: boolean;
  currentMessage: string;
  progress: number;
  setLoading: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  setMessage: (message: string) => void;
}

export const useLoading = ({
  initialLoading = false,
  minLoadingTime = 1000,
  messages = ['Carregando...', 'Preparando dados...', 'Quase pronto...'],
  messageInterval = 2000
}: UseLoadingOptions = {}): UseLoadingReturn => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [currentMessage, setCurrentMessage] = useState(messages[0]);
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  // Rotacionar mensagens automaticamente
  useEffect(() => {
    if (!isLoading || messages.length <= 1) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const nextIndex = (prev + 1) % messages.length;
        setCurrentMessage(messages[nextIndex]);
        return nextIndex;
      });
    }, messageInterval);

    return () => clearInterval(interval);
  }, [isLoading, messages, messageInterval]);

  // Controlar tempo mínimo de carregamento
  const setLoading = (loading: boolean) => {
    if (loading) {
      setLoadingStartTime(Date.now());
      setIsLoading(true);
      setProgress(0);
      setMessageIndex(0);
      setCurrentMessage(messages[0]);
    } else {
      const now = Date.now();
      const elapsed = loadingStartTime ? now - loadingStartTime : 0;
      const remaining = Math.max(0, minLoadingTime - elapsed);

      if (remaining > 0) {
        // Aguardar tempo mínimo antes de parar o loading
        setTimeout(() => {
          setIsLoading(false);
          setProgress(100);
        }, remaining);
      } else {
        setIsLoading(false);
        setProgress(100);
      }
    }
  };

  const setMessage = (message: string) => {
    setCurrentMessage(message);
  };

  return {
    isLoading,
    currentMessage,
    progress,
    setLoading,
    setProgress,
    setMessage
  };
};

// Hook para loading automático com progresso simulado
export const useAutoLoading = (duration: number = 3000) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsLoading(false);
          clearInterval(interval);
          return 100;
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [duration]);

  return { isLoading, progress };
};

// Mensagens predefinidas para diferentes contextos
export const loadingMessages = {
  auth: [
    'Verificando credenciais...',
    'Autenticando usuário...',
    'Carregando perfil...'
  ],
  data: [
    'Carregando dados...',
    'Sincronizando informações...',
    'Preparando conteúdo...'
  ],
  payment: [
    'Processando pagamento...',
    'Verificando transação...',
    'Confirmando compra...'
  ],
  whatsapp: [
    'Conectando WhatsApp...',
    'Enviando mensagem...',
    'Aguardando confirmação...'
  ],
  general: [
    'Carregando...',
    'Preparando sua experiência...',
    'Quase pronto...'
  ]
};