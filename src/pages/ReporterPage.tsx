import { useState, useEffect, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack, ICameraVideoTrack } from 'agora-rtc-sdk-ng';
import { Mic, MicOff, Video, VideoOff, Activity, Radio, User, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const APP_ID = "1e4cb25acbd349c6a540d0c0e1b13931";
const CHANNEL = "ZkPremios";

export default function ReporterPage() {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [reporterName, setReporterName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  // Initialize Agora Client
  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ mode: "live", codec: "h264" });
    setClient(agoraClient);

    return () => {
      if (localAudioTrack) localAudioTrack.close();
      if (localVideoTrack) localVideoTrack.close();
      if (agoraClient) agoraClient.leave();
    };
  }, []);

  // Initialize Local Media
  const initLocalMedia = async () => {
    try {
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: "high_quality_stereo" },
        { encoderConfig: "720p_1" }
      );

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      if (videoRef.current) {
        videoTrack.play(videoRef.current);
      }
    } catch (err: any) {
      console.error("Erro ao acessar mídia:", err);
      setError("Permita o acesso à câmera e microfone para continuar.");
    }
  };

  useEffect(() => {
    initLocalMedia();
  }, [videoRef.current]);

  // Toggle Mic
  const toggleMic = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setMuted(isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  // Toggle Cam
  const toggleCam = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setMuted(isCamOn);
      setIsCamOn(!isCamOn);
    }
  };

  // Join Channel
  const handleJoin = async () => {
    if (!client || !localAudioTrack || !localVideoTrack) return;

    try {
      await client.setClientRole("host");
      await client.join(APP_ID, CHANNEL, null, null);
      await client.publish([localAudioTrack, localVideoTrack]);
      setIsConnected(true);
      setError(null);
    } catch (err: any) {
      console.error("Error joining:", err);
      setError("Falha ao conectar. Verifique sua conexão.");
    }
  };

  // Leave Channel
  const handleLeave = async () => {
    if (!client) return;
    try {
      await client.leave();
      setIsConnected(false);
    } catch (err) {
      console.error("Error leaving:", err);
    }
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center justify-center p-4 selection:bg-blue-500/30">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-lg space-y-6"
      >

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            Acesso Restrito
          </div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            ZK Studio Mobile
          </h1>
          <p className="text-neutral-500 text-sm font-medium">
            Painel de Transmissão Remota
          </p>
        </div>

        {/* Monitor Area */}
        <div className="relative group rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl shadow-black/50 aspect-video">

          {/* Video Player */}
          <div ref={videoRef} className="w-full h-full object-cover bg-neutral-900" />

          {/* Overlays */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-colors duration-300 ${isConnected ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-neutral-500'}`} />
              {isConnected ? 'AO VIVO' : 'OFFLINE'}
            </div>

            {reporterName && (
              <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 flex items-center gap-1.5">
                <User className="w-3 h-3 text-blue-400" />
                {reporterName}
              </div>
            )}
          </div>

          {!localVideoTrack && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-neutral-400 text-xs font-medium uppercase tracking-widest">Iniciando Câmera...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 backdrop-blur-sm z-10 p-6 text-center">
              <div>
                <Activity className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <p className="text-red-200 text-sm">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-100 text-xs font-bold rounded-lg transition-colors border border-red-800"
                >
                  TENTAR NOVAMENTE
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls - Only show input when not connected */}
        <div className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-2xl backdrop-blur-xl">
          {!isConnected && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Identificação</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Seu nome (ex: Repórter 1)"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-600 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={toggleMic}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-300 border ${isMicOn ? 'bg-neutral-800/50 border-neutral-700 text-white hover:bg-neutral-800' : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'}`}
            >
              <div className={`p-2 rounded-full ${isMicOn ? 'bg-neutral-700' : 'bg-red-500/20'}`}>
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider">{isMicOn ? 'Microfone Ativo' : 'Microfone Mudo'}</span>
            </button>

            <button
              onClick={toggleCam}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-300 border ${isCamOn ? 'bg-neutral-800/50 border-neutral-700 text-white hover:bg-neutral-800' : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'}`}
            >
              <div className={`p-2 rounded-full ${isCamOn ? 'bg-neutral-700' : 'bg-red-500/20'}`}>
                {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider">{isCamOn ? 'Câmera Ativa' : 'Câmera Off'}</span>
            </button>
          </div>

          <button
            onClick={isConnected ? handleLeave : handleJoin}
            disabled={!localAudioTrack || !localVideoTrack}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg flex items-center justify-center gap-2 group
              ${isConnected
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/30'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isConnected ? (
              <>
                <Radio className="w-5 h-5 animate-pulse" /> Encerrar Transmissão
              </>
            ) : (
              <>
                <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" /> Entrar no Ar
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-neutral-600 text-center font-mono">
          App ID: ...{APP_ID.slice(-4)} • Channel: {CHANNEL} • v2.0.0
        </p>

      </motion.div>
    </div>
  );
}
