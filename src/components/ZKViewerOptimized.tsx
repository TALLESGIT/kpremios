/**
 * ZK Viewer v1 - Player Profissional de Streaming
 * 
 * Princípios:
 * - Estabilidade > Resolução
 * - Mobile-first
 * - Baixa latência (< 100ms)
 * - Sem reprocessamento
 * - Confia no Agora SDK
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

interface ZKViewerProps {
  appId?: string;
  channel: string;
  token?: string | null;
  onLatencyUpdate?: (latency: number) => void;
  onQualityChange?: (quality: 'excellent' | 'good' | 'poor') => void;
}

// Configuração otimizada do Agora SDK
const createOptimizedClient = () => {
  return AgoraRTC.createClient({
    mode: 'live',
    codec: 'h264', // H.264 para hardware acceleration
  });
};

export default function ZKViewerOptimized({
  appId,
  channel,
  token = null,
  onLatencyUpdate,
  onQualityChange,
}: ZKViewerProps) {
  // Estados essenciais
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true); // SEMPRE iniciar como true
  const [userInteracted, setUserInteracted] = useState(false); // Flag para saber se usuário já interagiu
  const [error, setError] = useState<string | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const videoTrackRef = useRef<any>(null);
  const audioTrackRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    try {
      // Parar tracks
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current = null;
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      }

      // Desconectar
      client.removeAllListeners();
      await client.leave();
      clientRef.current = null;
    } catch (err) {
      console.error('ZKViewer: Erro no cleanup:', err);
    }
  }, []);

  // Play video track - SEMPRE MUTADO inicialmente
  const playVideo = useCallback(async (track: any, muted: boolean = true) => {
    if (!containerRef.current || !mountedRef.current) return;

    try {
      // Play direto no container (MUTADO)
      await track.play(containerRef.current);
      
      // Garantir estilos otimizados
      const videoEl = containerRef.current.querySelector('video');
      if (videoEl) {
        videoEl.className = 'zk-video-element';
        // IMPORTANTE: Vídeo sempre inicia MUTADO
        videoEl.muted = muted;
      }
      
      setHasVideo(true);
      
      // Se vídeo iniciou mas usuário não interagiu, manter needsInteraction=true
      // O áudio só será ativado após interação
      if (!userInteracted) {
        setNeedsInteraction(true);
      }
    } catch (err: any) {
      // Autoplay bloqueado
      console.warn('ZKViewer: Erro ao reproduzir vídeo:', err);
      setNeedsInteraction(true);
    }
  }, [userInteracted]);

  // Play audio track - SÓ APÓS INTERAÇÃO DO USUÁRIO
  const playAudio = useCallback(async (track: any) => {
    if (!mountedRef.current) return;

    // NUNCA tocar áudio automaticamente - só após interação
    if (!userInteracted) {
      console.log('🔇 ZKViewer: Áudio aguardando interação do usuário');
      return;
    }

    try {
      // IMPORTANTE: Resumir AudioContext antes de tocar
      try {
        await AgoraRTC.resumeAudioContext();
        console.log('✅ ZKViewer: AudioContext resumido');
      } catch (audioCtxErr) {
        console.warn('⚠️ ZKViewer: Erro ao resumir AudioContext:', audioCtxErr);
      }

      // Volume máximo
      track.setVolume(100);
      
      // Play direto
      await track.play();
      
      setHasAudio(true);
      console.log('🔊 ZKViewer: Áudio reproduzindo após interação');
    } catch (err) {
      console.warn('ZKViewer: Erro ao reproduzir áudio:', err);
    }
  }, [userInteracted]);

  // Handler de interação do usuário - ATIVA ÁUDIO E GARANTE VÍDEO
  const handleUserInteraction = useCallback(async () => {
    if (!mountedRef.current) return;

    console.log('👆 ZKViewer: Usuário interagiu - ativando áudio e vídeo');

    // Marcar que usuário interagiu (NUNCA mais pedir interação)
    setUserInteracted(true);
    setNeedsInteraction(false);

    try {
      // IMPORTANTE: Resumir AudioContext do Agora
      try {
        await AgoraRTC.resumeAudioContext();
        console.log('✅ ZKViewer: AudioContext resumido pelo usuário');
      } catch (audioCtxErr) {
        console.warn('⚠️ ZKViewer: Erro ao resumir AudioContext:', audioCtxErr);
      }

      const client = clientRef.current;
      if (!client) return;

      // Processar todos os usuários remotos
      const remoteUsers = client.remoteUsers;
      for (const user of remoteUsers) {
        // Garantir vídeo (pode já estar rodando, mas garantir)
        if (user.videoTrack) {
          videoTrackRef.current = user.videoTrack;
          // Reproduzir vídeo SEM mute (usuário já interagiu)
          await playVideo(user.videoTrack, false);
        }

        // ATIVAR ÁUDIO (só agora após interação)
        if (user.audioTrack) {
          audioTrackRef.current = user.audioTrack;
          await playAudio(user.audioTrack);
        }
      }

      // Se já temos tracks salvos, ativar agora
      if (videoTrackRef.current) {
        const videoEl = containerRef.current?.querySelector('video');
        if (videoEl) {
          videoEl.muted = false; // Desmutar vídeo
        }
      }

      if (audioTrackRef.current && !hasAudio) {
        await playAudio(audioTrackRef.current);
      }

      console.log('✅ ZKViewer: Mídia ativada após interação do usuário');
    } catch (err) {
      console.error('❌ ZKViewer: Erro ao ativar mídia após interação:', err);
      setError('Erro ao ativar reprodução. Tente recarregar a página.');
    }
  }, [playVideo, playAudio, hasAudio]);

  // Inicializar conexão
  useEffect(() => {
    const agoraAppId = appId || import.meta.env.VITE_AGORA_APP_ID;
    const agoraToken = token ?? import.meta.env.VITE_AGORA_TOKEN ?? null;

    if (!agoraAppId || !channel) {
      setError('Configuração inválida: App ID ou canal não fornecido');
      return;
    }

    let client: IAgoraRTCClient;

    const init = async () => {
      try {
        setConnectionState('connecting');
        
        // Criar cliente otimizado
        client = createOptimizedClient();
        clientRef.current = client;

        // Configurar role de audiência com baixa latência
        await client.setClientRole('audience', { level: 1 });

        // Event listeners essenciais
        client.on('connection-state-change', (curState) => {
          if (!mountedRef.current) return;
          
          if (curState === 'CONNECTED') {
            setConnectionState('connected');
            setError(null);
          } else if (curState === 'DISCONNECTED') {
            setConnectionState('disconnected');
            setHasVideo(false);
            setHasAudio(false);
          }
        });

        client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => {
          if (!mountedRef.current) return;

          try {
            // Subscribe imediato
            await client.subscribe(user, mediaType);

            // Play baseado no tipo
            if (mediaType === 'video' && user.videoTrack) {
              videoTrackRef.current = user.videoTrack;
              // Vídeo sempre inicia MUTADO (até usuário interagir)
              await playVideo(user.videoTrack, true);
            }

            if (mediaType === 'audio' && user.audioTrack) {
              audioTrackRef.current = user.audioTrack;
              // Áudio NUNCA inicia automaticamente - só após interação
              // Mas salvamos a referência para ativar depois
              if (userInteracted) {
                await playAudio(user.audioTrack);
              } else {
                console.log('🔇 ZKViewer: Áudio recebido, aguardando interação do usuário');
              }
            }
          } catch (err) {
            console.error('ZKViewer: Erro ao processar stream:', err);
          }
        });

        client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => {
          if (!mountedRef.current) return;

          if (mediaType === 'video') {
            if (videoTrackRef.current) {
              videoTrackRef.current.stop();
              videoTrackRef.current = null;
            }
            setHasVideo(false);
          }

          if (mediaType === 'audio') {
            if (audioTrackRef.current) {
              audioTrackRef.current.stop();
              audioTrackRef.current = null;
            }
            setHasAudio(false);
          }
        });

        // Conectar ao canal
        await client.join(agoraAppId, channel, agoraToken, null);

        // Verificar se já há usuários no canal
        const remoteUsers = client.remoteUsers;
        for (const user of remoteUsers) {
          if (user.hasVideo && user.videoTrack) {
            await client.subscribe(user, 'video');
            videoTrackRef.current = user.videoTrack;
            // Vídeo sempre inicia MUTADO
            await playVideo(user.videoTrack, true);
          }
          if (user.hasAudio && user.audioTrack) {
            await client.subscribe(user, 'audio');
            audioTrackRef.current = user.audioTrack;
            // Áudio só após interação
            if (userInteracted) {
              await playAudio(user.audioTrack);
            } else {
              console.log('🔇 ZKViewer: Áudio disponível, aguardando interação');
            }
          }
        }

        setConnectionState('connected');
      } catch (err: any) {
        console.error('ZKViewer: Erro na inicialização:', err);
        
        let errorMessage = 'Erro ao conectar ao canal';
        if (err?.code === 4096) {
          errorMessage = 'Projeto Agora.io inativo ou suspenso';
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setConnectionState('disconnected');
      }
    };

    init();

    return () => {
      cleanup();
    };
  }, [appId, channel, token, playVideo, playAudio, cleanup, userInteracted]);

  // Render
  return (
    <div className="zk-viewer-container">
      {/* Container de vídeo */}
      <div 
        ref={containerRef}
        className="zk-video-container"
        onClick={needsInteraction ? handleUserInteraction : undefined}
      />

      {/* Estados de UI */}
      {connectionState === 'connecting' && (
        <div className="zk-viewer-overlay">
          <div className="zk-viewer-spinner" />
          <p>Conectando ao canal...</p>
        </div>
      )}

      {connectionState === 'connected' && !hasVideo && !error && (
        <div className="zk-viewer-overlay">
          <div className="zk-viewer-waiting">
            <div className="zk-viewer-icon">📺</div>
            <p>Aguardando transmissão...</p>
            <small>O ZK Studio Pro deve estar transmitindo no canal: <strong>{channel}</strong></small>
          </div>
        </div>
      )}

      {/* Overlay profissional de interação - estilo YouTube/Twitch */}
      {needsInteraction && hasVideo && (
        <div className="zk-viewer-overlay zk-viewer-interaction">
          <button 
            onClick={handleUserInteraction}
            className="zk-viewer-play-button"
            aria-label="Tocar para assistir"
          >
            <span className="zk-viewer-play-icon">▶</span>
            <span className="zk-viewer-play-text">Toque para assistir</span>
            <small className="zk-viewer-play-hint">Clique para ativar o áudio e começar a transmissão</small>
          </button>
        </div>
      )}

      {/* Overlay quando ainda não tem vídeo mas precisa interação */}
      {needsInteraction && !hasVideo && connectionState === 'connected' && (
        <div className="zk-viewer-overlay zk-viewer-interaction">
          <button 
            onClick={handleUserInteraction}
            className="zk-viewer-play-button"
            aria-label="Tocar para assistir"
          >
            <span className="zk-viewer-play-icon">▶</span>
            <span className="zk-viewer-play-text">Toque para assistir</span>
            <small className="zk-viewer-play-hint">Aguardando transmissão...</small>
          </button>
        </div>
      )}

      {error && (
        <div className="zk-viewer-overlay zk-viewer-error">
          <div className="zk-viewer-error-content">
            <div className="zk-viewer-error-icon">❌</div>
            <h3>Erro de Conexão</h3>
            <p>{error}</p>
            <small>Verifique o console (F12) para mais detalhes</small>
          </div>
        </div>
      )}

      {/* Estilos inline otimizados */}
      <style jsx>{`
        .zk-viewer-container {
          position: relative;
          width: 100%;
          height: 100%;
          background: black;
          overflow: hidden;
        }

        .zk-video-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .zk-video-container :global(video) {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: black;
        }

        .zk-viewer-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          text-align: center;
          padding: 20px;
          z-index: 10;
        }

        .zk-viewer-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .zk-viewer-waiting {
          max-width: 400px;
        }

        .zk-viewer-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .zk-viewer-interaction {
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
        }

        .zk-viewer-play-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 32px 48px;
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 16px;
          color: white;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 200px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .zk-viewer-play-button:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.6);
          transform: scale(1.08);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        }

        .zk-viewer-play-button:active {
          transform: scale(1.02);
        }

        .zk-viewer-play-icon {
          font-size: 64px;
          line-height: 1;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
        }

        .zk-viewer-play-text {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .zk-viewer-play-hint {
          font-size: 13px;
          opacity: 0.8;
          font-weight: 400;
          margin-top: 4px;
        }

        .zk-viewer-error {
          background: rgba(139, 0, 0, 0.9);
        }

        .zk-viewer-error-content {
          max-width: 500px;
        }

        .zk-viewer-error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        small {
          display: block;
          margin-top: 8px;
          opacity: 0.7;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

