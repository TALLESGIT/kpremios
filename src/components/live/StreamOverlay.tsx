import React from 'react';
import { ActiveScene } from '../../hooks/useStreamStudioSync';

interface StreamOverlayProps {
  activeScene: ActiveScene | null;
}

const StreamOverlay: React.FC<StreamOverlayProps> = ({ activeScene }) => {
  // Debug
  React.useEffect(() => {
    if (activeScene) {
      console.log('🎬 StreamOverlay - Cena ativa:', activeScene.name);
      console.log('📦 StreamOverlay - Total de fontes:', activeScene.sources?.length || 0);
      const visible = activeScene.sources?.filter(s => s.is_visible) || [];
      console.log('👁️ StreamOverlay - Fontes visíveis:', visible.length, visible.map(s => s.name));
    } else {
      console.log('⚠️ StreamOverlay - Nenhuma cena ativa');
    }
  }, [activeScene]);

  if (!activeScene || !activeScene.sources || activeScene.sources.length === 0) {
    return null;
  }

  // Filtrar apenas fontes visíveis
  const visibleSources = activeScene.sources.filter(source => source.is_visible);

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
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        zIndex: 100,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%'
      }}
    >
      {visibleSources
        .sort((a, b) => (a.position?.zIndex || 0) - (b.position?.zIndex || 0))
        .map(renderSource)}
    </div>
  );
};

export default StreamOverlay;
