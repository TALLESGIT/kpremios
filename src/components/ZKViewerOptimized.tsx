import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

interface ZKViewerOptimizedProps {
  channel: string;
  token?: string | null;
  initialInteracted?: boolean;
}

/**
 * ZKViewerOptimized - Implementação Ultra-Direta (Sem Camadas Intermediárias)
 * Segue a regra absoluta de renderização direta do Agora SDK para evitar Black Screen.
 * PROIBIDO: Canvas, Video Ref (para processamento), CSS Transforms, Overlays Internos.
 */
const ZKViewerOptimized: React.FC<ZKViewerOptimizedProps> = ({
  channel,
  token = null,
  initialInteracted = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const activeUserRef = useRef<IAgoraRTCRemoteUser | null>(null);

  const [connected, setConnected] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);

  useEffect(() => {
    // 1) Criar client Agora
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({
        mode: "live",
        codec: "h264",
      });
    }

    const client = clientRef.current;

    // 3) Renderizar vídeo SEMPRE assim (Direct DOM Injection)
    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
      await client.subscribe(user, mediaType);
      console.log(`🎬 Usuário publicou: ${mediaType}`);

      if (mediaType === "video") {
        activeUserRef.current = user;
        const container = containerRef.current;
        if (container) {
          // Limpeza absoluta antes de renderizar
          container.innerHTML = "";
          // Chamada nativa do SDK
          user.videoTrack?.play(container);
          console.log("✅ VideoTrack renderizado diretamente no container");
        }
        setNeedsInteraction(true);
      }

      if (mediaType === "audio") {
        user.audioTrack?.play();
        console.log("🔊 AudioTrack iniciado");
      }
    };

    const handleUserUnpublished = (_user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
      if (mediaType === "video") {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      }
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);

    // 2) Entrar no canal como audience
    const init = async () => {
      const appId = import.meta.env.VITE_AGORA_APP_ID;
      if (!appId) {
        console.error("❌ VITE_AGORA_APP_ID não configurado");
        return;
      }

      try {
        await client.setClientRole("audience");
        await client.join(appId, channel, token || null, null);
        setConnected(true);
        console.log(`✅ Conectado ao canal: ${channel}`);
      } catch (err) {
        console.error("❌ Erro ao entrar no canal:", err);
      }
    };

    init();

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.leave().catch(console.error);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [channel, token]);

  // Função de interação manual (Play Button Verde)
  const handleInteraction = () => {
    console.log("▶️ Interação detectada: Restaurando contexto de áudio/vídeo");
    AgoraRTC.resumeAudioContext();

    if (activeUserRef.current) {
      if (activeUserRef.current.videoTrack && containerRef.current) {
        containerRef.current.innerHTML = "";
        activeUserRef.current.videoTrack.play(containerRef.current);
      }
      if (activeUserRef.current.audioTrack) {
        activeUserRef.current.audioTrack.play();
      }
    }

    setNeedsInteraction(false);
  };

  // Re-emitir play se houver interação detectada pelo componente pai
  useEffect(() => {
    if (initialInteracted && connected) {
      handleInteraction();
    }
  }, [initialInteracted, connected]);

  return (
    <div style={{ width: '100%', height: '100%', background: 'black', position: 'relative', overflow: 'hidden' }}>
      {/* 4) O container HTML DEVE ser simples e sem transformações */}
      <div
        id="player"
        ref={containerRef}
        style={{ width: '100%', height: '100%', background: 'black' }}
      ></div>

      {/* Overlay de Interação - Apenas se necessário para Autoplay Policy */}
      {needsInteraction && connected && !initialInteracted && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.75)'
          }}
        >
          <button
            onClick={handleInteraction}
            style={{
              padding: '16px 32px',
              backgroundColor: '#16a34a',
              color: 'white',
              borderRadius: '8px',
              fontSize: '20px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}
          >
            ▶️ Toque para assistir
          </button>
          <p style={{ marginTop: '12px', color: '#cbd5e1', fontSize: '14px' }}>
            Clique para ativar o áudio da transmissão
          </p>
        </div>
      )}
    </div>
  );
};

export default ZKViewerOptimized;
