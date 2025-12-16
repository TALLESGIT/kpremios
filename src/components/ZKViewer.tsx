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
          if (state === 'CONNECTED') setConnectionState('connected');
        });

        client.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
          if (!mounted) return;

          console.log('🎬 ZKViewer: user-published', { uid: user.uid, mediaType });

          try {
            await client.subscribe(user, mediaType);
            console.log('✅ ZKViewer: Subscribe realizado com sucesso', mediaType);

            if (mediaType === 'video' && user.videoTrack) {
              videoTrackRef.current = user.videoTrack;
              console.log('🎥 ZKViewer: Reproduzindo vídeo...', {
                trackId: user.videoTrack.getTrackId(),
                enabled: user.videoTrack.enabled,
              });
              await user.videoTrack.play(containerRef.current!);
              setIsLive(true);
              console.log('✅ ZKViewer: Vídeo reproduzindo!');
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
          console.log('📴 ZKViewer: user-unpublished', { uid: user.uid, mediaType });
          if (mediaType === 'video') {
            setIsLive(false);
          }
        });

        await client.setClientRole('audience');
        console.log('🔌 ZKViewer: Conectando ao canal...', { channel });
        await client.join(agoraAppId, channel, agoraToken, null);
        console.log('✅ ZKViewer: Conectado ao canal!', { channel });
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
      background: 'black',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {!isLive && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '18px',
          textAlign: 'center',
          zIndex: 10
        }}>
          ⏳ Aguardando transmissão...
        </div>
      )}
      <div 
        ref={containerRef} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%', 
          height: '100%',
          zIndex: isLive ? 1 : 0
        }} 
      />
    </div>
  );
}
