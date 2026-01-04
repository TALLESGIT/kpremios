import { useLiveStatus } from '../hooks/useLiveStatus';
import LiveHlsPlayer from './LiveHlsPlayer';

interface LiveViewerProps {
  channelName?: string;
  fitMode?: 'contain' | 'cover';
  className?: string;
  showOfflineMessage?: boolean;
}

/**
 * Componente que exibe a live stream usando apenas HLS (sem WebRTC)
 * HLS é usado para todos os dispositivos (mobile e desktop)
 */
export function LiveViewer({
  channelName = 'zktv',
  fitMode = 'contain',
  className = '',
  showOfflineMessage = true,
}: LiveViewerProps) {
  const { data, status, loading, error } = useLiveStatus(channelName);

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full bg-black ${className}`}>
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white text-sm font-medium">Carregando live...</p>
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
          <p className="text-white text-sm font-medium">Erro ao carregar live</p>
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
          <div className="text-6xl">📡</div>
          <h2 className="text-2xl font-black text-white uppercase italic">Live Offline</h2>
          <p className="text-slate-400 text-sm font-bold">A transmissão não está disponível no momento</p>
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  const hasHlsUrl = data.hls_url && data.hls_url.trim() !== '';
  const isActuallyLive = data.is_active;

  // Renderizar LiveHlsPlayer com HLS
  // O player trata internamente os estados: offline, waiting_hls, loading, playing, error
  return (
    <div className={className}>
      <LiveHlsPlayer
        hlsUrl={hasHlsUrl ? data.hls_url! : null}
        isLive={isActuallyLive}
      />
    </div>
  );
}
