import { useLiveStatus } from '../hooks/useLiveStatus';
import { HLSViewer } from './HLSViewer';
import LiveKitViewer from './LiveKitViewer';

interface LiveViewerProps {
  channelName?: string;
  fitMode?: 'contain' | 'cover';
  className?: string;
  showOfflineMessage?: boolean;
  isAdmin?: boolean; // ✅ NOVO: Muta áudio quando admin está visualizando
}

/**
 * Componente inteligente que decide qual player usar:
 * - Mobile + HLS URL disponível → HLSViewer (RTC no mobile costuma ser instável/pesado)
 * - Desktop ou sem HLS → LiveKitViewer (RTC Nativo LiveKit, substitui Agora)
 */
export function LiveViewer({
  channelName = 'zktv',
  fitMode = 'contain',
  className = '',
  showOfflineMessage = true,
  isAdmin = false, // ✅ NOVO: Default false (usuários ouvem áudio normalmente)
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

  // Room do LiveKit - ZK Studio sempre transmite para 'ZkPremios' (canal fixo)
  // O channel_name é apenas para identificação da stream no banco, não o room do LiveKit
  const livekitRoom = 'ZkPremios';

  const renderContent = () => {
    // Se a live estiver offline e showOfflineMessage=true
    if (!isActuallyLive && showOfflineMessage) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <div className="text-center space-y-4 px-8">
            <div className="text-6xl">📡</div>
            <h2 className="text-2xl font-black text-white uppercase italic">Live Offline</h2>
            <p className="text-slate-400 text-sm font-bold">A transmissão foi finalizada</p>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto"></div>
          </div>
        </div>
      );
    }

    // REGRA HÍBRIDA:
    // Mobile + HLS disponível -> HLSViewer
    if (isMobile && hasHlsUrl) {
      console.log('📱 LiveViewer: Usando HLS para mobile');
      return <HLSViewer hlsUrl={data.hls_url!} fitMode={fitMode} />;
    }

    // Tudo o resto (ou se HLS falhar) -> LiveKit RTC Nativo
    console.log('🖥️ LiveViewer: Usando LiveKit RTC Nativo', {
      room: livekitRoom,
      isMobile,
      hasHlsUrl,
      isAdmin // ✅ LOG: Para debug
    });

    return (
      <LiveKitViewer 
        roomName={livekitRoom}
        fitMode={fitMode}
        muteAudio={isAdmin} // ✅ NOVO: Passa flag para mutar áudio
        enabled={isActuallyLive}
      />
    );
  };

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden group ${className}`}>
      {renderContent()}
    </div>
  );
}