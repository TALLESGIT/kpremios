// components/ZKViewer.tsx
import { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

interface ZKViewerProps {
  appId?: string;
  channel: string;
  token?: string | null;
}

export default function ZKViewer({
  appId,
  channel,
  token = null,
}: ZKViewerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  const currentVideoTrackRef = useRef<any | null>(null);
  const currentAudioTrackRef = useRef<any | null>(null);
  const interactionInProgressRef = useRef(false);

  // Estilos globais apenas uma vez
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'zk-viewer-video-styles';
    style.textContent = `
      #zk-viewer-container video,
      #zk-viewer-video-element {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        min-width: 100% !important;
        min-height: 100% !important;
        object-fit: contain !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 99999 !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        background: transparent !important;
        pointer-events: auto !important;
        transform: translateZ(0) !important;
        will-change: transform !important;
      }

      #zk-viewer-container {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
        background: black !important;
        z-index: 1 !important;
      }
      
      #zk-viewer-container > *:not(video) {
        z-index: 1 !important;
      }
    `;

    const existing = document.getElementById('zk-viewer-video-styles');
    if (existing) existing.remove();
    document.head.appendChild(style);

    return () => {
      const s = document.getElementById('zk-viewer-video-styles');
      if (s) s.remove();
    };
  }, []);

  // Função auxiliar: tocar vídeo
  const playVideoTrack = async (track: any, reason?: string) => {
    if (!containerRef.current) {
      console.warn('ZKViewer: container não disponível para play');
      return;
    }

    // Limpar vídeos antigos
    containerRef.current.querySelectorAll('video').forEach((v) => {
      try {
        (v as HTMLVideoElement).pause();
        (v as HTMLVideoElement).srcObject = null;
        v.remove();
      } catch {}
    });

    try {
      console.log('ZKViewer: chamando play() do vídeo', { reason });
      await track.play(containerRef.current);
      
      // Aguardar um pouco para o elemento ser criado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const videoEl = containerRef.current.querySelector('video') as HTMLVideoElement;
      if (videoEl) {
        videoEl.id = 'zk-viewer-video-element';
        
        // CORREÇÃO MOBILE: Usar object-fit: contain para manter proporção 16:9
        // Detectar se é mobile para aplicar configurações específicas
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
        const isFullscreen = !!(document.fullscreenElement || 
                               (document as any).webkitFullscreenElement ||
                               (document as any).mozFullScreenElement ||
                               (document as any).msFullscreenElement);
        
        // Aplicar object-fit baseado no contexto
        const objectFit = (isMobile && isFullscreen) ? 'contain' : 'cover';
        
        videoEl.style.cssText = `
          width: 100% !important;
          height: 100% !important;
          min-width: 100% !important;
          min-height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          object-fit: ${objectFit} !important;
          margin: 0 !important;
          padding: 0 !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          inset: 0 !important;
          z-index: 99999 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          background: black !important;
          pointer-events: auto !important;
          transform: translateZ(0) !important;
          will-change: transform !important;
        `;
        
        // Remover atributos width e height para não conflitar com CSS
        videoEl.removeAttribute('width');
        videoEl.removeAttribute('height');
        
        // Observer para remover atributos width/height sempre que o Agora SDK tentar adicioná-los
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'width' || mutation.attributeName === 'height')) {
              videoEl.removeAttribute('width');
              videoEl.removeAttribute('height');
              // Reaplica estilos para garantir
              videoEl.style.width = '100%';
              videoEl.style.height = '100%';
            }
          });
        });
        
        observer.observe(videoEl, {
          attributes: true,
          attributeFilter: ['width', 'height']
        });
        
        // Função para verificar visibilidade do vídeo
        const checkVideoVisibility = () => {
          if (!videoEl || !containerRef.current) return;
          
          const rect = videoEl.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(videoEl);
          const containerRect = containerRef.current.getBoundingClientRect();
          
          const hasVideoData = videoEl.videoWidth > 0 && videoEl.videoHeight > 0;
          const hasDimensions = rect.width > 0 && rect.height > 0;
          const isVisible = hasDimensions && 
                           computedStyle.opacity !== '0' && 
                           computedStyle.visibility !== 'hidden' &&
                           computedStyle.display !== 'none';
          
          console.log('ZKViewer: Verificação de visibilidade do vídeo:', {
            videoWidth: videoEl.videoWidth,
            videoHeight: videoEl.videoHeight,
            offsetWidth: videoEl.offsetWidth,
            offsetHeight: videoEl.offsetHeight,
            rectWidth: rect.width,
            rectHeight: rect.height,
            rectTop: rect.top,
            rectLeft: rect.left,
            containerWidth: containerRect.width,
            containerHeight: containerRect.height,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            readyState: videoEl.readyState,
            paused: videoEl.paused,
            hasVideoData,
            hasDimensions,
            isVisible
          });
          
          // Se o vídeo tem dados mas não está visível, tentar corrigir
          if (hasVideoData && !isVisible) {
            console.warn('ZKViewer: Vídeo tem dados mas não está visível! Forçando correção...');
            
            // Forçar atualização do layout
            void videoEl.offsetHeight;
            
            // Reaplicar estilos com z-index ainda maior
            videoEl.style.cssText = `
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              max-height: 100% !important;
              object-fit: cover !important;
        min-width: 100% !important;
        min-height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              z-index: 999999 !important;
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              background: transparent !important;
              pointer-events: auto !important;
              transform: translateZ(0) !important;
              will-change: transform !important;
            `;
            
            // Verificar se há elementos cobrindo o vídeo
            try {
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              const elementsAbove = document.elementsFromPoint(centerX, centerY);
              const videoIndex = elementsAbove.indexOf(videoEl);
              
              if (videoIndex > 0) {
                console.warn('ZKViewer: Há elementos cobrindo o vídeo!', {
                  elementsAbove: elementsAbove.length,
                  videoIndex,
                  topElement: elementsAbove[0]?.tagName,
                  topElementId: elementsAbove[0]?.id,
                  topElementClass: elementsAbove[0]?.className,
                  topElementZIndex: window.getComputedStyle(elementsAbove[0] as Element).zIndex,
                  allElements: elementsAbove.map((el, idx) => ({
                    index: idx,
                    tag: el.tagName,
                    id: el.id,
                    className: el.className,
                    zIndex: window.getComputedStyle(el).zIndex
                  }))
                });
                
                // Tentar aumentar o z-index do vídeo ainda mais
                videoEl.style.zIndex = '9999999';
              }
            } catch (e) {
              console.warn('ZKViewer: Erro ao verificar elementos cobrindo:', e);
            }
          }
        };
        
        // Aguardar dados do vídeo antes de verificar
        if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          // Já tem dados, verificar imediatamente
          setTimeout(checkVideoVisibility, 100);
        } else {
          // Aguardar metadata carregar
          videoEl.addEventListener('loadedmetadata', () => {
            setTimeout(checkVideoVisibility, 200);
          }, { once: true });
          
          // Fallback: verificar após 2 segundos mesmo sem dados
          setTimeout(() => {
            if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
              console.warn('ZKViewer: Vídeo ainda não recebeu dados após 2 segundos');
            }
            checkVideoVisibility();
          }, 2000);
        }
        
        // Adicionar listeners para verificar quando o vídeo receber dados
        const checkVideoData = () => {
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            console.log('ZKViewer: Vídeo recebeu dados!', {
              width: videoEl.videoWidth,
              height: videoEl.videoHeight,
              readyState: videoEl.readyState
            });
            // Verificar visibilidade novamente quando receber dados
            setTimeout(() => {
              const rect = videoEl.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(videoEl);
              const containerRect = containerRef.current?.getBoundingClientRect();
              
              console.log('ZKViewer: Verificação após receber dados:', {
                videoWidth: videoEl.videoWidth,
                videoHeight: videoEl.videoHeight,
                rectWidth: rect.width,
                rectHeight: rect.height,
                rectTop: rect.top,
                rectLeft: rect.left,
                containerWidth: containerRect?.width,
                containerHeight: containerRect?.height,
                opacity: computedStyle.opacity,
                visibility: computedStyle.visibility,
                display: computedStyle.display,
                zIndex: computedStyle.zIndex,
                position: computedStyle.position,
                backgroundColor: computedStyle.backgroundColor
              });
              
              // Verificar TODOS os elementos no ponto central do vídeo
              try {
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const elementsAtPoint = document.elementsFromPoint(centerX, centerY);
                const videoIndex = elementsAtPoint.indexOf(videoEl);
                
              const elementsInfo = elementsAtPoint.map((el, idx) => {
                const style = window.getComputedStyle(el);
                return {
                  index: idx,
                  tag: el.tagName,
                  id: el.id,
                  className: el.className,
                  zIndex: style.zIndex,
                  position: style.position,
                  opacity: style.opacity,
                  display: style.display,
                  visibility: style.visibility,
                  pointerEvents: style.pointerEvents,
                  backgroundColor: style.backgroundColor,
                  isVideo: el === videoEl
                };
              });
              
              console.log('ZKViewer: Elementos no ponto central do vídeo:', {
                totalElements: elementsAtPoint.length,
                videoIndex,
                videoIsOnTop: videoIndex === 0,
                elements: elementsInfo
              });
              
              // Se o vídeo está no topo mas ainda não aparece, pode ser problema de renderização
              if (videoIndex === 0 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                console.log('ZKViewer: ✅ Vídeo está no topo e tem dados! Verificando renderização...');
                
                // Verificar se o vídeo realmente está renderizando pixels
                const canvas = document.createElement('canvas');
                canvas.width = videoEl.videoWidth;
                canvas.height = videoEl.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  try {
                    ctx.drawImage(videoEl, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const pixels = imageData.data;
                    let nonBlackPixels = 0;
                    for (let i = 0; i < pixels.length; i += 4) {
                      const r = pixels[i];
                      const g = pixels[i + 1];
                      const b = pixels[i + 2];
                      if (r > 0 || g > 0 || b > 0) {
                        nonBlackPixels++;
                      }
                    }
                    const percentage = (nonBlackPixels / (pixels.length / 4)) * 100;
                    console.log('ZKViewer: Análise de pixels do vídeo:', {
                      totalPixels: pixels.length / 4,
                      nonBlackPixels,
                      percentage: percentage.toFixed(2) + '%',
                      hasContent: percentage > 1
                    });
                    
                    if (percentage < 1) {
                      console.warn('ZKViewer: ⚠️ Vídeo está no topo mas parece estar preto! Pode ser problema de captura no ZK Studio.');
                    }
                  } catch (e) {
                    console.warn('ZKViewer: Erro ao analisar pixels:', e);
                  }
                }
              }
                
                if (videoIndex > 0) {
                  console.warn('ZKViewer: ⚠️ VÍDEO ESTÁ SENDO COBERTO!', {
                    topElement: {
                      tag: elementsAtPoint[0].tagName,
                      id: elementsAtPoint[0].id,
                      className: elementsAtPoint[0].className,
                      zIndex: window.getComputedStyle(elementsAtPoint[0]).zIndex
                    },
                    videoPosition: videoIndex
                  });
                  
                  // Tentar remover ou ajustar elementos que estão cobrindo
                  for (let i = 0; i < videoIndex; i++) {
                    const coveringEl = elementsAtPoint[i] as HTMLElement;
                    const coveringStyle = window.getComputedStyle(coveringEl);
                    
                    // Se não for o container, tentar ajustar
                    if (coveringEl !== containerRef.current && 
                        coveringEl !== videoEl &&
                        coveringEl.id !== 'zk-viewer-container') {
                      console.warn(`ZKViewer: Tentando ajustar elemento cobrindo:`, {
                        tag: coveringEl.tagName,
                        id: coveringEl.id,
                        className: coveringEl.className,
                        currentZIndex: coveringStyle.zIndex
                      });
                      
                      // Tentar reduzir z-index ou adicionar pointer-events: none
                      if (coveringStyle.pointerEvents !== 'none') {
                        (coveringEl as HTMLElement).style.pointerEvents = 'none';
                        console.log('ZKViewer: Aplicado pointer-events: none no elemento cobrindo');
                      }
                    }
                  }
                }
              } catch (e) {
                console.warn('ZKViewer: Erro ao verificar elementos no ponto:', e);
              }
              
              // Se ainda não está visível, forçar correção
              if (rect.width === 0 || rect.height === 0 || computedStyle.opacity === '0') {
                console.warn('ZKViewer: Vídeo tem dados mas não está visível após receber dados!');
                videoEl.removeAttribute('width');
                videoEl.removeAttribute('height');
                videoEl.style.cssText = `
                  width: 100% !important;
                  height: 100% !important;
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  right: 0 !important;
                  bottom: 0 !important;
                  inset: 0 !important;
                  z-index: 9999999 !important;
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  object-fit: cover !important;
                  min-width: 100% !important;
                  min-height: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                `;
              }
            }, 200);
          } else {
            setTimeout(checkVideoData, 100);
          }
        };
        
        videoEl.addEventListener('loadedmetadata', () => {
          console.log('ZKViewer: Metadata carregada', {
            videoWidth: videoEl.videoWidth,
            videoHeight: videoEl.videoHeight
          });
          checkVideoData();
        }, { once: true });
        
        videoEl.addEventListener('playing', () => {
          console.log('ZKViewer: Vídeo está tocando', {
            videoWidth: videoEl.videoWidth,
            videoHeight: videoEl.videoHeight
          });
          // Verificar visibilidade quando começar a tocar
          setTimeout(() => {
            const rect = videoEl.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(videoEl);
            
            // Verificar TODOS os elementos no ponto central do vídeo
            try {
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              const elementsAtPoint = document.elementsFromPoint(centerX, centerY);
              const videoIndex = elementsAtPoint.indexOf(videoEl);
              
              console.log('ZKViewer: [PLAYING] Elementos no ponto central:', {
                totalElements: elementsAtPoint.length,
                videoIndex,
                topElement: elementsAtPoint[0] ? {
                  tag: elementsAtPoint[0].tagName,
                  id: elementsAtPoint[0].id,
                  className: elementsAtPoint[0].className,
                  zIndex: window.getComputedStyle(elementsAtPoint[0]).zIndex
                } : null
              });
              
              if (videoIndex > 0) {
                console.error('ZKViewer: ❌ VÍDEO ESTÁ SENDO COBERTO QUANDO TOCA!', {
                  topElement: {
                    tag: elementsAtPoint[0].tagName,
                    id: elementsAtPoint[0].id,
                    className: elementsAtPoint[0].className
                  }
                });
              }
            } catch (e) {
              console.warn('ZKViewer: Erro ao verificar elementos quando toca:', e);
            }
            
            if (rect.width === 0 || rect.height === 0 || computedStyle.opacity === '0') {
              console.warn('ZKViewer: Vídeo está tocando mas não tem dimensões visíveis!');
              videoEl.style.cssText = `
                width: 100% !important;
                height: 100% !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                z-index: 9999999 !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                object-fit: cover !important;
        min-width: 100% !important;
        min-height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
              `;
            }
          }, 200);
        }, { once: true });
      } else {
        console.warn('ZKViewer: Elemento de vídeo não encontrado após play()');
      }
      
      setHasStream(true);
      setNeedsInteraction(false);
    } catch (err: any) {
      console.warn('ZKViewer: autoplay bloqueado no vídeo:', err?.message || err);
      setNeedsInteraction(true);
      setHasStream(false);
    }
  };

  // Função auxiliar: tocar áudio com configurações de baixa latência máxima
  const playAudioTrack = async (track: any) => {
    try {
      console.log('ZKViewer: Iniciando reprodução de áudio...', {
        trackId: typeof track.getTrackId === 'function' ? track.getTrackId() : 'N/A',
        trackLabel: typeof track.getTrackLabel === 'function' ? track.getTrackLabel() : 'N/A',
        isPlaying: typeof track.isPlaying === 'function' ? track.isPlaying() : 'N/A'
      });
      
        // CORREÇÃO DO DELAY: Configurar volume primeiro (síncrono, sem await)
        // CORREÇÃO: Aumentar volume para máximo para evitar AUDIO_OUTPUT_LEVEL_TOO_LOW
        try {
          track.setVolume(100);
          console.log('ZKViewer: Volume configurado para 100%');
        } catch (volErr) {
          console.warn('ZKViewer: Erro ao configurar volume:', volErr);
        }
        
        // CORREÇÃO DO DELAY: Reproduzir IMEDIATAMENTE sem esperar configurações
        // Configurar para baixa latência antes de reproduzir
        try {
          // Tentar configurar buffer mínimo se disponível
          if (typeof (track as any).setAudioBufferDelay === 'function') {
            (track as any).setAudioBufferDelay(0);
          }
          if (typeof (track as any).setLatencyMode === 'function') {
            (track as any).setLatencyMode('ultra_low');
          }
        } catch (configErr) {
          console.log('ZKViewer: Configurações de latência não disponíveis');
        }
        
        // Quanto mais rápido iniciar a reprodução, menor o delay
        const playPromise = track.play();
        console.log('ZKViewer: Chamada track.play() realizada com configurações de baixa latência');
      
      // CORREÇÃO DO DELAY: Tentar configurar dispositivo em paralelo (não bloquear)
      if (track.setPlaybackDevice) {
        track.setPlaybackDevice('default').catch(() => {
          // Ignora erros silenciosamente para não bloquear
        });
      }
      
      // Aguardar apenas a reprodução iniciar
      await playPromise;
      console.log('ZKViewer: Promise de play() resolvida');
      
      // Verificar se está realmente tocando (se o método existir)
      let isPlaying = false;
      if (typeof track.isPlaying === 'function') {
        isPlaying = track.isPlaying();
        console.log('ZKViewer: Status de reprodução:', { isPlaying });
      } else {
        console.log('ZKViewer: Método isPlaying não disponível na track');
      }
      
      // CORREÇÃO DO DELAY: Tentar acessar elemento interno para otimizações
      try {
        const audioElement = (track as any).getMediaElement?.();
        if (audioElement && audioElement instanceof HTMLAudioElement) {
          console.log('ZKViewer: Elemento de áudio encontrado:', {
            volume: audioElement.volume,
            muted: audioElement.muted,
            paused: audioElement.paused,
            readyState: audioElement.readyState
          });
          
          // Configurar para não pré-carregar (reduz delay inicial)
          audioElement.preload = 'none';
          // Garantir que não está mutado
          audioElement.muted = false;
          // Garantir volume máximo
          audioElement.volume = 1.0;
          
          // Tentar reduzir buffer se possível (alguns navegadores suportam)
          if ('mozAudioBufferSize' in audioElement) {
            (audioElement as any).mozAudioBufferSize = 0;
          }
        } else {
          console.warn('ZKViewer: Elemento de áudio não encontrado ou não é HTMLAudioElement');
        }
      } catch (e) {
        console.warn('ZKViewer: Erro ao acessar elemento interno de áudio:', e);
      }
      
      console.log('ZKViewer: ✅ Áudio reproduzido com configurações de baixa latência');
      
    } catch (err: any) {
      console.error('ZKViewer: ❌ Erro ao reproduzir áudio:', {
        message: err?.message || err,
        name: err?.name,
        stack: err?.stack
      });
      // Mesmo caso de autoplay: geralmente o vídeo vai precisar de clique também
    }
  };

  useEffect(() => {
    let isMounted = true;
    let isInitializing = false;

    // Limpar cliente anterior se existir
    const cleanupClient = async () => {
      const client = clientRef.current;
      if (client) {
        console.log('ZKViewer: Limpando cliente anterior antes de criar novo');
        client.removeAllListeners();
        try {
          await client.leave();
        } catch (err) {
          console.error('ZKViewer: erro ao sair do canal:', err);
        }
      clientRef.current = null;
    }

      // Parar tracks atuais
      if (currentVideoTrackRef.current) {
        try {
          currentVideoTrackRef.current.stop();
        } catch {}
        currentVideoTrackRef.current = null;
      }
      if (currentAudioTrackRef.current) {
        try {
          currentAudioTrackRef.current.stop();
        } catch {}
        currentAudioTrackRef.current = null;
      }
    };

    // Reset de estado
    setIsConnected(false);
    setHasStream(false);
    setNeedsInteraction(false);
    setError(null);

    const agoraAppId = appId || import.meta.env.VITE_AGORA_APP_ID;
    const agoraToken = token ?? import.meta.env.VITE_AGORA_TOKEN ?? null;

    if (!agoraAppId || !channel) {
      setError('App ID ou canal não configurado');
      return () => {
        cleanupClient();
      };
    }

    // Evitar múltiplas inicializações simultâneas (React StrictMode)
    if (isInitializing) {
      console.log('ZKViewer: Inicialização já em andamento, ignorando...');
      return () => {
        cleanupClient();
      };
    }

    // Limpar cliente anterior se existir antes de criar novo
    if (clientRef.current) {
      console.log('ZKViewer: Cliente já existe, limpando antes de criar novo...');
      cleanupClient();
    }

    isInitializing = true;

    // CORREÇÃO DO DELAY: Configurar cliente com opções de baixa latência
    const client = AgoraRTC.createClient({ 
      mode: 'live', 
      codec: 'vp8',
      // Configurações para reduzir delay
      // O Agora SDK usa configurações internas, mas podemos otimizar
    });
    clientRef.current = client;
    console.log('ZKViewer: Cliente Agora criado', { 
      clientId: (client as any).uid || 'N/A',
      channel,
      timestamp: new Date().toISOString()
    });

    const init = async () => {
      try {
        // Validação do App ID antes de tentar conectar
        if (!agoraAppId || agoraAppId.trim() === '' || agoraAppId.length < 20) {
          const errorMsg = 'App ID do Agora.io não configurado ou inválido. Verifique a variável VITE_AGORA_APP_ID no arquivo .env';
          console.error('ZKViewer:', errorMsg);
          setError(errorMsg);
          setIsConnected(false);
          return;
        }

        console.log('ZKViewer: Iniciando conexão...', {
          appId: agoraAppId.substring(0, 8) + '...', // Mostrar apenas parte do App ID por segurança
          channel,
          hasToken: !!agoraToken,
          timestamp: new Date().toISOString()
        });

        // CORREÇÃO DO DELAY: Role de audiência com baixa latência máxima
        // Level 1 = Baixa latência (recomendado para transmissões ao vivo)
        await client.setClientRole('audience', { level: 1 });
        
        // Configurar para baixa latência de áudio
        // O Agora SDK gerencia isso internamente, mas podemos forçar configurações
        try {
          // Tentar configurar buffer mínimo se disponível na API
          if ((client as any).setAudioBufferSize) {
            (client as any).setAudioBufferSize(0); // Buffer mínimo = menor delay
          }
        } catch (e) {
          // API pode não estar disponível em todas as versões
          console.log('ZKViewer: Configuração de buffer de áudio não disponível');
        }

        // Eventos básicos
        client.on('connection-state-change', (curState: string, prevState: string, reason?: string) => {
          console.log('ZKViewer: connection-state-change', { 
            curState, 
            prevState,
            reason: reason || 'N/A'
          });
          if (curState === 'CONNECTED') {
            setIsConnected(true);
            setError(null);
          }
          if (curState === 'DISCONNECTED' || curState === 'FAILED') {
            setIsConnected(false);
            setHasStream(false);
            if (curState === 'FAILED' && reason) {
              // Não definir erro aqui, pois o erro já foi capturado no catch
              console.error('ZKViewer: Conexão falhou:', reason);
            }
          }
        });

        client.on('user-published', async (user: any, mediaType: string) => {
          console.log('ZKViewer: user-published', {
              uid: user.uid, 
              mediaType,
              hasVideo: user.hasVideo,
            hasAudio: user.hasAudio,
            });
            
          try {
            await client.subscribe(user, mediaType);
          } catch (err: any) {
            console.error('ZKViewer: erro ao dar subscribe:', err?.message || err);
            return;
          }

          if (!isMounted) return;

          if (mediaType === 'video' && user.videoTrack) {
            currentVideoTrackRef.current = user.videoTrack;
            await playVideoTrack(user.videoTrack, 'user-published');
            
            // Verificação periódica para garantir que o vídeo permaneça visível
            const checkVideoVisibility = setInterval(() => {
              const videoEl = containerRef.current?.querySelector('video') as HTMLVideoElement;
              if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                const rect = videoEl.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(videoEl);
                
                // Se o vídeo tem dados mas não está visível, forçar correção
                if (rect.width === 0 || rect.height === 0 || 
                    computedStyle.opacity === '0' || 
                    computedStyle.visibility === 'hidden' ||
                    computedStyle.display === 'none') {
                  console.warn('ZKViewer: Vídeo perdeu visibilidade, corrigindo...');
                  videoEl.removeAttribute('width');
                  videoEl.removeAttribute('height');
                  videoEl.style.cssText = `
                      width: 100% !important;
                      height: 100% !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    object-fit: cover !important;
                    min-width: 100% !important;
                    min-height: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                      position: absolute !important;
                      top: 0 !important;
                      left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    inset: 0 !important;
                    z-index: 999999 !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    background: transparent !important;
                    pointer-events: auto !important;
                    transform: translateZ(0) !important;
                    will-change: transform !important;
                  `;
                  }
                } else {
                // Se não há vídeo, limpar o intervalo
                clearInterval(checkVideoVisibility);
              }
            }, 2000); // Verificar a cada 2 segundos
            
            // Limpar o intervalo quando o componente desmontar ou quando o vídeo mudar
            const cleanup = () => {
              clearInterval(checkVideoVisibility);
            };
            if (containerRef.current) {
              (containerRef.current as any)._visibilityCheckInterval = checkVideoVisibility;
              (containerRef.current as any)._cleanupVisibilityCheck = cleanup;
            }
          }

          if (mediaType === 'audio' && user.audioTrack) {
            console.log('ZKViewer: ✅ Recebeu track de áudio:', {
              uid: user.uid,
              trackId: (user.audioTrack as any).getTrackId?.() || 'N/A',
              trackLabel: (user.audioTrack as any).getTrackLabel?.() || 'N/A',
              trackEnabled: typeof (user.audioTrack as any).isPlaying === 'function' 
                ? (user.audioTrack as any).isPlaying() 
                : 'N/A'
            });
            
            currentAudioTrackRef.current = user.audioTrack;
            // CORREÇÃO DO DELAY: Reproduzir áudio imediatamente sem esperar
            // Não usar await para não bloquear, reproduzir em paralelo
            playAudioTrack(user.audioTrack).then(() => {
              console.log('ZKViewer: ✅ Áudio iniciado com sucesso para user:', user.uid);
            }).catch(err => {
              console.error('ZKViewer: ❌ Erro ao reproduzir áudio:', err);
            });
          } else if (mediaType === 'audio') {
            console.warn('ZKViewer: ⚠️ user-published para áudio mas user.audioTrack não existe:', {
              uid: user.uid,
              hasAudio: user.hasAudio,
              audioTrack: !!user.audioTrack
            });
          }
        });

        client.on('user-unpublished', (user: any, mediaType: string) => {
          console.log('ZKViewer: user-unpublished', { uid: user.uid, mediaType });

          if (mediaType === 'video') {
            if (currentVideoTrackRef.current) {
              try {
                currentVideoTrackRef.current.stop();
              } catch {}
            }
            currentVideoTrackRef.current = null;

            const hasOtherVideo = client.remoteUsers.some(
              (u: any) => u.videoTrack && u.hasVideo,
            );
            setHasStream(hasOtherVideo);
          }

          if (mediaType === 'audio') {
            if (currentAudioTrackRef.current) {
              try {
                currentAudioTrackRef.current.stop();
              } catch {}
            }
            currentAudioTrackRef.current = null;
          }
        });

        client.on('user-joined', (user: any) => {
          console.log('ZKViewer: user-joined', {
            uid: user.uid,
            hasVideo: user.hasVideo,
            hasAudio: user.hasAudio,
          });
        });

        console.log('ZKViewer: join no canal', {
          appId: agoraAppId, 
          channel,
          hasToken: !!agoraToken,
        });

        await client.join(agoraAppId, channel, agoraToken || null, null);

        if (!isMounted) return;

        console.log('ZKViewer: conectado com sucesso');

        // Se o host já estiver no canal, tentar pegar streams existentes
        const remoteUsers = client.remoteUsers;
        if (remoteUsers.length > 0) {
          console.log('ZKViewer: usuários remotos ao entrar:', remoteUsers.length);
          for (const u of remoteUsers) {
            if (u.hasVideo) {
              try {
                await client.subscribe(u, 'video');
                if (u.videoTrack) {
                  currentVideoTrackRef.current = u.videoTrack;
                  await playVideoTrack(u.videoTrack, 'remote-user-already-in-channel');
                }
              } catch (err) {
                console.error('ZKViewer: erro ao dar subscribe em vídeo existente:', err);
              }
            }
            if (u.hasAudio) {
              console.log('ZKViewer: Usuário remoto tem áudio, fazendo subscribe...', {
                uid: u.uid,
                hasAudio: u.hasAudio,
                hasAudioTrack: !!u.audioTrack
              });
              
              try {
                await client.subscribe(u, 'audio');
                console.log('ZKViewer: Subscribe de áudio realizado com sucesso para user:', u.uid);
                
                if (u.audioTrack) {
                  console.log('ZKViewer: ✅ Track de áudio disponível após subscribe:', {
                    uid: u.uid,
                    trackId: (u.audioTrack as any).getTrackId?.() || 'N/A'
                  });
                  
                  currentAudioTrackRef.current = u.audioTrack;
                  // CORREÇÃO DO DELAY: Reproduzir áudio imediatamente sem await
                  playAudioTrack(u.audioTrack).then(() => {
                    console.log('ZKViewer: ✅ Áudio de usuário remoto iniciado com sucesso');
                  }).catch(err => {
                    console.error('ZKViewer: ❌ Erro ao reproduzir áudio existente:', err);
                  });
                } else {
                  console.warn('ZKViewer: ⚠️ Subscribe realizado mas u.audioTrack não existe');
                }
              } catch (err) {
                console.error('ZKViewer: ❌ Erro ao dar subscribe em áudio existente:', err);
              }
            } else {
              console.log('ZKViewer: Usuário remoto não tem áudio:', { uid: u.uid, hasAudio: u.hasAudio });
            }
          }
        } else {
          setHasStream(false);
        }
        
        setIsConnected(true);
      } catch (err: any) {
        console.error('ZKViewer: erro no init:', err);
        if (!isMounted) return;
        
        // Tratamento específico de erros do Agora.io
        let errorMessage = 'Erro ao conectar ao canal';
        
        if (err?.code === 4096 || err?.message?.includes('CAN_NOT_GET_GATEWAY_SERVER')) {
          const appIdDisplay = agoraAppId ? `${agoraAppId.substring(0, 8)}...` : 'NÃO CONFIGURADO';
          errorMessage = '❌ Erro: Projeto Agora.io inativo ou suspenso\n\n' +
            `App ID usado: ${appIdDisplay}\n\n` +
            '🔧 SOLUÇÕES:\n\n' +
            '1. Acesse o dashboard: https://console.agora.io/\n' +
            '2. Verifique se o projeto está ATIVO (não suspenso)\n' +
            '3. Verifique se o App ID está correto\n' +
            '4. Se o projeto estiver suspenso, reative-o no dashboard\n' +
            '5. Verifique se há problemas de rede/firewall bloqueando conexões\n\n' +
            '💡 Dica: O erro "no active status" geralmente significa que o projeto foi desabilitado ou a conta está com problemas.';
        } else if (err?.code === 17 || err?.message?.includes('JOIN_CHANNEL_REJECTED')) {
          errorMessage = 'Conexão rejeitada. Verifique se o App ID e Token estão corretos.';
        } else if (err?.code === 2 || err?.message?.includes('INVALID_APP_ID')) {
          errorMessage = 'App ID inválido. Verifique a variável VITE_AGORA_APP_ID no arquivo .env';
        } else if (err?.code === 109 || err?.message?.includes('INVALID_TOKEN')) {
          errorMessage = 'Token inválido ou expirado. Gere um novo token no dashboard do Agora.io ou configure o projeto para usar apenas App ID.';
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setIsConnected(false);
      }
    };

    init();

    return () => {
      isMounted = false;
      isInitializing = false;
      
      // Limpar verificações de visibilidade
      if (containerRef.current) {
        const interval = (containerRef.current as any)._visibilityCheckInterval;
        const cleanup = (containerRef.current as any)._cleanupVisibilityCheck;
        if (interval) clearInterval(interval);
        if (cleanup) cleanup();
      }
      
      cleanupClient();
    };
  }, [appId, channel, token]);

  const handleUserClickToStart = async () => {
    if (interactionInProgressRef.current) return;
    interactionInProgressRef.current = true;

    try {
      const client = clientRef.current;
      if (!client) return;

      const remoteUsers = client.remoteUsers;
      if (!remoteUsers.length) {
        console.log('ZKViewer: sem usuários remotos ao clicar.');
        return;
      }

      // Tentar localizar algum usuário com vídeo
      for (const user of remoteUsers) {
        if (user.videoTrack) {
          currentVideoTrackRef.current = user.videoTrack;
          await playVideoTrack(user.videoTrack, 'user-click-overlay');
          break;
        }
      }

      // CORREÇÃO DO DELAY: Tocar áudio também, se houver (sem await para não bloquear)
      for (const user of remoteUsers) {
        if (user.audioTrack) {
          currentAudioTrackRef.current = user.audioTrack;
          playAudioTrack(user.audioTrack).catch(err => {
            console.warn('ZKViewer: Erro ao reproduzir áudio após clique:', err);
          });
          break;
        }
      }
    } catch (err) {
      console.error('ZKViewer: erro ao iniciar após clique:', err);
    } finally {
      interactionInProgressRef.current = false;
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        id="zk-viewer-container"
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        data-viewer-container="true"
        onDoubleClick={async () => {
          // Duplo clique para tela cheia (desktop e mobile)
          try {
            const element = containerRef.current;
            if (!element) return;
            
            const isFullscreen = !!(document.fullscreenElement || 
                                   (document as any).webkitFullscreenElement ||
                                   (document as any).mozFullScreenElement ||
                                   (document as any).msFullscreenElement);
            
            if (isFullscreen) {
              // Sair do fullscreen
              if (document.exitFullscreen) {
                await document.exitFullscreen();
              } else if ((document as any).webkitExitFullscreen) {
                await (document as any).webkitExitFullscreen();
              } else if ((document as any).mozCancelFullScreen) {
                await (document as any).mozCancelFullScreen();
              } else if ((document as any).msExitFullscreen) {
                await (document as any).msExitFullscreen();
              }
            } else {
              // Entrar em fullscreen
              if (element.requestFullscreen) {
                await element.requestFullscreen();
              } else if ((element as any).webkitRequestFullscreen) {
                await (element as any).webkitRequestFullscreen();
              } else if ((element as any).mozRequestFullScreen) {
                await (element as any).mozRequestFullScreen();
              } else if ((element as any).msRequestFullscreen) {
                await (element as any).msRequestFullscreen();
              }
            }
          } catch (err: any) {
            console.warn('ZKViewer: Erro ao alternar fullscreen:', err);
          }
        }}
        title="Duplo clique para tela cheia"
      />

      {/* Estado: conectando */}
      {!isConnected && !error && (
        <div
          style={{
          color: 'white',
          position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            zIndex: 10,
            background: 'linear-gradient(to bottom, #020617cc, #000000f0)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
            borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.2)',
              borderTopColor: '#fff',
              animation: 'zk-spin 1s linear infinite',
            }}
          />
          <div style={{ fontSize: 16 }}>Conectando ao canal...</div>
          <style>{`
            @keyframes zk-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Overlay de autoplay / interação do usuário */}
      {needsInteraction && (
        <div
          onClick={handleUserClickToStart}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            backgroundColor: 'rgba(0,0,0,0.75)',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              padding: '20px 28px',
              borderRadius: 12,
              backgroundColor: 'rgba(15,23,42,0.95)',
              textAlign: 'center',
              color: 'white',
              maxWidth: 320,
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>▶️</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
              Clique para iniciar a transmissão
            </div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              Alguns navegadores exigem interação do usuário para reproduzir
              vídeo com áudio.
            </div>
          </div>
        </div>
      )}

      {/* Conectado, mas sem stream */}
      {isConnected && !hasStream && !error && !needsInteraction && (
        <div
          style={{
          position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          textAlign: 'center',
            color: '#fbbf24',
            padding: 20,
          zIndex: 10,
            background:
              'radial-gradient(circle at top, rgba(251,191,36,0.12), transparent 55%)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(15,23,42,0.9)',
              borderRadius: 10,
              padding: '16px 20px',
              maxWidth: 380,
            }}
          >
            <div style={{ marginBottom: 4 }}>⏳ Aguardando transmissão...</div>
            <div style={{ fontSize: 13, color: '#cbd5f5' }}>
              Certifique-se de que o <strong>ZK Studio Pro</strong> está
              transmitindo no canal:{' '}
              <strong style={{ color: '#facc15' }}>{channel}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div
          style={{
          position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          textAlign: 'left',
            color: 'white',
            padding: 20,
          zIndex: 10,
            background:
              'radial-gradient(circle at center, rgba(248,113,113,0.2), #020617ee)',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(127,29,29,0.9)',
              borderRadius: 10,
              padding: '20px 24px',
              maxWidth: 500,
              border: '1px solid rgba(248,113,113,0.6)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ marginBottom: 12, fontSize: 18, fontWeight: 600 }}>
              ❌ Erro de Conexão
            </div>
            <div 
              style={{ 
                fontSize: 13, 
                lineHeight: 1.6,
                whiteSpace: 'pre-line' // Permite quebras de linha
              }}
            >
              {error}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
              💡 Dica: Verifique o console do navegador (F12) para mais detalhes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
