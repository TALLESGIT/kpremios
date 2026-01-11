import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

interface ZKViewerOptimizedProps {
  channel: string;
  token?: string | null;
  initialInteracted?: boolean;
  fitMode?: 'contain' | 'cover';
  muteAudio?: boolean; // ✅ NOVO: Muta áudio quando true (para admin)
}

/**
 * ZKViewerOptimized - Implementação Ultra-Direta
 * Renderização direta do Agora SDK para evitar Black Screen.
 */
const ZKViewerOptimized: React.FC<ZKViewerOptimizedProps> = ({
  channel,
  token = null,
  initialInteracted = false,
  fitMode = 'contain',
  muteAudio = false, // ✅ NOVO: Default false (usuários ouvem normalmente)
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const activeUserRef = useRef<IAgoraRTCRemoteUser | null>(null);
  const muteAudioRef = useRef(muteAudio); // ✅ Ref para muteAudio (evita reconexões)

  const [connected, setConnected] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);

  // ✅ Atualizar ref quando muteAudio mudar (sem causar reconexão)
  useEffect(() => {
    muteAudioRef.current = muteAudio;
  }, [muteAudio]);

  useEffect(() => {
    // 1) Criar client Agora
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({
        mode: "live",
        codec: "h264",
      });
    }

    const client = clientRef.current;

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
      await client.subscribe(user, mediaType);

      if (mediaType === "video") {
        activeUserRef.current = user;
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          user.videoTrack?.play(containerRef.current);

          // Forçar object-fit no vídeo gerado pelo Agora
          const videoEl = containerRef.current.querySelector('video');
          if (videoEl) {
            videoEl.style.objectFit = fitMode;
          }
        }
        setNeedsInteraction(true);
      }

      if (mediaType === "audio" && user.audioTrack) {
        // ✅ CORREÇÃO ECO: NÃO reproduz áudio se muteAudio=true (admin)
        if (muteAudioRef.current) {
          console.log('🔇 ZKViewerOptimized: Áudio MUTADO (modo admin)');
          user.audioTrack.setVolume(0);
        } else {
          // ✅ CONFIGURAÇÕES ULTRA-BAIXA LATÊNCIA PARA ÁUDIO EM TEMPO REAL
          try {
            user.audioTrack.setVolume(100);
            
            // Configurações agressivas para eliminar delay de áudio
            const audioTrack = user.audioTrack as any;
            if (typeof audioTrack.setAudioBufferDelay === 'function') {
              audioTrack.setAudioBufferDelay(0); // Buffer ZERO
            }
            if (typeof audioTrack.setLatencyMode === 'function') {
              audioTrack.setLatencyMode('ultra_low'); // Modo ultra-baixa latência
            }
            if (typeof audioTrack.setJitterBufferDelay === 'function') {
              audioTrack.setJitterBufferDelay(0, 0); // Jitter buffer ZERO
            }
            if (typeof audioTrack.setAudioProcessingDelay === 'function') {
              audioTrack.setAudioProcessingDelay(0); // Processamento ZERO
            }
            
            console.log('✅ ZKViewerOptimized: Configurações ultra-baixa latência aplicadas');
          } catch (configErr) {
            console.warn('ZKViewerOptimized: Algumas configurações de áudio não disponíveis:', configErr);
          }
          
          // Reproduzir imediatamente
          user.audioTrack.play();
          console.log('🔊 ZKViewerOptimized: Áudio reproduzindo (modo usuário)');
        }
      }
    };

    const handleUserUnpublished = (_user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
      if (mediaType === "video" && containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);

    const init = async () => {
      const appId = import.meta.env.VITE_AGORA_APP_ID;
      if (!appId) return;

      try {
        await client.setClientRole("audience");
        await client.join(appId, channel, token || null, null);
        setConnected(true);
      } catch (err) {
        console.error("Erro Agora:", err);
      }
    };

    init();

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.leave().catch(() => { });
    };
  }, [channel, token, fitMode]); // ✅ Removido muteAudio para evitar reconexões desnecessárias

  const handleInteraction = () => {
    AgoraRTC.resumeAudioContext();
    if (activeUserRef.current) {
      if (activeUserRef.current.videoTrack && containerRef.current) {
        containerRef.current.innerHTML = "";
        activeUserRef.current.videoTrack.play(containerRef.current);

        const videoEl = containerRef.current.querySelector('video');
        if (videoEl) {
          videoEl.style.objectFit = fitMode;
        }
      }
      // ✅ CORREÇÃO ECO: NÃO reproduz áudio se muteAudio=true (admin)
      if (activeUserRef.current.audioTrack) {
        if (muteAudioRef.current) {
          activeUserRef.current.audioTrack.setVolume(0);
        } else {
          // ✅ CONFIGURAÇÕES ULTRA-BAIXA LATÊNCIA PARA ÁUDIO EM TEMPO REAL
          try {
            activeUserRef.current.audioTrack.setVolume(100);
            
            const audioTrack = activeUserRef.current.audioTrack as any;
            if (typeof audioTrack.setAudioBufferDelay === 'function') {
              audioTrack.setAudioBufferDelay(0);
            }
            if (typeof audioTrack.setLatencyMode === 'function') {
              audioTrack.setLatencyMode('ultra_low');
            }
            if (typeof audioTrack.setJitterBufferDelay === 'function') {
              audioTrack.setJitterBufferDelay(0, 0);
            }
            if (typeof audioTrack.setAudioProcessingDelay === 'function') {
              audioTrack.setAudioProcessingDelay(0);
            }
          } catch (configErr) {
            console.warn('ZKViewerOptimized: Erro ao configurar áudio:', configErr);
          }
          
          activeUserRef.current.audioTrack.play();
        }
      }
    }
    setNeedsInteraction(false);
  };

  useEffect(() => {
    if (initialInteracted && connected) {
      handleInteraction();
    }
  }, [initialInteracted, connected]);

  return (
    <div style={{ width: '100%', height: '100%', background: 'black', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', background: 'black' }}
      ></div>

      {/* ✅ CORREÇÃO: Não mostra botão de interação se muteAudio=true */}
      {needsInteraction && connected && !initialInteracted && !muteAudioRef.current && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <button
            onClick={handleInteraction}
            style={{ padding: '16px 32px', backgroundColor: '#16a34a', color: 'white', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
          >
            ▶️ Toque para assistir
          </button>
        </div>
      )}
    </div>
  );
};

export default ZKViewerOptimized;