import React, { useState, useRef, useEffect } from 'react';
import { Move, Maximize2, Monitor } from 'lucide-react';

interface DraggableSourceProps {
  source: {
    id: string;
    type: string;
    name: string;
    url?: string;
    content: any;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
      zIndex: number;
    };
    is_visible: boolean;
    opacity: number;
  };
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (newPosition: { x: number; y: number; width: number; height: number }) => void;
  onDoubleClick: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  snapToGrid?: boolean;
  gridSize?: number;
}

// Canvas padrão para coordenadas (mesmo usado no StreamOverlay)
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

const DraggableSource: React.FC<DraggableSourceProps> = ({
  source,
  isSelected,
  onSelect,
  onPositionChange,
  onDoubleClick,
  containerRef,
  snapToGrid = true,
  gridSize = 10
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [originalPos, setOriginalPos] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  // Converter coordenadas do canvas padrão para pixels do container atual
  const canvasToContainer = (canvasPos: number, isWidth: boolean, containerSize: number) => {
    const canvasSize = isWidth ? CANVAS_WIDTH : CANVAS_HEIGHT;
    return (canvasPos / canvasSize) * containerSize;
  };

  // Converter pixels do container para coordenadas do canvas padrão
  const containerToCanvas = (containerPos: number, isWidth: boolean, containerSize: number) => {
    const canvasSize = isWidth ? CANVAS_WIDTH : CANVAS_HEIGHT;
    return (containerPos / containerSize) * canvasSize;
  };

  const snapValue = (value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    
    e.stopPropagation();
    onSelect();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    // Armazenar posição original em coordenadas do canvas padrão
    setOriginalPos({
      x: source.position.x,
      y: source.position.y,
      width: source.position.width,
      height: source.position.height
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    onSelect();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    setOriginalPos({
      x: source.position.x,
      y: source.position.y,
      width: source.position.width,
      height: source.position.height
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (isDragging) {
        // Converter delta do mouse para coordenadas do canvas padrão
        const deltaXCanvas = containerToCanvas(deltaX, true, containerRect.width);
        const deltaYCanvas = containerToCanvas(deltaY, false, containerRect.height);
        
        // Arrastar (em coordenadas do canvas padrão)
        let newX = originalPos.x + deltaXCanvas;
        let newY = originalPos.y + deltaYCanvas;

        // Limites do canvas padrão
        newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - source.position.width));
        newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - source.position.height));

        // Snap to grid (em coordenadas do canvas)
        newX = snapValue(newX);
        newY = snapValue(newY);

        onPositionChange({
          x: newX,
          y: newY,
          width: source.position.width,
          height: source.position.height
        });
      } else if (isResizing && resizeHandle) {
        // Converter delta do mouse para coordenadas do canvas padrão
        const deltaXCanvas = containerToCanvas(deltaX, true, containerRect.width);
        const deltaYCanvas = containerToCanvas(deltaY, false, containerRect.height);
        
        // Redimensionar (em coordenadas do canvas padrão)
        let newWidth = originalPos.width;
        let newHeight = originalPos.height;
        let newX = originalPos.x;
        let newY = originalPos.y;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(50, originalPos.width + deltaXCanvas);
        }
        if (resizeHandle.includes('w')) {
          const widthChange = originalPos.width - deltaXCanvas;
          if (widthChange >= 50) {
            newWidth = widthChange;
            newX = originalPos.x + deltaXCanvas;
          }
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(50, originalPos.height + deltaYCanvas);
        }
        if (resizeHandle.includes('n')) {
          const heightChange = originalPos.height - deltaYCanvas;
          if (heightChange >= 50) {
            newHeight = heightChange;
            newY = originalPos.y + deltaYCanvas;
          }
        }

        // Limites do canvas padrão
        if (newX + newWidth > CANVAS_WIDTH) {
          newWidth = CANVAS_WIDTH - newX;
        }
        if (newY + newHeight > CANVAS_HEIGHT) {
          newHeight = CANVAS_HEIGHT - newY;
        }

        // Snap to grid (em coordenadas do canvas)
        newX = snapValue(newX);
        newY = snapValue(newY);
        newWidth = snapValue(newWidth);
        newHeight = snapValue(newHeight);

        onPositionChange({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDragging ? 'move' : 'nwse-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, dragStart, originalPos, resizeHandle]);

  const renderContent = () => {
    const style: React.CSSProperties = {
      width: '100%',
      height: '100%',
      pointerEvents: 'none'
    };

    switch (source.type) {
      case 'image':
      case 'logo':
      case 'sponsor':
        return source.url ? (
          <img 
            src={source.url} 
            alt={source.name}
            style={style}
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-xs">
            {source.name}
          </div>
        );
      
      case 'text':
        return (
          <div 
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
            style={style}
            className="bg-gradient-to-r from-blue-900/90 to-blue-800/90 backdrop-blur-sm rounded-lg p-2 border border-blue-400/50"
          >
            <div className="flex items-center justify-between gap-2 text-white h-full">
              <div className="text-center flex-1">
                <div className="text-xs font-semibold">Cruzeiro</div>
                <div className="text-2xl font-bold">{source.content.homeScore || 0}</div>
              </div>
              <div className="text-lg font-bold">×</div>
              <div className="text-center flex-1">
                <div className="text-xs font-semibold truncate">{source.content.awayTeam || 'Visitante'}</div>
                <div className="text-2xl font-bold">{source.content.awayScore || 0}</div>
              </div>
            </div>
          </div>
        );
      
      case 'screenshare':
        return (
          <div 
            style={style}
            className="bg-gradient-to-br from-purple-900/80 to-purple-800/80 backdrop-blur-sm rounded-lg border-2 border-purple-400/50 flex items-center justify-center"
          >
            <div className="text-center text-white p-4">
              <Monitor size={32} className="mx-auto mb-2 opacity-80" />
              <div className="text-sm font-bold">{source.name}</div>
              <div className="text-xs opacity-70 mt-1">Compartilhamento de Tela</div>
            </div>
          </div>
        );
      
      default:
        return (
          <div 
            style={style}
            className="bg-slate-700/50 rounded border-2 border-dashed border-slate-500 flex items-center justify-center"
          >
            <span className="text-white text-xs">{source.name}</span>
          </div>
        );
    }
  };

  if (!source.is_visible) return null;

  // Converter coordenadas do canvas padrão para porcentagem baseada no container
  const container = containerRef.current;
  const containerWidth = container?.getBoundingClientRect().width || CANVAS_WIDTH;
  const containerHeight = container?.getBoundingClientRect().height || CANVAS_HEIGHT;
  
  // Converter posições do canvas padrão (1280x720) para porcentagem
  const leftPercent = (source.position.x / CANVAS_WIDTH) * 100;
  const topPercent = (source.position.y / CANVAS_HEIGHT) * 100;
  const widthPercent = (source.position.width / CANVAS_WIDTH) * 100;
  const heightPercent = (source.position.height / CANVAS_HEIGHT) * 100;

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move ${isSelected ? 'z-50' : ''}`}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: `${widthPercent}%`,
        height: `${heightPercent}%`,
        opacity: source.opacity,
        zIndex: isSelected ? 9999 : source.position.zIndex,
        transition: isDragging || isResizing ? 'none' : 'all 0.1s ease'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      {/* Conteúdo da fonte */}
      <div className="w-full h-full relative">
        {renderContent()}
        
        {/* Borda de seleção */}
        {isSelected && (
          <>
            <div className="absolute inset-0 border-2 border-amber-400 rounded pointer-events-none" />
            
            {/* Label com nome */}
            <div className="absolute -top-6 left-0 bg-amber-400 text-black px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap pointer-events-none flex items-center gap-1">
              <Move size={12} />
              {source.name}
            </div>

            {/* Handles de redimensionamento */}
            <div className="resize-handle absolute -top-1 -left-1 w-3 h-3 bg-amber-400 border border-amber-600 rounded-full cursor-nw-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
            <div className="resize-handle absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 border border-amber-600 rounded-full cursor-n-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'n')} />
            <div className="resize-handle absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border border-amber-600 rounded-full cursor-ne-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
            <div className="resize-handle absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-amber-400 border border-amber-600 rounded-full cursor-e-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'e')} />
            <div className="resize-handle absolute -bottom-1 -right-1 w-3 h-3 bg-amber-400 border border-amber-600 rounded-full cursor-se-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
            <div className="resize-handle absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 border border-amber-600 rounded-full cursor-s-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 's')} />
            <div className="resize-handle absolute -bottom-1 -left-1 w-3 h-3 bg-amber-400 border border-amber-600 rounded-full cursor-sw-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
            <div className="resize-handle absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-amber-400 border border-amber-600 rounded-full cursor-w-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'w')} />

            {/* Informações de tamanho */}
            <div className="absolute -bottom-6 left-0 bg-slate-800 text-amber-400 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap pointer-events-none">
              {Math.round(source.position.width)} × {Math.round(source.position.height)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DraggableSource;
