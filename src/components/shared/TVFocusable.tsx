import React, { useEffect, useRef } from 'react';

interface TVFocusableProps {
  children: React.ReactNode;
  isFocused: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Componente wrapper para tornar elementos focáveis e navegáveis via D-Pad em Smart TVs.
 * Aplica estilos de foco premium e gerencia o scroll automático para manter o elemento visível.
 */
export const TVFocusable: React.FC<TVFocusableProps> = ({
  children,
  isFocused,
  onClick,
  className = ""
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && elementRef.current) {
      // Garantir que o elemento focado esteja sempre visível com scroll suave premium
      elementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [isFocused]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isFocused && e.key === 'Enter' && onClick) {
      onClick();
    }
  };

  return (
    <div
      ref={elementRef}
      className={`tv-focusable ${isFocused ? 'focused' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={isFocused ? 0 : -1}
    >
      {children}
    </div>
  );
};
