import { useEffect, useState } from 'react';

interface UseOrientationResult {
  isLandscape: boolean;
}

export function useOrientation(): UseOrientationResult {
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return false;
    }
    return window.matchMedia('(orientation: landscape)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia('(orientation: landscape)');

    const handleChange = (event: MediaQueryListEvent) => {
      setIsLandscape(event.matches);
    };

    // Garantir estado inicial correto
    setIsLandscape(mediaQueryList.matches);

    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, []);

  return { isLandscape };
}

