import { useEffect, useRef, useState } from 'react';
// @ts-ignore - livekit-client tem tipos mas TypeScript tem problema com exports ESM
import { Room, RoomEvent, RemoteParticipant, Track, RemoteTrack, RemoteTrackPublication } from 'livekit-client';

interface LiveKitViewerProps {
  roomName: string;
  fitMode?: 'contain' | 'cover';
  muteAudio?: boolean;
  enabled?: boolean;
}

export default function LiveKitViewer({
  roomName,
  fitMode = 'contain',
  muteAudio = false,
  enabled = true,
}: LiveKitViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://zkoficial-6xokn1hv.livekit.cloud';

  const getLiveKitToken = async (room: string, role: 'viewer' | 'admin' | 'reporter' = 'viewer'): Promise<string> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase credentials não configuradas');
      }

      console.log('🎫 LiveKitViewer: Buscando token do LiveKit...', { room, role });

      const response = await fetch(`${supabaseUrl}/functions/v1/livekit-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          room,
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro ao obter token: ${response.status} - ${errorData.error || 'Erro desconhecido'}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error('Token não retornado na resposta');
      }

      console.log('✅ LiveKitViewer: Token obtido com sucesso');
      return data.token;
    } catch (err: any) {
      console.error('❌ LiveKitViewer: Erro ao obter token:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (!enabled || !roomName) return;

    let mounted = true;
    let room: Room | null = null;

    const connect = async () => {
      try {
        setError(null);
        console.log('🔌 LiveKitViewer: Conectando ao LiveKit...', { roomName, livekitUrl });

        const token = await getLiveKitToken(roomName, 'viewer');

        room = new Room({
          adaptiveStream: true,
          dynacast: true,
          // ✅ NOVO: Garantir que auto-subscribe está ativo (padrão é true, mas explicitamos)
          // O LiveKit faz auto-subscribe por padrão, mas vamos garantir
        });
        roomRef.current = room;

        // ✅ CORREÇÃO: Usar RoomEvent.TrackSubscribed (não participant.on)
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (!mounted || !videoRef.current) return;

          console.log('📹 LiveKitViewer: Track subscrita', {
            kind: track.kind,
            participantIdentity: participant.identity,
            trackName: publication.trackName,
            source: publication.source
          });

          if (track.kind === Track.Kind.Video) {
            console.log('📹 LiveKitViewer: Vídeo track recebido de', participant.identity);
            track.attach(videoRef.current);
            setHasVideo(true);
            if (videoRef.current) {
              videoRef.current.style.objectFit = fitMode;
            }
          } else if (track.kind === Track.Kind.Audio && !muteAudio) {
            console.log('🔊 LiveKitViewer: Áudio track recebido de', participant.identity);
            track.attach();
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (!mounted) return;
          if (track.kind === Track.Kind.Video) {
            console.log('📹 LiveKitViewer: Vídeo track removido');
            track.detach();
            setHasVideo(false);
          } else if (track.kind === Track.Kind.Audio) {
            track.detach();
          }
        });

        room.on(RoomEvent.Connected, async () => {
          if (!mounted) return;
          console.log('✅ LiveKitViewer: Conectado ao LiveKit');
          setIsConnected(true);

          // ✅ CORREÇÃO: Verificar participantes já conectados usando videoTrackPublications
          const remoteParticipants = Array.from(room.remoteParticipants.values());
          console.log(`👥 LiveKitViewer: ${remoteParticipants.length} participante(s) já conectado(s)`);

          for (const participant of remoteParticipants) {
            console.log('👤 LiveKitViewer: Verificando participante:', {
              identity: participant.identity,
              sid: participant.sid,
              videoTracks: Array.from(participant.videoTrackPublications.values()).length,
              audioTracks: Array.from(participant.audioTrackPublications.values()).length
            });

            // ✅ CORREÇÃO: Usar videoTrackPublications e audioTrackPublications
            const videoPubs = Array.from(participant.videoTrackPublications.values());
            const audioPubs = Array.from(participant.audioTrackPublications.values());

            // ✅ NOVO: Faz subscribe manual de todas as tracks não subscritas
            const needsSubscribe = [...videoPubs, ...audioPubs].some(pub => !pub.isSubscribed);
            if (needsSubscribe) {
              console.log(`🔄 LiveKitViewer: Fazendo subscribe manual de todas as tracks de ${participant.identity}`);
              try {
                await room.localParticipant.setSubscribed(participant.sid, true);
                console.log(`✅ LiveKitViewer: Subscribe manual solicitado para ${participant.identity}`);
              } catch (subErr) {
                console.error(`⚠️ LiveKitViewer: Erro ao fazer subscribe manual:`, subErr);
              }
            }

            // Verificar tracks de vídeo já publicadas e subscritas
            for (const pub of videoPubs) {
              if (pub.track && pub.track.kind === Track.Kind.Video && pub.isSubscribed) {
                if (!mounted || !videoRef.current) return;
                console.log('📹 LiveKitViewer: Vídeo track encontrado em participante existente:', participant.identity);
                pub.track.attach(videoRef.current);
                setHasVideo(true);
                if (videoRef.current) {
                  videoRef.current.style.objectFit = fitMode;
                }
              } else if (!pub.isSubscribed) {
                console.log(`⏳ LiveKitViewer: Aguardando subscribe da track de vídeo ${pub.trackName} de ${participant.identity}`);
              }
            }

            // Verificar tracks de áudio já publicadas e subscritas
            if (!muteAudio) {
              for (const pub of audioPubs) {
                if (pub.track && pub.track.kind === Track.Kind.Audio && pub.isSubscribed) {
                  console.log('🔊 LiveKitViewer: Áudio track encontrado em participante existente:', participant.identity);
                  pub.track.attach();
                } else if (!pub.isSubscribed) {
                  console.log(`⏳ LiveKitViewer: Aguardando subscribe da track de áudio ${pub.trackName} de ${participant.identity}`);
                }
              }
            }
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          if (!mounted) return;
          console.log('🔌 LiveKitViewer: Desconectado do LiveKit');
          setIsConnected(false);
          setHasVideo(false);
        });

        // ✅ CORREÇÃO: Usar RoomEvent.ParticipantConnected (não participant.on)
        room.on(RoomEvent.ParticipantConnected, async (participant: RemoteParticipant) => {
          if (!mounted) return;
          console.log('👤 LiveKitViewer: Participante conectado:', {
            identity: participant.identity,
            sid: participant.sid,
            videoTracks: Array.from(participant.videoTrackPublications.values()).length,
            audioTracks: Array.from(participant.audioTrackPublications.values()).length
          });

          // ✅ CORREÇÃO: Verificar tracks já publicadas usando videoTrackPublications
          const videoPubs = Array.from(participant.videoTrackPublications.values());
          const audioPubs = Array.from(participant.audioTrackPublications.values());

          // ✅ NOVO: Faz subscribe manual de todas as tracks não subscritas
          const needsSubscribe = [...videoPubs, ...audioPubs].some(pub => !pub.isSubscribed);
          if (needsSubscribe) {
            console.log(`🔄 LiveKitViewer: Fazendo subscribe manual de todas as tracks de ${participant.identity}`);
            try {
              await room.localParticipant.setSubscribed(participant.sid, true);
              console.log(`✅ LiveKitViewer: Subscribe manual solicitado para ${participant.identity}`);
            } catch (subErr) {
              console.error(`⚠️ LiveKitViewer: Erro ao fazer subscribe manual:`, subErr);
            }
          }

          // Verifica tracks já subscritas e anexa ao vídeo
          for (const pub of videoPubs) {
            if (pub.track && pub.track.kind === Track.Kind.Video) {
              if (!mounted || !videoRef.current) return;
              console.log('📹 LiveKitViewer: Vídeo track encontrado ao conectar participante:', participant.identity);
              pub.track.attach(videoRef.current);
              setHasVideo(true);
              if (videoRef.current) {
                videoRef.current.style.objectFit = fitMode;
              }
            } else if (!pub.isSubscribed) {
              console.log(`⏳ LiveKitViewer: Aguardando subscribe da track de vídeo ${pub.trackName} de ${participant.identity}`);
            }
          }

          if (!muteAudio) {
            for (const pub of audioPubs) {
              if (pub.track && pub.track.kind === Track.Kind.Audio) {
                console.log('🔊 LiveKitViewer: Áudio track encontrado ao conectar participante:', participant.identity);
                pub.track.attach();
              } else if (!pub.isSubscribed) {
                console.log(`⏳ LiveKitViewer: Aguardando subscribe da track de áudio ${pub.trackName} de ${participant.identity}`);
              }
            }
          }
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          if (!mounted) return;
          console.log('👋 LiveKitViewer: Participante desconectado:', participant.identity);
          setHasVideo(false);
        });

        // ✅ NOVO: Listener para TrackPublished (quando uma track é publicada)
        room.on(RoomEvent.TrackPublished, async (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (!mounted) return;
          console.log('📢 LiveKitViewer: Track publicada', {
            trackName: publication.trackName,
            source: publication.source,
            kind: publication.kind,
            participantIdentity: participant.identity,
            isSubscribed: publication.isSubscribed
          });

          // ✅ CORREÇÃO: Faz subscribe manual se a track não estiver subscrita
          if (!publication.isSubscribed && (publication.kind === Track.Kind.Video || publication.kind === Track.Kind.Audio)) {
            console.log(`🔄 LiveKitViewer: Fazendo subscribe manual da track ${publication.trackName} de ${participant.identity}`);
            try {
              // Faz subscribe manual usando setSubscribed
              await room.localParticipant.setSubscribed(participant.sid, true);
              console.log(`✅ LiveKitViewer: Subscribe manual solicitado para ${participant.identity}`);
            } catch (subErr) {
              console.error(`⚠️ LiveKitViewer: Erro ao fazer subscribe manual:`, subErr);
            }
          }
        });

        await room.connect(livekitUrl, token);
        console.log('✅ LiveKitViewer: Conectado e aguardando participantes...');

      } catch (err: any) {
        if (!mounted) return;
        console.error('❌ LiveKitViewer: Erro ao conectar:', err);
        setError(err.message || 'Erro ao conectar ao LiveKit');
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      mounted = false;
      if (room) {
        console.log('🔌 LiveKitViewer: Desconectando...');
        room.disconnect();
        roomRef.current = null;
      }
    };
  }, [roomName, enabled, fitMode, muteAudio, livekitUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muteAudio;
    }
  }, [muteAudio]);

  if (error) {
    return (
      <div ref={containerRef} className="flex items-center justify-center h-full bg-black text-white">
        <div className="text-center space-y-2 px-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-sm font-medium">Erro ao conectar ao LiveKit</p>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !hasVideo) {
    return (
      <div ref={containerRef} className="flex items-center justify-center h-full bg-black text-white">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-sm font-medium">
            {!isConnected ? 'Conectando ao LiveKit...' : 'Aguardando transmissão...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muteAudio}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fitMode,
          background: '#000',
        }}
      />
    </div>
  );
}