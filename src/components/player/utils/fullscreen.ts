/**
 * Utilitários para gerenciar fullscreen de forma cross-browser
 */

export const enterFullscreen = async (element: HTMLElement): Promise<void> => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      await (element as any).mozRequestFullScreen();
    } else if ((element as any).msRequestFullscreen) {
      await (element as any).msRequestFullscreen();
    }
  } catch (err) {
    console.warn('Erro ao entrar em fullscreen:', err);
    throw err;
  }
};

export const exitFullscreen = async (): Promise<void> => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
    }
  } catch (err) {
    console.warn('Erro ao sair de fullscreen:', err);
    throw err;
  }
};

export const isFullscreen = (): boolean => {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
};

export const lockLandscape = async (): Promise<void> => {
  try {
    const orientation = (screen as any).orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape');
    }
  } catch (err) {
    // Alguns navegadores não permitem lock de orientação
    console.debug('Não foi possível travar orientação:', err);
  }
};

export const unlockOrientation = async (): Promise<void> => {
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    } else if ((screen as any).orientation && (screen as any).orientation.unlock) {
      (screen as any).orientation.unlock();
    }
  } catch (err) {
    console.debug('Não foi possível destravar orientação:', err);
  }
};

