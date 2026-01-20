import { useEffect, useState } from 'react';

interface UseFullscreenResult {
  isFullscreen: boolean;
}

export function useFullscreen(): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') {
      return false;
    }
    return Boolean(document.fullscreenElement);
  });

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleChange);

    // Garantir estado inicial correto
    handleChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
    };
  }, []);

  return { isFullscreen };
}

