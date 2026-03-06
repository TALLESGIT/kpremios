/**
 * Utilitários para detectar e gerenciar orientação do dispositivo
 */

export const isLandscape = (): boolean => {
  // Múltiplas formas de detectar paisagem para compatibilidade
  if (typeof window.orientation !== 'undefined') {
    const angle = Math.abs(window.orientation as number);
    return angle === 90 || angle === 270;
  }
  
  if (window.innerWidth > window.innerHeight) {
    return true;
  }
  
  if (screen.orientation) {
    const angle = screen.orientation.angle;
    return angle === 90 || angle === 270;
  }
  
  return false;
};

export const isPortrait = (): boolean => {
  return !isLandscape();
};

export const getOrientationAngle = (): number => {
  if (typeof window.orientation !== 'undefined') {
    return window.orientation as number;
  }
  
  if (screen.orientation) {
    return screen.orientation.angle;
  }
  
  return window.innerWidth > window.innerHeight ? 90 : 0;
};

export const onOrientationChange = (callback: () => void): (() => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  const debouncedCallback = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      callback();
    }, 300); // Debounce de 300ms para evitar múltiplas chamadas
  };
  
  // Múltiplos listeners para compatibilidade
  window.addEventListener('orientationchange', debouncedCallback);
  window.addEventListener('resize', debouncedCallback);
  
  if (screen.orientation) {
    screen.orientation.addEventListener('change', debouncedCallback);
  }
  
  // Cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    window.removeEventListener('orientationchange', debouncedCallback);
    window.removeEventListener('resize', debouncedCallback);
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', debouncedCallback);
    }
  };
};

