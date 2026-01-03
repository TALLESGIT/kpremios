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

  // Offline state - mas ainda tenta mostrar o player se houver dados
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

  // Se a live não está ativa, mas temos dados, ainda tenta mostrar (pode estar iniciando)
  if (status === 'OFFLINE' || !data.is_active) {
    // Mesmo offline, tenta mostrar o player (pode estar iniciando ou com problema de status)
    console.log('⚠️ LiveViewer: Stream marcada como offline, mas tentando mostrar player...');
    
    // Se não mostrar mensagem offline, tenta usar o player mesmo assim
    if (!showOfflineMessage) {
      const hasHlsUrl = data.hls_url && data.hls_url.trim() !== '';
      
      // SEMPRE preferir HLS em mobile se disponível (mais rápido e confiável)
      if (isMobile && hasHlsUrl) {
        console.log('📱 LiveViewer: Mobile detectado, usando HLS (mais rápido)');
        return (
          <div className={`relative w-full h-full ${className}`}>
            <HLSViewer hlsUrl={data.hls_url!} fitMode={fitMode} />
          </div>
        );
      }
      
      // Para zktv, usar "ZkPremios" como canal do Agora
      const agoraChannel = data.channel_name === 'zktv' ? 'ZkPremios' : data.channel_name;
      
      return (
        <div className={`relative w-full h-full ${className}`}>
          <ZKViewerOptimized
            channel={agoraChannel}
          />
        </div>
      );
    }
    
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

  // Desktop ou sem HLS → usar ZKViewerOptimized (RTC com interação do usuário)
  // IMPORTANTE: Para zktv, sempre usar "ZkPremios" como canal do Agora
  // O channel_name no banco é "zktv", mas o canal do Agora é "ZkPremios"
  const agoraChannel = data.channel_name === 'zktv' ? 'ZkPremios' : data.channel_name;
  
  console.log('🖥️ LiveViewer: Usando ZKViewerOptimized (RTC)', {
    channel_name: data.channel_name,
    agoraChannel: agoraChannel,
    is_active: data.is_active,
    hasHlsUrl
  });
  
  return (
    <div className={`relative w-full h-full ${className}`}>
      <ZKViewerOptimized
        channel={agoraChannel}
      />
    </div>
  );
}

