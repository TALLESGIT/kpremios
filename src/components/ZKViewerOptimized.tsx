import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng';

interface ZKViewerOptimizedProps {
  channel: string;
  token?: string | null;
  initialInteracted?: boolean;
  fitMode?: 'contain' | 'cover';
}

const ZKViewerOptimized: React.FC<ZKViewerOptimizedProps> = ({
  channel,
  token = null,
  initialInteracted = false,
  fitMode = 'contain',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const hasJoinedRef = useRef(false);

  const videoTrackRef = useRef<IRemoteVideoTrack | null>(null);
  const audioTrackRef = useRef<IRemoteAudioTrack | null>(null);

  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [connected, setConnected] = useState(false);
  const fitModeRef = useRef(fitMode);

  // Manter fitMode atualizado para o observer
  useEffect(() => {
    fitModeRef.current = fitMode;
    if (containerRef.current) {
      const videos = containerRef.current.querySelectorAll('video');
      videos.forEach((v) => {
        v.style.objectFit = fitMode;
      });
    }
  }, [fitMode]);

  // Observer para forçar estilos corretos no vídeo do Agora
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!containerRef.current) return;
      const videos = containerRef.current.querySelectorAll('video');
      videos.forEach((video) => {
        const desired = fitModeRef.current;
        if (video.style.objectFit !== desired) video.style.objectFit = desired;
        if (video.style.width !== '100%') video.style.width = '100%';
        if (video.style.height !== '100%') video.style.height = '100%';
        if (video.style.position !== 'absolute') video.style.position = 'absolute';
        if (video.style.inset !== '0px') (video.style as any).inset = '0';
      });
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style'],
      });
    }

    return () => observer.disconnect();
  }, []);

  // ---------------------------
  // CREATE CLIENT (ONCE)
  // ---------------------------
  useEffect(() => {
    if (clientRef.current) return;

    const client = AgoraRTC.createClient({
      mode: 'live',
      codec: 'h264',
    });

    clientRef.current = client;

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);

    // Monitorar qualidade de rede
    client.on('network-quality', (stats) => {
      if (stats.downlinkNetworkQuality > 3) {
        console.warn('⚠️ Qualidade de recepção baixa:', stats.downlinkNetworkQuality);
      }
    });

    return () => {
      client.removeAllListeners();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------
  // JOIN CHANNEL (ONCE)
  // ---------------------------
  useEffect(() => {
    const joinChannel = async () => {
      if (!clientRef.current) return;
      if (hasJoinedRef.current) return;

      hasJoinedRef.current = true;

      const appId = import.meta.env.VITE_AGORA_APP_ID;
      if (!appId) {
        console.error('❌ Agora App ID not configured');
        return;
      }

      await clientRef.current.setClientRole('audience');

      // Otimização de latência: level 1 = ultra low latency
      await clientRef.current.setClientRole('audience', { level: 1 });

      await clientRef.current.join(appId, channel, token || null, null);

      setConnected(true);
      console.log('✅ ZKViewer: Joined channel', channel);
    };

    joinChannel().catch(console.error);
  }, [channel, token]);

  // ---------------------------
  // USER PUBLISHED
  // ---------------------------
  const handleUserPublished = async (
    user: IAgoraRTCRemoteUser,
    mediaType: 'video' | 'audio'
  ) => {
    if (!clientRef.current) return;

    console.log('🎬 ZKViewer: Usuário publicou', { uid: user.uid, mediaType });

    try {
      await clientRef.current.subscribe(user, mediaType);

      if (mediaType === 'video' && user.videoTrack && containerRef.current) {
        videoTrackRef.current = user.videoTrack;

        // FORÇAR QUALIDADE ALTA E EVITAR FALLBACK
        try {
          await clientRef.current.setRemoteVideoStreamType(user.uid, 0);
          clientRef.current.setStreamFallbackOption(user.uid, 0);
        } catch (e) {
          console.warn('⚠️ Erro ao configurar stream fallback:', e);
        }

        // PLAY VIDEO MUTED (ALWAYS)
        await user.videoTrack.play(containerRef.current);

        // Garantir que o elemento de vídeo gerado pelo Agora tenha os estilos corretos
        const videoEl = containerRef.current.querySelector('video');
        if (videoEl) {
          videoEl.muted = true;
          videoEl.style.objectFit = fitModeRef.current;
          videoEl.style.width = '100%';
          videoEl.style.height = '100%';
        }

        console.log('✅ Vídeo conectado e reproduzindo (mutado)');
        setNeedsInteraction(true);
      }

      if (mediaType === 'audio' && user.audioTrack) {
        audioTrackRef.current = user.audioTrack;
        console.log('🔊 Áudio recebido e pronto para ativar');
      }
    } catch (err) {
      console.error('❌ Erro ao processar stream publicada:', err);
    }
  };

  // ---------------------------
  // USER UNPUBLISHED
  // ---------------------------
  const handleUserUnpublished = (
    _user: IAgoraRTCRemoteUser,
    mediaType: 'video' | 'audio'
  ) => {
    console.log('📴 ZKViewer: Usuário parou de publicar', mediaType);
    if (mediaType === 'video') {
      videoTrackRef.current = null;
    }
    if (mediaType === 'audio') {
      audioTrackRef.current = null;
    }
  };

  // ---------------------------
  // USER CLICK (PLAY)
  // ---------------------------
  const handleUserInteraction = () => {
    console.log('▶️ Ativando áudio e vídeo após interação');

    AgoraRTC.resumeAudioContext();

    // garante vídeo
    if (videoTrackRef.current && containerRef.current) {
      try {
        const result = videoTrackRef.current.play(containerRef.current);
        if (result && typeof (result as any).catch === 'function') {
          (result as any).catch((e: any) => console.error('Erro no play de vídeo:', e));
        }
      } catch (err) {
        console.error('Erro ao dar play no vídeo:', err);
      }
    }

    // libera áudio
    if (audioTrackRef.current) {
      try {
        const result = audioTrackRef.current.play();
        if (result && typeof (result as any).catch === 'function') {
          (result as any).catch((e: any) => console.error('Erro no play de áudio:', e));
        }
      } catch (err) {
        console.error('Erro ao dar play no áudio:', err);
      }
    }

    setNeedsInteraction(false);
  };

  // ---------------------------
  // AUTO RESUME ON INITIAL INTERACTION
  // ---------------------------
  useEffect(() => {
    if (initialInteracted && connected) {
      console.log('⚡ ZKViewer: Interaction detected from parent, unblocking audio/video');
      handleUserInteraction();
    }
  }, [initialInteracted, connected]);

  // ---------------------------
  // CLEANUP ON UNMOUNT
  // ---------------------------
  useEffect(() => {
    return () => {
      try {
        audioTrackRef.current?.stop();
        videoTrackRef.current?.stop();
        clientRef.current?.leave();
      } catch (e) {
        console.warn(e);
      }
    };
  }, []);

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <div className="relative w-full h-full bg-black">
      <div
        ref={containerRef}
        className="w-full h-full bg-black"
        id="agora-video-container"
      />

      {needsInteraction && connected && !initialInteracted && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
          <button
            onClick={handleUserInteraction}
            className="px-6 py-3 bg-green-600 text-white rounded-lg text-xl font-semibold"
          >
            ▶️ Toque para assistir
          </button>

          <p className="mt-3 text-sm text-gray-200">
            Clique para ativar o áudio da transmissão
          </p>
        </div>
      )}
    </div>
  );
};

export default ZKViewerOptimized;
