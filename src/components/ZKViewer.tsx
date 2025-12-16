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

  const [connectionState, setConnectionState] = useState<
    'idle' | 'connecting' | 'connected'
  >('idle');
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * INIT AGORA — RODA UMA ÚNICA VEZ
   */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (clientRef.current) return;

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

          try {
            await client.subscribe(user, mediaType);

            if (mediaType === 'video') {
              videoTrackRef.current = user.videoTrack!;
              setIsLive(true);

              if (containerRef.current) {
                videoTrackRef.current.play(containerRef.current);
              }
            }

            if (mediaType === 'audio') {
              audioTrackRef.current = user.audioTrack!;
              audioTrackRef.current.play();
            }
          } catch (err) {
            console.error('Erro ao subscribir:', err);
          }
        });

        client.on('user-unpublished', () => {
          setIsLive(false);
        });

        await client.setClientRole('audience');
        await client.join(appId, channel, token || null, null);
      } catch (err) {
        console.error(err);
        setError('Erro ao conectar à transmissão');
      }
    };

    init();

    /**
     * CLEANUP — SÓ QUANDO O COMPONENTE MORRER
     */
    return () => {
      mounted = false;

      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current = null;
      }

      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      }

      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        clientRef.current.leave();
        clientRef.current = null;
      }
    };
  }, []); // 👈 NUNCA colocar deps aqui

  /**
   * UI
   */
  if (error) {
    return (
      <div className="zk-viewer-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="zk-viewer-root">
      {!isLive && (
        <div className="zk-viewer-offline">
          <span>🔴 Transmissão offline</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="zk-viewer-video"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
        }}
      />

      {connectionState === 'connecting' && (
        <div className="zk-viewer-connecting">
          <span>Conectando...</span>
        </div>
      )}
    </div>
  );
}
