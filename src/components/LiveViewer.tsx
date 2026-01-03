import { useState } from 'react';
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
  const [initialPlayRequested, setInitialPlayRequested] = useState(false);

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

  const hasHlsUrl = data.hls_url && data.hls_url.trim() !== '';

  // Se a live não está ativa, mas temos dados, ainda tenta mostrar (pode estar iniciando)
  if (status === 'OFFLINE' || !data.is_active) {
    // Mesmo offline, tenta mostrar o player (pode estar iniciando ou com problema de status)
    console.log('⚠️ LiveViewer: Stream marcada como offline, mas tentando mostrar player...');

    // Se não mostrar mensagem offline, tenta usar o player mesmo assim
    if (!showOfflineMessage) {
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

  const agoraChannel = data.channel_name === 'zktv' ? 'ZkPremios' : data.channel_name;

  const handleInteraction = () => {
    setInitialPlayRequested(true);
  };

  const renderContent = () => {
    // SEMPRE preferir HLS em mobile se disponível (mais rápido e confiável)
    if (isMobile && hasHlsUrl) {
      console.log('📱 LiveViewer: Usando HLS para mobile');
      return <HLSViewer hlsUrl={data.hls_url!} fitMode={fitMode} initialInteracted={initialPlayRequested} />;
    }

    console.log('🖥️ LiveViewer: Usando ZKViewerOptimized (RTC)', {
      channel_name: data.channel_name,
      agoraChannel: agoraChannel,
      is_active: data.is_active,
      hasHlsUrl
    });

    return <ZKViewerOptimized channel={agoraChannel} initialInteracted={initialPlayRequested} />;
  };

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden group ${className}`}>
      {renderContent()}

      {/* 🚀 OVERLAY INICIAL DE PLAY - CRÍTICO PARA AUTOPLAY EM MOBILE/DESKTOP */}
      {!initialPlayRequested && (
        <div
          className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer transition-all hover:bg-black/30"
          onClick={handleInteraction}
        >
          <div className="relative group/play">
            {/* Efeito de pulso no background do botão */}
            <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping group-hover/play:bg-rose-500/30" />

            <button
              onClick={handleInteraction}
              className="relative w-24 h-24 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(225,29,72,0.4)] transition-all group-hover/play:scale-110 group-hover/play:rotate-3 active:scale-95"
            >
              <div className="ml-1.5 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent" />
            </button>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="text-white text-2xl font-black uppercase italic tracking-tighter drop-shadow-lg">
              Toque para assistir
            </span>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
                AO VIVO AGORA
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

