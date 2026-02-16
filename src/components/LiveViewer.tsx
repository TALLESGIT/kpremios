import { useLiveStatus } from '../hooks/useLiveStatus';
import { DEFAULT_LIVE_CHANNEL } from '../config/constants';
import WebRTCViewer from './WebRTCViewer';
import { HLSViewer } from './HLSViewer';
import { ZKViewer } from './ZKViewer';

interface LiveViewerProps {
  channelName?: string;
  fitMode?: 'contain' | 'cover';
  className?: string;
  showOfflineMessage?: boolean;
  isAdmin?: boolean;
  enabled?: boolean;
  /** Mostra overlay FPS/GPU (vídeo) quando ?perf=1 na URL */
  showPerf?: boolean;
}

/**
 * Componente inteligente que decide qual player usar:
 * - VITE_WHEP_BASE_URL configurado → WebRTCViewer (baixa latência)
 * - hls_url disponível → HLSViewer
 * - Fallback → ZKViewer (Agora.io)
 */
export function LiveViewer({
  channelName = DEFAULT_LIVE_CHANNEL,
  fitMode = 'contain',
  className = '',
  showOfflineMessage = true,
  isAdmin = false,
  enabled = true,
  showPerf = false,
}: LiveViewerProps) {


  const { data, loading, error } = useLiveStatus(channelName);

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full bg-black ${className}`}>
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white text-sm font-medium">🚀 Preparando transmissão...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-black ${className}`}>
        <div className="text-center space-y-2 px-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-white text-sm font-medium">Ops! Algo deu errado.</p>
          <p className="text-slate-400 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  // Offline state - sem dados
  if (!data) {
    if (!showOfflineMessage) return null;

    return (
      <div className={`flex items-center justify-center h-full bg-black ${className}`}>
        <div className="text-center space-y-4 px-8">
          <div className="text-6xl animate-pulse">📡</div>
          <h2 className="text-2xl font-black text-white uppercase italic">Sinal Offline</h2>
          <p className="text-slate-400 text-sm font-bold">Aguardando início da transmissão... ⏳</p>
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  const isActuallyLive = data.is_active;
  const effectiveStreamName = data.channel_name || DEFAULT_LIVE_CHANNEL || 'ZkOficial';
  const whepBaseUrl = (import.meta.env.VITE_WHEP_BASE_URL as string | undefined)?.trim();

  const renderContent = () => {
    // Se a live estiver offline e showOfflineMessage=true
    if (!isActuallyLive && showOfflineMessage) {
      return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950">
          <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-700">
            {/* Ícone de Transmissão Encerrada */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-zinc-800 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-zinc-700 rounded-full" />
              </div>
            </div>

            <div className="text-center space-y-2 px-8">
              <h3 className="text-white font-bold tracking-widest uppercase text-sm">
                Transmissão Encerrada
              </h3>
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider max-w-xs mx-auto leading-relaxed">
                O evento chegou ao fim. Obrigado por assistir!
                <br />
                Fique atento para as próximas lives.
              </p>
            </div>

            {/* Linha decorativa discreta */}
            <div className="w-12 h-1 bg-zinc-900 rounded-full" />
          </div>
        </div>
      );
    }

    // Prioridade: WebRTC (WHEP) se configurado → HLS se hls_url disponível → Agora (ZKViewer)
    if (whepBaseUrl) {
      return <WebRTCViewer streamName={effectiveStreamName} />;
    }
    if (data.hls_url) {
      return (
        <HLSViewer
          hlsUrl={data.hls_url}
          fitMode={fitMode}
          className="w-full h-full"
        />
      );
    }
    return (
      <ZKViewer
        channel={effectiveStreamName}
        fitMode={fitMode}
        muteAudio={isAdmin}
      />
    );
  };

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden group ${className}`}>
      {renderContent()}
    </div>
  );
}