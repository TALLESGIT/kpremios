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

        // ✅ CORREÇÃO: Configurar qualidade de vídeo ALTA e fallback para evitar tela preta
        try {
          // Usar qualidade ALTA (1) para melhor nitidez
          await client.setRemoteVideoStreamType?.(user.uid, 1);
          // Configurar fallback option: 1 = Disable (não fazer fallback, manter qualidade)
          // Isso evita que o vídeo caia para qualidade baixa automaticamente
          client.setStreamFallbackOption?.(user.uid, 1);
          console.log('✅ ZKViewerOptimized: Qualidade de vídeo configurada para ALTA');
        } catch (err) {
          console.warn('⚠️ ZKViewerOptimized: Erro ao configurar qualidade:', err);
        }

        if (containerRef.current) {
          // ✅ CORREÇÃO: Não limpar imediatamente, manter último frame até novo vídeo carregar
          // Isso evita tela preta durante reconexões
          try {
            // Limpar apenas depois que o novo vídeo começar a tocar
            await user.videoTrack?.play(containerRef.current);

            // Só limpar HTML depois que o novo vídeo estiver reproduzindo
            // Isso mantém o último frame visível durante a transição
            if (containerRef.current.children.length > 1) {
              // Remover vídeos antigos, mantendo o atual
              const videos = containerRef.current.querySelectorAll('video');
              const currentVideo = containerRef.current.querySelector('video:last-child');
              videos.forEach((video) => {
                if (video !== currentVideo) {
                  try {
                    video.pause();
                    video.srcObject = null;
                    video.remove();
                  } catch (e) {
                    // Ignorar erros ao remover vídeos antigos
                  }
                }
              });
            }

            // Forçar object-fit no vídeo gerado pelo Agora
            const videoEl = containerRef.current.querySelector('video');
            if (videoEl) {
              videoEl.style.objectFit = fitMode;

              // ✅ CORREÇÃO: Adicionar listener para erros de decodificação
              const handleVideoError = (e: Event) => {
                console.error('❌ Erro no elemento de vídeo:', e);
                // Tentar reconectar se houver erro de decodificação
                // Mas NÃO limpar o container imediatamente para evitar tela preta
                if (activeUserRef.current && containerRef.current) {
                  setTimeout(() => {
                    try {
                      // Tentar reproduzir novamente sem limpar (isso vai substituir automaticamente)
                      activeUserRef.current?.videoTrack?.play(containerRef.current!);

                      // Tentar aumentar qualidade novamente
                      if (activeUserRef.current) {
                        client.setRemoteVideoStreamType?.(activeUserRef.current?.uid, 1).catch(() => { });
                      }
                      console.log('🔄 Tentativa de recuperação de vídeo após erro');
                    } catch (replayErr) {
                      console.error('Erro ao recuperar vídeo:', replayErr);
                      // Só limpar como último recurso
                      try {
                        containerRef.current!.innerHTML = "";
                        activeUserRef.current?.videoTrack?.play(containerRef.current!);
                      } catch (finalErr) {
                        console.error('Erro final ao recuperar vídeo:', finalErr);
                      }
                    }
                  }, 1000);
                }
              };

              videoEl.addEventListener('error', handleVideoError);

              // Limpar listener quando vídeo for removido
              const observer = new MutationObserver(() => {
                if (!containerRef.current?.contains(videoEl)) {
                  videoEl.removeEventListener('error', handleVideoError);
                  observer.disconnect();
                }
              });
              observer.observe(containerRef.current, { childList: true, subtree: true });
            }
          } catch (playErr) {
            console.error('❌ Erro ao reproduzir vídeo:', playErr);
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
              audioTrack.setJitterBufferDelay(0, 0); // Jitter buffer ZERO (mínimo, máximo)
            }
            if (typeof audioTrack.setAudioProcessingDelay === 'function') {
              audioTrack.setAudioProcessingDelay(0); // Processamento ZERO
            }

            // Garantir que o buffer de áudio não acumule
            if (typeof audioTrack.setAudioSourceBuffer === 'function') {
              audioTrack.setAudioSourceBuffer(0);
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
      if (mediaType === "video") {
        // ✅ CORREÇÃO: Não limpar container imediatamente para evitar tela preta
        // Manter o último frame visível até o próximo vídeo chegar
        if (activeUserRef.current === _user) {
          activeUserRef.current = null;
        }
        // Não limpar o HTML para evitar tela preta durante reconexões
        // O novo vídeo vai substituir automaticamente
      }
    };

    // ✅ CORREÇÃO: Listener para erros de decodificação
    const handleException = (evt: any) => {
      const { code, msg, uid } = evt;
      console.warn('⚠️ Exceção Agora detectada:', { code, msg, uid });

      // Se for erro de decodificação de vídeo, tentar reconectar
      if (code === 1005 || msg === 'RECV_VIDEO_DECODE_FAILED') {
        console.log('🔄 Tentando reconectar vídeo devido a erro de decodificação...');
        if (activeUserRef.current && containerRef.current) {
          const activeUser = activeUserRef.current;
          const container = containerRef.current;
          setTimeout(() => {
            try {
              container.innerHTML = "";
              activeUser?.videoTrack?.play(container);

              // Tentar aumentar qualidade novamente
              if (activeUser) {
                client.setRemoteVideoStreamType?.(activeUser.uid, 1).catch(() => { });
              }
            } catch (reconnectErr) {
              console.error('Erro ao reconectar vídeo:', reconnectErr);
            }
          }, 500);
        }
      }
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("exception", handleException);

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
      client.off("exception", handleException);
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