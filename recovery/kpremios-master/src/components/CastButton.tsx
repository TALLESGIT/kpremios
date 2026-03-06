import { useState, useEffect, useRef } from 'react';
import { Cast, Airplay, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLiveStatus } from '../hooks/useLiveStatus';
import { supabase } from '../lib/supabase';
import { DEFAULT_LIVE_CHANNEL } from '../config/constants';

interface CastButtonProps {
  videoUrl?: string; // URL HLS ou do stream
  hlsUrl?: string;
  channelName?: string; // Nome do canal para buscar HLS
  className?: string;
}

/**
 * Componente de Cast Universal
 * Detecta automaticamente Chromecast, AirPlay e outros dispositivos
 * Similar ao YouTube - aparece automaticamente quando há dispositivos disponíveis
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Buscar URL HLS do stream usando o mesmo hook do LiveViewer
  const { data: liveData } = useLiveStatus(channelName);

  // Buscar HLS URL do banco de dados também
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

  useEffect(() => {
    // Buscar elemento de vídeo na página
    const video = document.querySelector('video');
    if (video) {
      videoRef.current = video;
    }

    // Detectar Chromecast
    const checkChromecast = () => {
      if (typeof window !== 'undefined') {
        // Verificar se a API do Chrome Cast está disponível
        const cast = (window as any).chrome?.cast;
        if (cast) {
          setIsCastAvailable(true);
          initializeChromecast();
        } else {
          // Tentar carregar o framework do Chromecast
          if ((window as any).cast?.framework) {
            setIsCastAvailable(true);
            initializeChromecast();
          }
        }
      }
    };

    // Detectar AirPlay (iOS)
    const checkAirPlay = () => {
      const video = videoRef.current || document.querySelector('video');
      if (video && (video as any).webkitShowPlaybackTargetPicker) {
        setIsAirPlayAvailable(true);
      }
    };

    // Inicializar Chromecast
    const initializeChromecast = () => {
      try {
        const castContext = (window as any).cast?.framework?.CastContext?.getInstance();
        if (castContext) {
          castContext.setOptions({
            receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });

          // Listener para mudanças de estado
          castContext.addEventListener(
            (window as any).cast.framework.CastContextEventType.CAST_STATE_CHANGED,
            (event: any) => {
              const castState = event.castState;
              if (castState === (window as any).cast.framework.CastState.CONNECTED) {
                setIsCasting(true);
              } else {
                setIsCasting(false);
              }
            }
          );

          // Listener para disponibilidade de dispositivos
          castContext.addEventListener(
            (window as any).cast.framework.CastContextEventType.AVAILABLE_CAST_DEVICES_CHANGED,
            () => {
              const devices = castContext.getCastDevices();
              setCastDevices(devices || []);
              setIsCastAvailable(devices && devices.length > 0);
            }
          );
        }
      } catch (error) {
        console.log('Chromecast não disponível:', error);
      }
    };

    // Aguardar o framework do Chromecast carregar
    if ((window as any).cast?.framework) {
      checkChromecast();
    } else {
      // Aguardar até 3 segundos para o script carregar
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).cast?.framework || attempts > 30) {
          clearInterval(interval);
          checkChromecast();
        }
      }, 100);
    }

    checkAirPlay();

    // Verificar novamente quando o vídeo for carregado
    const observer = new MutationObserver(() => {
      checkAirPlay();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleChromecast = async () => {
    try {
      const castContext = (window as any).cast?.framework?.CastContext?.getInstance();
      if (!castContext) {
        toast.error('Chromecast não disponível. Certifique-se de que o dispositivo está na mesma rede Wi-Fi.');
        return;
      }

      // Tentar obter URL de várias fontes (prioridade)
      let url = hlsUrl ||
        videoUrl ||
        streamHlsUrl ||
        liveData?.hls_url;

      // Se não tiver URL, tentar buscar do elemento de vídeo
      if (!url) {
        const video = document.querySelector('video');
        if (video && video.src) {
          url = video.src;
        } else if (video && (video as any).currentSrc) {
          url = (video as any).currentSrc;
        }
      }

      // Se ainda não tiver, tentar construir URL HLS padrão do MediaMTX
      if (!url) {
        const mediaMtxBase = (import.meta.env.VITE_MEDIAMTX_HLS_BASE_URL as string | undefined)?.trim();
        if (mediaMtxBase) {
          const channel = channelName || 'ZkOficial';
          url = `${mediaMtxBase.replace(/\/$/, '')}/live/${channel}/index.m3u8`;
          console.log('⚠️ Usando URL HLS padrão (MediaMTX):', url);
        }
      }

      if (!url) {
        toast.error('URL do stream não disponível. Aguarde alguns segundos e tente novamente.', {
          duration: 4000,
        });
        console.error('❌ Nenhuma URL disponível para cast:', {
          hlsUrl,
          videoUrl,
          streamHlsUrl,
          liveDataHlsUrl: liveData?.hls_url,
        });
        return;
      }

      console.log('✅ URL para cast:', url);

      const session = await castContext.requestSession();

      const mediaInfo = new (window as any).cast.framework.messages.MediaInfo(
        url,
        'application/vnd.apple.mpegurl' // HLS
      );

      mediaInfo.metadata = new (window as any).cast.framework.messages.GenericMediaMetadata();
      mediaInfo.metadata.title = 'ZK TV - Live';
      mediaInfo.metadata.subtitle = 'Transmissão ao vivo';

      const request = new (window as any).cast.framework.messages.LoadRequest(mediaInfo);
      request.autoplay = true;

      await session.loadMedia(request);

      setIsCasting(true);
      toast.success('🎉 Transmitindo para TV!', {
        icon: '📺',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Erro Chromecast:', error);
      if (error.code === 'cancel') {
        // Usuário cancelou
        return;
      }
      toast.error('Erro ao conectar com Chromecast. Verifique se o dispositivo está na mesma rede Wi-Fi.');
    }
  };

  const handleAirPlay = () => {
    const video = videoRef.current || document.querySelector('video');
    if (video && (video as any).webkitShowPlaybackTargetPicker) {
      try {
        (video as any).webkitShowPlaybackTargetPicker();
        toast.success('Selecione o dispositivo AirPlay na lista', {
          icon: '📺',
          duration: 3000,
        });
      } catch (error) {
        console.error('Erro AirPlay:', error);
        toast.error('Erro ao abrir AirPlay');
      }
    } else {
      toast('AirPlay não disponível neste dispositivo', {
        icon: 'ℹ️',
      });
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
          disabled={isCasting}
          className={`p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group ${isCasting ? 'bg-green-600/20 border-green-500/30' : ''
            }`}
          title={isCasting ? 'Transmitindo para TV' : 'Transmitir para TV (Chromecast)'}
        >
          {isCasting ? (
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

