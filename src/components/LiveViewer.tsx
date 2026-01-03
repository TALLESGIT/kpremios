import { useLiveStatus } from '../hooks/useLiveStatus';
import { HLSViewer } from './HLSViewer';
import ZKViewerOptimized from './ZKViewerOptimized';

interface LiveViewerProps {
  channelName?: string;
  fitMode?: 'contain' | 'cover';
  className?: string;
  showOfflineMessage?: boolean;
}

/**
 * Componente inteligente que decide qual player usar:
 * - Mobile + HLS URL disponível → HLSViewer (rápido, compatível)
 * - Desktop ou sem HLS → ZKViewerOptimized (RTC, baixa latência com interação do usuário)
 */
export function LiveViewer({
  channelName = 'zktv',
  fitMode = 'contain',
  className = '',
  showOfflineMessage = true,
}: LiveViewerProps) {
  const { data, status, loading, error } = useLiveStatus(channelName);

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

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

  // Offline state - total sem dados
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
  const isActuallyLive = status === 'LIVE' && data.is_active;

  // FORÇAR ZkPremios: O estúdio do administrador sempre transmite para este canal, 
  // independentemente do slug da live no link.
  const agoraChannel = 'ZkPremios';

  const renderContent = () => {
    // Se a live estiver offline e showOfflineMessage=true, mostrar mensagem offline
    if (!isActuallyLive && showOfflineMessage) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <div className="text-center space-y-4 px-8">
            <div className="text-6xl">📡</div>
            <h2 className="text-2xl font-black text-white uppercase italic">Live Offline</h2>
            <p className="text-slate-400 text-sm font-bold">A transmissão não está disponível no momento</p>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto"></div>
          </div>
        </div>
      );
    }

    // Caso contrário (está live OU showOfflineMessage=false), mostrar o player
    if (isMobile && hasHlsUrl) {
      console.log('📱 LiveViewer: Usando HLS para mobile');
      return <HLSViewer hlsUrl={data.hls_url!} fitMode={fitMode} />;
    }

    console.log('🖥️ LiveViewer: Usando ZKViewerOptimized (RTC)', {
      channel_name: data.channel_name,
      agoraChannel: agoraChannel,
      is_active: data.is_active,
      hasHlsUrl
    });

    return <ZKViewerOptimized channel={agoraChannel} fitMode={fitMode} />;
  };

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden group ${className}`}>
      {renderContent()}
    </div>
  );
}
