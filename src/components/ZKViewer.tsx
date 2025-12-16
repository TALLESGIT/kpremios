import { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

interface ZKViewerProps {
  appId: string;
  channel: string;
  token?: string | null;
}

export default function ZKViewer({ appId, channel, token }: ZKViewerProps) {
  const clientRef = useRef<any>(null);
  const videoTrackRef = useRef<any>(null);
  const audioTrackRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastDisconnectTime, setLastDisconnectTime] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (clientRef.current) return;

        // Usar appId do prop ou do .env
        const agoraAppId = appId || import.meta.env.VITE_AGORA_APP_ID;
        const agoraToken = token ?? import.meta.env.VITE_AGORA_TOKEN ?? null;

        if (!agoraAppId) {
          setError('App ID não configurado');
          return;
        }

        setConnectionState('connecting');

        const client = AgoraRTC.createClient({
          mode: 'live',
          codec: 'h264',
        });

        clientRef.current = client;

        client.on('connection-state-change', (state: string) => {
          if (!mounted) return;
          console.log('🔌 ZKViewer: connection-state-change', { 
            state, 
            timestamp: new Date().toISOString() 
          });
          if (state === 'CONNECTED') setConnectionState('connected');
          if (state === 'DISCONNECTED') {
            console.warn('⚠️ ZKViewer: Desconectado do Agora!', {
              timestamp: new Date().toISOString(),
              possibleCauses: ['Token expirado', 'Timeout de inatividade', 'Limite de minutos']
            });
            setIsLive(false);
          }
        });

        // Listener para erros de token
        client.on('token-privilege-will-expire', () => {
          console.warn('⚠️ ZKViewer: Token vai expirar em breve!');
        });

        client.on('token-privilege-did-expire', () => {
          console.error('❌ ZKViewer: Token EXPIROU!');
          setError('Token expirado - reconecte a transmissão');
        });

        client.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
          if (!mounted) return;

          console.log('🎬 ZKViewer: user-published', { uid: user.uid, mediaType });

          try {
            await client.subscribe(user, mediaType);
            console.log('✅ ZKViewer: Subscribe realizado com sucesso', mediaType);

            if (mediaType === 'video') {
              // 🔥 FIX CIRÚRGICO: setIsLive ANTES de qualquer outra coisa
              setIsLive(true);
              console.log('🔴 ZKViewer: isLive = TRUE');

              if (user.videoTrack) {
                videoTrackRef.current = user.videoTrack;
                console.log('🎥 ZKViewer: Reproduzindo vídeo...', {
                  trackId: user.videoTrack.getTrackId(),
                  enabled: user.videoTrack.enabled,
                });
                await user.videoTrack.play(containerRef.current!);
                console.log('✅ ZKViewer: Vídeo reproduzindo!');
              }
            }

            if (mediaType === 'audio' && user.audioTrack) {
              audioTrackRef.current = user.audioTrack;
              console.log('🔊 ZKViewer: Reproduzindo áudio...');
              await user.audioTrack.play();
              console.log('✅ ZKViewer: Áudio reproduzindo!');
            }
          } catch (err) {
            console.error('❌ ZKViewer: Erro ao processar stream:', err);
          }
        });

        client.on('user-unpublished', (user: any, mediaType: 'video' | 'audio') => {
          if (!mounted) return;
          const now = Date.now();
          console.log('📴 ZKViewer: user-unpublished', { 
            uid: user.uid, 
            mediaType,
            timestamp: new Date().toISOString()
          });
          if (mediaType === 'video') {
            setIsLive(false);
            setLastDisconnectTime(now);
            setReconnectCount(prev => prev + 1);
            console.log('⚫ ZKViewer: isLive = FALSE');
            console.warn('⚠️ ZKViewer: Reconexão #' + (reconnectCount + 1));
            
            // Limpar referências
            if (videoTrackRef.current) {
              videoTrackRef.current.stop();
              videoTrackRef.current = null;
            }
          }
        });

        await client.setClientRole('audience');
        console.log('🔌 ZKViewer: Conectando ao canal...', { 
          channel, 
          hasToken: !!agoraToken,
          tokenPreview: agoraToken ? agoraToken.substring(0, 20) + '...' : 'null'
        });
        await client.join(agoraAppId, channel, agoraToken, null);
        console.log('✅ ZKViewer: Conectado ao canal!', { 
          channel,
          connectionTime: new Date().toISOString()
        });
      } catch (err) {
        console.error(err);
        setError('Erro ao conectar à transmissão');
      }
    };

    init();

    return () => {
      mounted = false;

      videoTrackRef.current?.stop();
      audioTrackRef.current?.stop();

      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        clientRef.current.leave();
        clientRef.current = null;
      }
    };
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div style={{ 
      position: 'relative',
      width: '100%', 
      height: '100%', 
      backgroundColor: 'black'
    }}>
      {/* 🎥 CONTAINER DO VÍDEO - SEMPRE VISÍVEL */}
      <div 
        ref={containerRef} 
        style={{ 
          position: 'absolute',
          inset: 0,
          width: '100%', 
          height: '100%',
          backgroundColor: 'black',
          zIndex: 1
        }} 
      />

      {/* 🔴 INDICADOR DE STATUS AO VIVO - SEMPRE VISÍVEL */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        {/* Badge principal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '8px',
          backgroundColor: isLive ? 'rgba(220, 38, 38, 0.9)' : 'rgba(71, 85, 105, 0.9)',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isLive ? '#fff' : '#94a3b8',
            animation: isLive ? 'pulse 2s infinite' : 'none'
          }} />
          {isLive ? 'AO VIVO' : 'OFFLINE'}
        </div>

        {/* Contador de reconexões (se > 0) */}
        {reconnectCount > 0 && (
          <div style={{
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(251, 191, 36, 0.9)',
            color: 'white',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            ⚠️ Reconexões: {reconnectCount}
          </div>
        )}
      </div>

      {/* ⏳ OVERLAY "AGUARDANDO" - SÓ APARECE QUANDO !isLive */}
      {!isLive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{
            color: 'white',
            fontSize: '18px',
            textAlign: 'center',
            maxWidth: '500px',
            padding: '20px'
          }}>
            {reconnectCount > 0 ? (
              <>
                🔄 Reconectando...
                <div style={{ fontSize: '14px', marginTop: '12px', opacity: 0.8 }}>
                  A transmissão está instável. Possíveis causas:
                </div>
                <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7, textAlign: 'left' }}>
                  • Bitrate muito baixo no ZK Studio<br />
                  • Slideshow de imagens causando reconexões<br />
                  • Conexão de internet instável
                </div>
              </>
            ) : (
              <>
                ⏳ Aguardando transmissão...
                <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>
                  Certifique-se de que o ZK Studio está transmitindo
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Animação de pulse para o indicador AO VIVO */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
