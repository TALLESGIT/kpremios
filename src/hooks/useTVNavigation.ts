import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gerenciar navegação por controle remoto (D-Pad) em Smart TVs.
 * Detecta pressionamento de teclas e retorna o estado de modo TV.
 */
export const useTVNavigation = () => {
  const [isTVMode, setIsTVMode] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tvKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Enter', 'Escape', 'Backspace'
    ];

    // Se o usuário pressionar qualquer tecla de navegação, ativamos o modo TV
    if (tvKeys.includes(e.key)) {
      if (!isTVMode) {
        setIsTVMode(true);
        document.body.classList.add('tv-mode');
      }
    }
  }, [isTVMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { isTVMode };
};
