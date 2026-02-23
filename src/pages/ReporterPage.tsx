
import { useState, useEffect, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack, ICameraVideoTrack } from 'agora-rtc-sdk-ng';
import { Mic, MicOff, Video, VideoOff, ShieldCheck, Wifi, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';


const BACKSTAGE_CHANNEL = "ZkPremios_backstage";

export default function ReporterPage() {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  const videoRef = useRef<HTMLDivElement>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  // Inicializar Cliente Agora
  useEffect(() => {
    console.log("[REPORTER] Inicializando ZK Studio Mobile.");
    const agoraClient = AgoraRTC.createClient({ mode: "live", codec: "h264" });
    setClient(agoraClient);

    // Listener para retorno de áudio do estúdio
    agoraClient.on("user-published", async (user, mediaType) => {
      if (mediaType === "audio") {
        await agoraClient.subscribe(user, mediaType);
        user.audioTrack?.play();
        toast.success("Retorno de áudio do estúdio conectado!");
      }
    });

    return () => {
      if (localAudioTrack) localAudioTrack.close();
      if (localVideoTrack) localVideoTrack.close();
      if (agoraClient) agoraClient.leave();
    };
  }, []);

  // Inicializar Mídia Local e listar câmeras
  const initLocalMedia = async () => {
    try {
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: "high_quality_stereo" },
        { encoderConfig: "720p_1" }
      );

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      // Listar câmeras
      const devices = await AgoraRTC.getCameras();
      setCameras(devices);
      // Tentar encontrar a câmera atual para definir o índice correto
      const currentTrackLabel = videoTrack.getTrackLabel();
      const index = devices.findIndex(d => d.label === currentTrackLabel);
      if (index !== -1) setCurrentCameraIndex(index);

      if (videoRef.current) {
        videoTrack.play(videoRef.current);
      }
    } catch (err: any) {
      console.error("Erro ao acessar mídia:", err);
      if (err.code === "PERMISSION_DENIED") {
        toast.error("Permissão de câmera/microfone negada.");
      }
    }
  };

  const handleSwitchCamera = async () => {
    if (cameras.length < 2 || !localVideoTrack) return;

    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    const nextDevice = cameras[nextIndex];

    try {
      await localVideoTrack.setDevice(nextDevice.deviceId);
      setCurrentCameraIndex(nextIndex);
      toast.success(`Câmera alterada para: ${nextDevice.label || 'Camera ' + (nextIndex + 1)}`);
    } catch (e) {
      console.error("Erro ao trocar câmera:", e);
      toast.error("Erro ao trocar câmera");
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      initLocalMedia();
    }
  }, []);

  // Controles de Mídia
  const toggleMic = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setMuted(isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setMuted(isCamOn);
      setIsCamOn(!isCamOn);
    }
  };

  // Lógica de Conexão (Apenas Bastidores/Estúdio)
  const handleConnect = async () => {
    if (!client || !localAudioTrack || !localVideoTrack) {
      toast.error("Aguardando inicialização da câmera/microfone...");
      return;
    }

    try {
      if (isConnected) {
        await client.leave();
        setIsConnected(false);
        toast.success("Desconectado.");
        return;
      }

      const appId = import.meta.env.VITE_AGORA_APP_ID;
      const token = import.meta.env.VITE_AGORA_TOKEN || null;

      if (!appId) {
        toast.error("Agora App ID não configurado");
        return;
      }

      console.log(`[REPORTER] Enviando sinal para ZK STUDIO(Canal: ${BACKSTAGE_CHANNEL})`);

      // Verificar estado real da conexão antes de tentar conectar
      if (client.connectionState === 'CONNECTED' || client.connectionState === 'CONNECTING') {
        console.log('[REPORTER] Já conectado ou conectando. Atualizando estado local.');
        setIsConnected(true);
        // Se já estiver conectado, apenas garantir que as tracks estão publicadas
        if (client.localTracks.length === 0) {
          await client.publish([localAudioTrack, localVideoTrack]);
        }
        return;
      }

      await client.setClientRole('host');
      await client.join(appId, BACKSTAGE_CHANNEL, token, null);
      await client.publish([localAudioTrack, localVideoTrack]);

      setIsConnected(true);
      toast.success("Sinal enviado para o ZK Studio!");

    } catch (err: any) {
      console.error("Erro ao conectar:", err);
      toast.error("Erro de conexão");
    }
  };



  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle Fullscreen on Double Click
  const handleDoubleClick = () => {
    if (!videoRef.current) return;

    // Encontrar o container pai para tela cheia (o div com a classe relative group...)
    const container = videoRef.current.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center justify-center p-4 selection:bg-blue-500/30">
      <motion.div
        className={`w-full ${isFullscreen ? '' : 'max-w-lg space-y-6'}`}
      >
        {!isFullscreen && (
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              ZK Studio Mobile
            </div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Painel do Repórter
            </h1>
            <p className="text-neutral-500 text-sm font-medium">
              {isConnected ? '📡 Enviando sinal para o Estúdio' : '🔒 Aguardando conexão'}
            </p>
          </div>
        )}

        <div
          onDoubleClick={handleDoubleClick}
          className={`relative group overflow-hidden border transition-all duration-500 shadow-2xl shadow-black/50 aspect-video 
          ${isConnected ? 'border-green-500 shadow-green-500/20' : 'border-neutral-800'}
          ${isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen rounded-none' : 'rounded-2xl min-h-[300px]'}`}
        >

          <div ref={videoRef} className="w-full h-full bg-neutral-900" />

          {/* Status Overlay */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border 
              ${isConnected
                ? 'bg-green-500/20 border-green-500/30 text-green-400 animate-pulse'
                : 'bg-neutral-800/80 border-white/10 text-neutral-400'
              } `}>
              {isConnected ? 'ON AIR (STUDIO LINK)' : 'OFFLINE'}
            </div>

            {isConnected && (
              <div className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border bg-black/60 border-white/10 text-white/70 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Link Estável
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleMic}
                className={`p-4 rounded-full backdrop-blur-md transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} `}
              >
                {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>

              <button
                onClick={handleConnect}
                className={`px-8 py-4 rounded-2xl font-black text-sm tracking-widest shadow-lg transition-all transform hover:scale-105 uppercase
                  ${isConnected
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                  } `}
              >
                {isConnected ? 'CORTAR SINAL' : 'ENVIAR SINAL'}
              </button>

              <button
                onClick={toggleCam}
                className={`p-4 rounded-full backdrop-blur-md transition-all ${isCamOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} `}
              >
                {isCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>

              {cameras.length > 1 && (
                <button
                  onClick={handleSwitchCamera}
                  className="p-4 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Trocar Câmera"
                >
                  <RefreshCcw className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-neutral-600 text-[10px] uppercase tracking-widest">
            ID: {client?.uid || '...'} • CANAL: {BACKSTAGE_CHANNEL}
          </p>
        </div>

      </motion.div>
    </div>
  );
}

