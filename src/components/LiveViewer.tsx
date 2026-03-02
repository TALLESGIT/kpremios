import { useState } from 'react';
import { useLiveStatus } from '../hooks/useLiveStatus';
import { DEFAULT_LIVE_CHANNEL } from '../config/constants';
import WhepPlayer from './WhepPlayer';
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
 * - VITE_WHEP_BASE_URL configurado → WhepPlayer (baixa latência)
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
  const [fallbackToHls, setFallbackToHls] = useState(false);
  const [fallbackToAgora, setFallbackToAgora] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full bg-black ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white mx-auto" />
          <p className="text-white/90 text-sm font-medium tracking-wide">Estabelecendo conexão</p>
          <p className="text-white/50 text-xs">Aguarde um momento</p>
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
        <div className="text-center space-y-5 px-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-wide">A transmissão começará em breve</h2>
            <p className="text-white/50 text-sm mt-1">Sintonizando canal ao vivo</p>
          </div>
          <div className="w-12 h-0.5 bg-white/20 rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  const isActuallyLive = data.is_active;
  const effectiveStreamName = data.channel_name || DEFAULT_LIVE_CHANNEL || 'ZkOficial';
  const whepBaseUrl = (import.meta.env.VITE_WHEP_BASE_URL as string | undefined)?.trim();

  const renderContent = () => {
    // Live encerrada — overlay imediato (Realtime sincroniza com backend)
    if (!isActuallyLive && showOfflineMessage) {
      return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-white/10 flex items-center justify-center bg-white/5">
                <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="text-center space-y-3 px-8 max-w-sm">
              <h3 className="text-white font-semibold text-lg tracking-tight">
                Transmissão encerrada
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Obrigado por assistir! A transmissão chegou ao fim.
                <br />
                Fique atento para as próximas lives.
              </p>
            </div>
            <div className="w-16 h-0.5 bg-white/10 rounded-full" />
          </div>
        </div>
      );
    }

    // Prioridade: WebRTC (WHEP) se configurado → HLS se hls_url disponível → Agora (ZKViewer)
    // MediaMTX sempre recebe em live/ZkOficial (Stream Key do ZK Studio), independente do channel_name no DB
    if (whepBaseUrl && !fallbackToHls && !fallbackToAgora) {
      return (
        <WhepPlayer
          channelName={DEFAULT_LIVE_CHANNEL}
          fitMode={fitMode}
          pathPrefix="live"
          isAdmin={isAdmin}
          expectLive={isActuallyLive}
          onError={(err) => {
            console.warn('⚠️ WHEP falhou, tentando fallback para HLS...', err);
            setFallbackToHls(true);
          }}
        />
      );
    }

    if (data.hls_url && !fallbackToAgora) {
      return (
        <HLSViewer
          hlsUrl={data.hls_url}
          fitMode={fitMode}
          className="w-full h-full"
          isAdmin={isAdmin}
          onError={() => {
            console.warn('⚠️ HLS falhou, tentando fallback para Agora...');
            setFallbackToAgora(true);
          }}
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