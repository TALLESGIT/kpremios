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
}

const ZKViewerOptimized: React.FC<ZKViewerOptimizedProps> = ({
  channel,
  token = null,
  initialInteracted = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const hasJoinedRef = useRef(false);

  const videoTrackRef = useRef<IRemoteVideoTrack | null>(null);
  const audioTrackRef = useRef<IRemoteAudioTrack | null>(null);

  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [connected, setConnected] = useState(false);

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

    await clientRef.current.subscribe(user, mediaType);

    if (mediaType === 'video' && user.videoTrack && containerRef.current) {
      videoTrackRef.current = user.videoTrack;

      // PLAY VIDEO MUTED (ALWAYS)
      await user.videoTrack.play(containerRef.current);
      // Mutar o elemento de vídeo diretamente
      const videoEl = containerRef.current.querySelector('video');
      if (videoEl) {
        videoEl.muted = true;
      }

      console.log('🎥 Vídeo recebido (mutado)');
      setNeedsInteraction(true);
    }

    if (mediaType === 'audio' && user.audioTrack) {
      audioTrackRef.current = user.audioTrack;
      console.log('🔇 Áudio recebido (aguardando clique)');
    }
  };

  // ---------------------------
  // USER UNPUBLISHED
  // ---------------------------
  const handleUserUnpublished = (
    _user: IAgoraRTCRemoteUser,
    mediaType: 'video' | 'audio'
  ) => {
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
    console.log('▶️ Usuário clicou para assistir');

    AgoraRTC.resumeAudioContext();

    // garante vídeo
    if (videoTrackRef.current && containerRef.current) {
      videoTrackRef.current.play(containerRef.current);
    }

    // libera áudio
    if (audioTrackRef.current) {
      audioTrackRef.current.play();
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
