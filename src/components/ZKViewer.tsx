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

            await client.subscribe(user, mediaType);

          if (mediaType === 'video' && user.videoTrack) {
            videoTrackRef.current = user.videoTrack;
            setIsLive(true);
            user.videoTrack.play(containerRef.current!);
          }

          if (mediaType === 'audio' && user.audioTrack) {
            audioTrackRef.current = user.audioTrack;
            user.audioTrack.play();
          }
        });

        client.on('user-unpublished', () => {
          setIsLive(false);
        });

        await client.setClientRole('audience');
        await client.join(agoraAppId, channel, agoraToken, null);
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
    <div style={{ width: '100%', height: '100%', background: 'black' }}>
      {!isLive && <div>🔴 Transmissão offline</div>}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
