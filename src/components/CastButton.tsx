import { useState, useEffect, useRef, useCallback } from 'react';
import { Cast, Airplay, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLiveStatus } from '../hooks/useLiveStatus';
import { supabase } from '../lib/supabase';
import { DEFAULT_LIVE_CHANNEL } from '../config/constants';

interface CastButtonProps {
  videoUrl?: string;
  hlsUrl?: string;
  channelName?: string;
  className?: string;
}

/**
 * Componente de Cast Universal
 * O Cast SDK é carregado APENAS quando o usuário clica no botão,
 * evitando o erro chrome-extension://invalid/ no console.
 */
export const CastButton: React.FC<CastButtonProps> = ({
  videoUrl,
  hlsUrl,
  channelName = DEFAULT_LIVE_CHANNEL,
  className = ''
}) => {
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  const [isAirPlayAvailable, setIsAirPlayAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [castDevices, setCastDevices] = useState<any[]>([]);
  const [streamHlsUrl, setStreamHlsUrl] = useState<string | null>(null);
  const [sdkLoading, setSdkLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const castInitializedRef = useRef(false);

  const { data: liveData } = useLiveStatus(channelName);

  // Buscar HLS URL do banco de dados
  useEffect(() => {
    const fetchHlsUrl = async () => {
      try {
        const { data } = await supabase
          .from('live_streams')
          .select('hls_url')
          .eq('channel_name', channelName)
          .maybeSingle();

        if (data?.hls_url) {
          setStreamHlsUrl(data.hls_url);
        }
      } catch (error) {
        console.error('Erro ao buscar HLS URL:', error);
      }
    };

    fetchHlsUrl();
  }, [channelName]);

  // Detectar se há vídeo na página (sem carregar Cast SDK)
  const checkAirPlay = useCallback(() => {
    const video = document.querySelector('video');
    if (video) {
      videoRef.current = video;
      if ((video as any).webkitShowPlaybackTargetPicker) {
        setIsAirPlayAvailable(true);
      }
    }
  }, []);

  useEffect(() => {
    const video = document.querySelector('video');
    if (video) {
      videoRef.current = video;
      setIsCastAvailable(true); // Show cast button when video is present
    }

    checkAirPlay();

    const observer = new MutationObserver(() => {
      const v = document.querySelector('video');
      if (v && !videoRef.current) {
        videoRef.current = v;
        setIsCastAvailable(true);
      }
      checkAirPlay();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [checkAirPlay]);

  // Lazy-load Cast SDK — called ONLY on user click
  const loadCastSdk = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if ((window as any).__castSdkLoaded || document.querySelector('script[src*="cast_sender"]')) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      script.onload = () => {
        (window as any).__castSdkLoaded = true;
        resolve();
      };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }, []);

  const waitForCastFramework = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).cast?.framework) {
        resolve(true);
        return;
      }
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).cast?.framework) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts > 30) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    });
  };

  const initializeChromecast = () => {
    if (castInitializedRef.current) return;
    try {
      const castContext = (window as any).cast?.framework?.CastContext?.getInstance();
      if (castContext) {
        castContext.setOptions({
          receiverApplicationId: (window as any).chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845',
          autoJoinPolicy: (window as any).chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED,
        });

        castContext.addEventListener(
          (window as any).cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          (event: any) => {
            if (event.sessionState === (window as any).cast.framework.SessionState.SESSION_ENDED) {
              setIsCasting(false);
            }
          }
        );

        castContext.addEventListener(
          (window as any).cast.framework.CastContextEventType.AVAILABLE_CAST_DEVICES_CHANGED,
          () => {
            const devices = castContext.getCastDevices();
            setCastDevices(devices || []);
          }
        );

        castInitializedRef.current = true;
      }
    } catch (error) {
      console.log('Chromecast não disponível:', error);
    }
  };

  const resolveStreamUrl = (): string | null => {
    let url = hlsUrl || videoUrl || streamHlsUrl || liveData?.hls_url;

    if (!url) {
      const video = document.querySelector('video');
      if (video && video.src) {
        url = video.src;
      } else if (video && (video as any).currentSrc) {
        url = (video as any).currentSrc;
      }
    }

    if (!url) {
      const mediaMtxBase = (import.meta.env.VITE_MEDIAMTX_HLS_BASE_URL as string | undefined)?.trim();
      if (mediaMtxBase) {
        const channel = channelName || 'ZkOficial';
        url = `${mediaMtxBase.replace(/\/$/, '')}/live/${channel}/index.m3u8`;
      }
    }

    return url || null;
  };

  const handleChromecast = async () => {
    try {
      // Load SDK on first click only
      if (!(window as any).__castSdkLoaded) {
        setSdkLoading(true);
        toast('Carregando Chromecast...', { icon: '📺', duration: 2000 });
        await loadCastSdk();
        const ready = await waitForCastFramework();
        setSdkLoading(false);

        if (!ready) {
          toast.error('Cast SDK não pôde ser carregado. Verifique sua conexão.');
          return;
        }
        initializeChromecast();
      }

      const castContext = (window as any).cast?.framework?.CastContext?.getInstance();
      if (!castContext) {
        toast.error('Chromecast não disponível. Certifique-se de que o dispositivo está na mesma rede Wi-Fi.');
        return;
      }

      const url = resolveStreamUrl();
      if (!url) {
        toast.error('URL do stream não disponível. Aguarde alguns segundos e tente novamente.', { duration: 4000 });
        console.error('❌ Nenhuma URL disponível para cast:', { hlsUrl, videoUrl, streamHlsUrl, liveDataHlsUrl: liveData?.hls_url });
        return;
      }

      console.log('✅ URL para cast:', url);

      const session = await castContext.requestSession();

      const mediaInfo = new (window as any).cast.framework.messages.MediaInfo(
        url,
        'application/vnd.apple.mpegurl'
      );

      mediaInfo.metadata = new (window as any).cast.framework.messages.GenericMediaMetadata();
      mediaInfo.metadata.title = 'ZK TV - Live';
      mediaInfo.metadata.subtitle = 'Transmissão ao vivo';

      const request = new (window as any).cast.framework.messages.LoadRequest(mediaInfo);
      request.autoplay = true;

      await session.loadMedia(request);

      setIsCasting(true);
      toast.success('🎉 Transmitindo para TV!', { icon: '📺', duration: 3000 });
    } catch (error: any) {
      console.error('Erro Chromecast:', error);
      if (error.code === 'cancel') return;
      toast.error('Erro ao conectar com Chromecast. Verifique se o dispositivo está na mesma rede Wi-Fi.');
    }
  };

  const handleAirPlay = () => {
    const video = videoRef.current || document.querySelector('video');
    if (video && (video as any).webkitShowPlaybackTargetPicker) {
      try {
        (video as any).webkitShowPlaybackTargetPicker();
        toast.success('Selecione o dispositivo AirPlay na lista', { icon: '📺', duration: 3000 });
      } catch (error) {
        console.error('Erro AirPlay:', error);
        toast.error('Erro ao abrir AirPlay');
      }
    } else {
      toast('AirPlay não disponível neste dispositivo', { icon: 'ℹ️' });
    }
  };

  // Não mostrar botão se nenhuma opção estiver disponível
  if (!isCastAvailable && !isAirPlayAvailable) {
    return null;
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {isCastAvailable && (
        <button
          onClick={handleChromecast}
          disabled={isCasting || sdkLoading}
          className={`p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group ${isCasting ? 'bg-green-600/20 border-green-500/30' : ''
            }`}
          title={isCasting ? 'Transmitindo para TV' : 'Transmitir para TV (Chromecast)'}
        >
          {isCasting || sdkLoading ? (
            <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
          ) : (
            <Cast className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          )}
        </button>
      )}

      {isAirPlayAvailable && (
        <button
          onClick={handleAirPlay}
          className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group"
          title="Transmitir para TV (AirPlay)"
        >
          <Airplay className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
};
