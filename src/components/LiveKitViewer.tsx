import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant, TrackPublication } from 'livekit-client';
import { supabase } from '../lib/supabase';

interface LiveKitViewerProps {
  roomName: string;
  fitMode?: 'contain' | 'cover';
  muteAudio?: boolean;
  enabled?: boolean;
}

/**
 * Viewer LiveKit para substituir Agora RTC
 * Conecta ao LiveKit e exibe vídeo/áudio dos participantes remotos
 */
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

  // URL do LiveKit (WSS)
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://zkoficial-6xokn1hv.livekit.cloud';

  // Função para obter token do LiveKit via Edge Function
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

        // Obter token
        const token = await getLiveKitToken(roomName, 'viewer');

        // Criar e conectar à sala
        room = new Room();
        roomRef.current = room;

        // Configurar event listeners
        room.on(RoomEvent.Connected, () => {
          if (!mounted) return;
          console.log('✅ LiveKitViewer: Conectado ao LiveKit');
          setIsConnected(true);

          // Verificar participantes já conectados (ZK Studio pode já estar transmitindo)
          const remoteParticipants = room.remoteParticipants;
          console.log(`👥 LiveKitViewer: ${remoteParticipants.size} participante(s) já conectado(s)`);

          remoteParticipants.forEach((participant: RemoteParticipant) => {
            console.log('👤 LiveKitViewer: Verificando participante já conectado:', participant.identity);
            
            // Verificar tracks já publicadas (com verificação de null/undefined)
            if (participant.trackPublications && participant.trackPublications.size > 0) {
              participant.trackPublications.forEach((publication: TrackPublication) => {
                if (publication.track && publication.kind === 'video') {
                  if (!mounted || !videoRef.current) return;
                  console.log('📹 LiveKitViewer: Vídeo track encontrado em participante existente');
                  publication.track.attach(videoRef.current);
                  setHasVideo(true);
                  if (videoRef.current) {
                    videoRef.current.style.objectFit = fitMode;
                  }
                } else if (publication.track && publication.kind === 'audio' && !muteAudio) {
                  console.log('🔊 LiveKitViewer: Áudio track encontrado em participante existente');
                  publication.track.attach();
                }
              });
            }

            // Subscribir a tracks futuras
            participant.on('trackSubscribed', (track, pub: TrackPublication) => {
              if (!mounted || !videoRef.current) return;

              if (track.kind === 'video') {
                console.log('📹 LiveKitViewer: Vídeo track recebido de participante existente');
                track.attach(videoRef.current);
                setHasVideo(true);
                if (videoRef.current) {
                  videoRef.current.style.objectFit = fitMode;
                }
              } else if (track.kind === 'audio' && !muteAudio) {
                console.log('🔊 LiveKitViewer: Áudio track recebido de participante existente');
                track.attach();
              }
            });
          });
        });

        room.on(RoomEvent.Disconnected, () => {
          if (!mounted) return;
          console.log('🔌 LiveKitViewer: Desconectado do LiveKit');
          setIsConnected(false);
          setHasVideo(false);
        });

        room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          if (!mounted) return;
          console.log('👤 LiveKitViewer: Participante conectado:', participant.identity);

          // Quando participante conecta, verificar se tem tracks de vídeo
          participant.on('trackSubscribed', (track, publication: TrackPublication) => {
            if (!mounted || !videoRef.current) return;

            if (track.kind === 'video') {
              console.log('📹 LiveKitViewer: Vídeo track recebido');
              track.attach(videoRef.current);
              setHasVideo(true);

              // Aplicar fitMode
              if (videoRef.current) {
                videoRef.current.style.objectFit = fitMode;
              }
            } else if (track.kind === 'audio' && !muteAudio) {
              console.log('🔊 LiveKitViewer: Áudio track recebido');
              track.attach();
            }
          });

          // Verificar tracks já existentes (com verificação de null/undefined)
          if (participant.trackPublications && participant.trackPublications.size > 0) {
            participant.trackPublications.forEach((publication: TrackPublication) => {
              if (publication.track && publication.kind === 'video') {
                if (!mounted || !videoRef.current) return;
                console.log('📹 LiveKitViewer: Vídeo track encontrado ao conectar participante');
                publication.track.attach(videoRef.current);
                setHasVideo(true);
                if (videoRef.current) {
                  videoRef.current.style.objectFit = fitMode;
                }
              } else if (publication.track && publication.kind === 'audio' && !muteAudio) {
                console.log('🔊 LiveKitViewer: Áudio track encontrado ao conectar participante');
                publication.track.attach();
              }
            });
          }
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          if (!mounted) return;
          console.log('👋 LiveKitViewer: Participante desconectado:', participant.identity);
          setHasVideo(false);
        });

        room.on(RoomEvent.TrackSubscribed, (track, publication: TrackPublication, participant: RemoteParticipant) => {
          if (!mounted || !videoRef.current) return;

          if (track.kind === 'video') {
            console.log('📹 LiveKitViewer: Vídeo track recebido');
            track.attach(videoRef.current);
            setHasVideo(true);

            // Aplicar fitMode
            if (videoRef.current) {
              videoRef.current.style.objectFit = fitMode;
            }
          } else if (track.kind === 'audio' && !muteAudio) {
            console.log('🔊 LiveKitViewer: Áudio track recebido');
            track.attach();
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (!mounted) return;
          if (track.kind === 'video') {
            console.log('📹 LiveKitViewer: Vídeo track removido');
            track.detach();
            setHasVideo(false);
          } else if (track.kind === 'audio') {
            track.detach();
          }
        });

        // Conectar à sala
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

  // Aplicar mute se necessário
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muteAudio;
    }
  }, [muteAudio]);

  // Se houver erro, mostrar mensagem
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

  // Se não está conectado ou não tem vídeo, mostrar loading
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
