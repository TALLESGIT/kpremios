import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface LivePlayerProps {
  hlsUrl: string;
  className?: string;
  fitMode?: 'contain' | 'cover';
  showOfflineMessage?: boolean;
  isLive?: boolean;
  isPreview?: boolean; // Indica se é preview do ZK Studio
}

export function LivePlayer({
  hlsUrl,
  className = '',
  fitMode = 'contain',
  showOfflineMessage = true,
  isLive = true,
  isPreview = false,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  const waitingStreamAttemptsRef = useRef(0);
  const maxWaitingStreamAttempts = 10; // Máximo de tentativas antes de mostrar mensagem

  const [status, setStatus] = useState<'loading' | 'playing' | 'error' | 'reconnecting' | 'offline'>('loading');
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUserInteraction = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    console.log('👆 LivePlayer: Usuário interagiu - ativando áudio');

    setUserInteracted(true);
    setNeedsInteraction(false);

    try {
      video.muted = false;
      await video.play();
      console.log('✅ LivePlayer: Áudio ativado após interação');
    } catch (err) {
      console.error('❌ LivePlayer: Erro ao ativar áudio:', err);
    }
  }, []);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setStatus('error');
      setErrorMessage('Não foi possível reconectar. Tente recarregar a página.');
      return;
    }

    reconnectAttemptsRef.current += 1;
    setStatus('reconnecting');

    reconnectTimeoutRef.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (video && hlsUrl) {
        video.load();
        reconnectTimeoutRef.current = null;
      }
    }, reconnectDelay);
  }, [hlsUrl]);

  useEffect(() => {
    const video = videoRef.current;
    // Se não tem URL ou não é live (e não é preview), não carregar
    if (!video || !hlsUrl || (!isLive && !isPreview)) {
      if (!isLive && showOfflineMessage) {
        setStatus('offline');
      }
      return;
    }

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const handleLoadStart = () => {
      console.log('🔄 LivePlayer: Iniciando carregamento HLS...');
      setStatus('loading');
      setErrorMessage(null);
    };

    const handleCanPlay = async () => {
      console.log('✅ LivePlayer: Vídeo pronto para reproduzir');
      setStatus('playing');
      reconnectAttemptsRef.current = 0;
      waitingStreamAttemptsRef.current = 0; // Reset contador quando stream carrega

      try {
        await video.play();
        console.log('✅ LivePlayer: Vídeo reproduzindo (mutado)');
        if (video.paused) {
          setNeedsInteraction(true);
        }
      } catch (err: any) {
        console.warn('⚠️ LivePlayer: Autoplay bloqueado:', err);
        setNeedsInteraction(true);
      }
    };

    const handlePlay = () => {
      console.log('▶️ LivePlayer: Vídeo começou a reproduzir');
      setStatus('playing');
    };

    const handlePause = () => {
      console.log('⏸️ LivePlayer: Vídeo pausado');
    };

    const handleError = (e: Event) => {
      const videoError = video.error;
      
      if (videoError) {
        const isWaitingForStream = 
          (videoError.code === videoError.MEDIA_ERR_NETWORK || 
           videoError.code === videoError.MEDIA_ERR_SRC_NOT_SUPPORTED) && 
          isLive;
        
        // Se for "aguardando stream", não logar como erro no console
        if (isWaitingForStream) {
          waitingStreamAttemptsRef.current += 1;
          
          if (waitingStreamAttemptsRef.current <= maxWaitingStreamAttempts) {
            // Apenas log informativo, não erro
            console.log(`⏳ LivePlayer: Aguardando stream disponível (tentativa ${waitingStreamAttemptsRef.current}/${maxWaitingStreamAttempts})`);
            
            setStatus('loading');
            setErrorMessage('Aguardando transmissão iniciar...');
            
            // Tentar novamente após 5 segundos
            setTimeout(() => {
              const video = videoRef.current;
              if (video && hlsUrl) {
                video.load();
              }
            }, 5000);
            return;
          } else {
            // Após muitas tentativas, mostrar mensagem mais clara
            console.warn('⚠️ LivePlayer: Stream ainda não disponível após várias tentativas');
            setStatus('loading');
            setErrorMessage('Aguardando transmissão iniciar... (O ZK Studio precisa iniciar a transmissão)');
            
            // Continuar tentando, mas com intervalo maior (10 segundos)
            setTimeout(() => {
              const video = videoRef.current;
              if (video && hlsUrl) {
                video.load();
              }
            }, 10000);
            return;
          }
        }
        
        // Para erros reais, logar normalmente
        console.error('❌ LivePlayer: Erro no vídeo:', e, 'Código:', videoError.code, 'Mensagem:', videoError.message);
        console.error('❌ LivePlayer: URL tentada:', hlsUrl);
        console.error('❌ LivePlayer: Estado do vídeo:', {
          readyState: video.readyState,
          networkState: video.networkState,
          paused: video.paused,
          muted: video.muted
        });
        
        let message = 'Erro ao carregar a transmissão';
        switch (videoError.code) {
          case videoError.MEDIA_ERR_ABORTED:
            message = 'Carregamento abortado';
            break;
          case videoError.MEDIA_ERR_NETWORK:
            message = 'Erro de rede - tentando reconectar...';
            attemptReconnect();
            return;
          case videoError.MEDIA_ERR_DECODE:
            message = 'Erro ao decodificar o vídeo';
            break;
          case videoError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'Formato de vídeo não suportado';
            break;
        }
        setErrorMessage(message);
        setStatus('error');
      } else {
        // Se não tem erro específico mas está live, pode ser que o stream ainda não esteja disponível
        if (isLive) {
          waitingStreamAttemptsRef.current += 1;
          console.log(`⏳ LivePlayer: Aguardando stream (tentativa ${waitingStreamAttemptsRef.current})`);
          setStatus('loading');
          setErrorMessage('Aguardando transmissão iniciar...');
          
          setTimeout(() => {
            const video = videoRef.current;
            if (video && hlsUrl) {
              video.load();
            }
          }, 5000);
          return;
        }
        
        setStatus('error');
        setErrorMessage('Erro desconhecido ao carregar vídeo');
      }
    };

    const handleWaiting = () => {
      console.log('⏳ LivePlayer: Aguardando dados...');
      if (status === 'playing') {
        setStatus('reconnecting');
      }
    };

    const handleStalled = () => {
      console.log('⚠️ LivePlayer: Transmissão travada - tentando reconectar...');
      attemptReconnect();
    };

    // Validar URL antes de atribuir
    if (!hlsUrl || hlsUrl.trim() === '') {
      console.warn('⚠️ LivePlayer: URL HLS vazia');
      setStatus('offline');
      setErrorMessage('URL de transmissão não disponível');
      return;
    }

    console.log('🔄 LivePlayer: Carregando HLS:', hlsUrl);
    
    // Limpar HLS anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Verificar se o navegador suporta HLS nativamente (Safari)
    // ✅ Detecção melhorada de suporte HLS (mais permissiva)
    const isNativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl') !== '' || 
                                  video.canPlayType('application/x-mpegURL') !== '' ||
                                  video.canPlayType('video/mp2t') !== '';
    
    if (isNativeHlsSupported) {
      // Safari e alguns navegadores mobile suportam HLS nativamente
      console.log('✅ LivePlayer: Navegador suporta HLS nativamente (Safari/iOS)');
      video.src = hlsUrl;
      video.load();
    } else if (Hls.isSupported()) {
      // Usar hls.js para navegadores que não suportam HLS nativamente
      console.log('✅ LivePlayer: Usando hls.js para reproduzir HLS (Chrome/Firefox/Edge)');
      // ✅ Configuração otimizada para reduzir travamento
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,        // Reduzido de 90 para 30 (menos buffer = menos travamento)
        maxBufferLength: 15,          // Reduzido de 30 para 15 (mais responsivo)
        maxMaxBufferLength: 30,       // Reduzido de 60 para 30
        startLevel: -1,               // Auto-seleção de qualidade
        debug: false,
        // ✅ Configurações adicionais para mobile
        maxBufferSize: 30 * 1000 * 1000,  // 30MB max buffer
        maxBufferHole: 0.5,           // Tolerar pequenos buracos no buffer
        manifestLoadingTimeOut: 10000, // 10s timeout para manifest
        manifestLoadingMaxRetry: 4,    // 4 tentativas
        levelLoadingTimeOut: 10000,    // 10s timeout para segments
        levelLoadingMaxRetry: 4,       // 4 tentativas
      });
      
      hlsRef.current = hls;
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ LivePlayer: Manifest HLS carregado, tentando reproduzir...');
        video.play().catch((err) => {
          console.warn('⚠️ LivePlayer: Autoplay bloqueado:', err);
          setNeedsInteraction(true);
        });
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('❌ LivePlayer: Erro fatal no HLS:', data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('❌ LivePlayer: Erro de rede no HLS');
              if (waitingStreamAttemptsRef.current < maxWaitingStreamAttempts) {
                waitingStreamAttemptsRef.current += 1;
                console.log(`⏳ LivePlayer: Tentando reconectar HLS (tentativa ${waitingStreamAttemptsRef.current}/${maxWaitingStreamAttempts})`);
                setStatus('loading');
                setErrorMessage('Aguardando transmissão iniciar...');
                setTimeout(() => {
                  if (hlsRef.current && hlsUrl) {
                    hlsRef.current.loadSource(hlsUrl);
                  }
                }, 5000);
                return;
              }
              setStatus('error');
              setErrorMessage('Erro de rede ao carregar transmissão');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('❌ LivePlayer: Erro de mídia no HLS');
              hls.recoverMediaError();
              break;
            default:
              console.error('❌ LivePlayer: Erro desconhecido no HLS');
              setStatus('error');
              setErrorMessage('Erro ao carregar transmissão');
              hls.destroy();
              break;
          }
        }
      });
    } else {
      // ⚠️ Navegador não suporta HLS - tentar fallback
      console.warn('⚠️ LivePlayer: Navegador não suporta HLS nativamente nem hls.js');
      console.warn('⚠️ User Agent:', navigator.userAgent);
      
      // Tentar carregar mesmo assim (alguns navegadores antigos podem funcionar)
      try {
        video.src = hlsUrl;
        video.load();
        console.log('🔄 LivePlayer: Tentando carregar HLS diretamente como fallback...');
      } catch (e) {
        console.error('❌ LivePlayer: Falha no fallback:', e);
        setStatus('error');
        setErrorMessage('Seu navegador pode não suportar reprodução ao vivo. Tente atualizar seu navegador ou use Chrome, Firefox, Edge ou Safari.');
        return;
      }
    }

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);

      // Limpar HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [hlsUrl, isLive, showOfflineMessage, status, attemptReconnect]);

  const renderContent = () => {
    if (!isLive && showOfflineMessage) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <div className="text-center space-y-4 px-8">
            <div className="text-6xl">📡</div>
            <h2 className="text-2xl font-black text-white uppercase italic">Live Offline</h2>
            <p className="text-slate-400 text-sm font-bold">A transmissão não está disponível no momento</p>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto"></div>
          </div>
        </div>
      );
    }

    if (status === 'error' && errorMessage) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <div className="text-center space-y-4 px-8">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-xl font-bold text-white">Erro ao carregar</h2>
            <p className="text-slate-400 text-sm">{errorMessage}</p>
            <button
              onClick={() => {
                reconnectAttemptsRef.current = 0;
                waitingStreamAttemptsRef.current = 0; // Reset contador quando stream carrega
                const video = videoRef.current;
                if (video && hlsUrl) {
                  video.load();
                }
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          controls
          preload="auto"
          className="w-full h-full"
          style={{
            objectFit: fitMode,
            background: '#000',
          }}
        />

        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="text-white text-sm font-medium">
                {isPreview ? 'Aguardando ZK Studio conectar...' : 'Carregando transmissão...'}
              </p>
              {!isPreview && (
                <p className="text-slate-400 text-xs">Aguarde, estamos conectando você à live</p>
              )}
              {isPreview && (
                <p className="text-slate-400 text-xs mt-2 max-w-md mx-auto">
                  Abra o ZK Studio e inicie a transmissão para ver o preview
                </p>
              )}
              {errorMessage && (
                <p className="text-slate-400 text-xs mt-2">{errorMessage}</p>
              )}
            </div>
          </div>
        )}

        {status === 'reconnecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
              <p className="text-white text-sm font-medium">Reconectando...</p>
              <p className="text-slate-400 text-xs">Tentativa {reconnectAttemptsRef.current} de {maxReconnectAttempts}</p>
            </div>
          </div>
        )}

        {needsInteraction && status === 'playing' && !userInteracted && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-20 cursor-pointer"
            onClick={handleUserInteraction}
          >
            <button
              onClick={handleUserInteraction}
              className="flex flex-col items-center justify-center gap-3 px-12 py-8 bg-white/15 border-2 border-white/40 rounded-2xl text-white font-semibold text-lg transition-all hover:bg-white/25 hover:border-white/60 hover:scale-105 active:scale-100 shadow-2xl min-w-[200px]"
              aria-label="Tocar para assistir"
            >
              <span className="text-6xl leading-none drop-shadow-lg">▶</span>
              <span className="text-xl font-bold tracking-wide">Toque para assistir</span>
              <small className="text-sm opacity-80 font-normal mt-1">Clique para ativar o áudio</small>
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden ${className}`}
    >
      {renderContent()}
    </div>
  );
}

