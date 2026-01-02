import { useLiveStatus } from '../hooks/useLiveStatus';
import { HLSViewer } from './HLSViewer';
import ZKViewer from './ZKViewer';

interface LiveViewerProps {
  channelName?: string;
  fitMode?: 'contain' | 'cover';
  className?: string;
  showOfflineMessage?: boolean;
}

/**
 * Componente inteligente que decide qual player usar:
 * - Mobile + HLS URL disponível → HLSViewer (rápido, compatível)
 * - Desktop ou sem HLS → ZKViewer (RTC, baixa latência)
 */
export function LiveViewer({
  channelName = 'zktv',
  fitMode = 'contain',
  className = '',
  showOfflineMessage = true,
}: LiveViewerProps) {
  const { data, status, loading, error } = useLiveStatus(channelName);

  // Detectar se é mobile
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

  // Offline state
  if (!data || status === 'OFFLINE' || !data.is_active) {
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

  // Live está ativa - decidir qual player usar
  const hasHlsUrl = data.hls_url && data.hls_url.trim() !== '';

  // Mobile + HLS disponível → usar HLS
  if (isMobile && hasHlsUrl) {
    console.log('📱 LiveViewer: Usando HLS para mobile');
    return (
      <div className={`relative w-full h-full ${className}`}>
        <HLSViewer hlsUrl={data.hls_url!} fitMode={fitMode} />
      </div>
    );
  }

  // Desktop ou sem HLS → usar ZKViewer (RTC)
  console.log('🖥️ LiveViewer: Usando ZKViewer (RTC)');
  return (
    <div className={`relative w-full h-full ${className}`}>
      <ZKViewer
        channel={data.channel_name}
        fitMode={fitMode}
        enabled={data.is_active}
        muteAudio={false}
      />
    </div>
  );
}

