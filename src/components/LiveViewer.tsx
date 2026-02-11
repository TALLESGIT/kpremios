import { useEffect } from 'react';
import { useLiveStatus } from '../hooks/useLiveStatus';
import { HLSViewer } from './HLSViewer';
import ZKViewer from './ZKViewer';

const isLiveViewerDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';

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
 * - Mobile + HLS URL disponível → HLSViewer
 * - Desktop ou sem HLS → ZKViewer (Agora.io)
 */
export function LiveViewer({
  channelName = 'zktv',
  fitMode = 'contain',
  className = '',
  showOfflineMessage = true,
  isAdmin = false,
  enabled = true,
  showPerf = false,
}: LiveViewerProps) {


  const { data, loading, error } = useLiveStatus(channelName);

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

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

  const hasHlsUrl = data.hls_url && data.hls_url.trim() !== '';
  const isActuallyLive = data.is_active;

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

    // REGRA HÍBRIDA:
    // Mobile + HLS disponível -> HLSViewer
    if (isMobile && hasHlsUrl) {
      if (isLiveViewerDebug()) console.log('📱 LiveViewer: Usando HLS para mobile');
      return <HLSViewer hlsUrl={data.hls_url!} fitMode={fitMode} showPerf={showPerf} />;
    }

    // Tudo o resto -> ZKViewer (Agora.io)
    // ✅ CORREÇÃO: Forçar conexão no canal "ZkPremios" onde o ZK Studio transmite
    const agoraChannel = 'ZkPremios';

    if (isLiveViewerDebug()) console.log('🖥️ LiveViewer: Usando Agora.io (ZKViewer)', {
      dbChannel: data.channel_name || channelName,
      agoraChannel,
      isMobile,
      hasHlsUrl,
      isAdmin
    });

    return (
      <ZKViewer
        channel={agoraChannel}
        fitMode={fitMode}
        muteAudio={isAdmin}
        enabled={enabled && (isActuallyLive || isAdmin)}
      />
    );
  };

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden group ${className}`}>
      {renderContent()}
    </div>
  );
}