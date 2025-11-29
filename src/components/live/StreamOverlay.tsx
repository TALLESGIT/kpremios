import React, { useMemo } from 'react';
import { ActiveScene } from '../../hooks/useStreamStudioSync';

interface StreamOverlayProps {
  activeScene: ActiveScene | null;
}

const StreamOverlay: React.FC<StreamOverlayProps> = ({ activeScene }) => {
  // Memoizar fontes visíveis para evitar recálculos desnecessários
  const visibleSources = useMemo(() => {
    if (!activeScene || !activeScene.sources || activeScene.sources.length === 0) {
      return [];
    }
    
    const visible = activeScene.sources.filter(source => source.is_visible);
    
    if (visible.length === 0) {
      return [];
    }
    
    // Ordenar por zIndex
    return visible.sort((a, b) => (a.position?.zIndex || 0) - (b.position?.zIndex || 0));
  }, [activeScene]);
  
  // Criar key única baseada nas fontes visíveis para forçar re-render quando mudar
  const overlayKey = useMemo(() => {
    if (visibleSources.length === 0) return 'no-sources';
    return visibleSources.map(s => `${s.id}-${s.is_visible}`).join('|');
  }, [visibleSources]);
  // Debug detalhado
  React.useEffect(() => {
    if (activeScene) {
      console.log('🎬 StreamOverlay - Cena ativa:', activeScene.name);
      console.log('📦 StreamOverlay - Total de fontes:', activeScene.sources?.length || 0);
      
      if (activeScene.sources && activeScene.sources.length > 0) {
        console.log('📋 StreamOverlay - Todas as fontes:', activeScene.sources.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          is_visible: s.is_visible,
          hasUrl: !!s.url
        })));
      }
      
      console.log('👁️ StreamOverlay - Fontes visíveis calculadas:', visibleSources.length, visibleSources.map(s => ({
        name: s.name,
        type: s.type,
        is_visible: s.is_visible,
        hasUrl: !!s.url
      })));
    } else {
      console.log('⚠️ StreamOverlay - Nenhuma cena ativa');
    }
  }, [activeScene, visibleSources]);

  if (!activeScene || !activeScene.sources || activeScene.sources.length === 0) {
    return null;
  }

  if (visibleSources.length === 0) {
    console.log('⚠️ StreamOverlay - Nenhuma fonte visível');
    return null;
  }

  const renderSource = (source: any) => {
    // Converter posições de pixels para porcentagem baseado em canvas de 1280x720 (proporção 16:9)
    const canvasWidth = 1280;
    const canvasHeight = 720;
    
    const leftPercent = (source.position.x / canvasWidth) * 100;
    const topPercent = (source.position.y / canvasHeight) * 100;
    const widthPercent = (source.position.width / canvasWidth) * 100;
    const heightPercent = (source.position.height / canvasHeight) * 100;

    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
      width: `${widthPercent}%`,
      height: `${heightPercent}%`,
      opacity: source.opacity,
      zIndex: source.position.zIndex || 100,
      pointerEvents: 'none' // Não bloquear cliques no vídeo
    };

    switch (source.type) {
      case 'image':
      case 'logo':
      case 'sponsor':
        return source.url ? (
          <div key={source.id} style={style}>
            <img 
              src={source.url} 
              alt={source.name}
              className="w-full h-full object-contain"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        ) : null;
      
      case 'text':
        return (
          <div 
            key={source.id} 
            style={{
              ...style,
              color: source.content.color || '#ffffff',
              fontSize: `${source.content.fontSize || 24}px`,
              fontWeight: source.content.fontWeight || 'bold',
              textAlign: source.content.textAlign || 'left',
              padding: '8px',
              backgroundColor: source.content.backgroundColor || 'transparent',
              overflow: 'hidden',
              wordWrap: 'break-word'
            }}
          >
            {source.content.text || source.name}
          </div>
        );
      
      case 'scoreboard':
        return (
          <div 
            key={source.id} 
            style={style}
            className="bg-gradient-to-r from-blue-900/90 to-blue-800/90 backdrop-blur-sm rounded-lg border border-blue-400/50"
          >
            <div className="flex items-center justify-between gap-4 text-white h-full px-4">
              <div className="text-center flex-1">
                <div className="text-sm font-semibold">Cruzeiro</div>
                <div className="text-3xl font-bold">{source.content.homeScore || 0}</div>
              </div>
              <div className="text-xl font-bold">×</div>
              <div className="text-center flex-1">
                <div className="text-sm font-semibold truncate">{source.content.awayTeam || 'Visitante'}</div>
                <div className="text-3xl font-bold">{source.content.awayScore || 0}</div>
              </div>
            </div>
          </div>
        );
      
      case 'screenshare':
        // Não renderizar nada para screenshare, ele é controlado pelo VideoStream
        return null;
      
      default:
        return null;
    }
  };

  return (
    <div 
      key={overlayKey} // Key única baseada nas fontes visíveis para forçar re-render
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        zIndex: 9999, // zIndex muito alto para aparecer sobre tudo (screen share, câmera, etc)
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%'
      }}
    >
      {visibleSources.map(renderSource)}
    </div>
  );
};

export default StreamOverlay;
