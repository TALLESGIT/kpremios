import { useEffect, useRef, useState } from 'react';

export type PerfStress = 'ok' | 'medio' | 'alto';

interface VideoPlaybackQuality {
  creationTime: number;
  totalVideoFrames?: number;
  droppedVideoFrames?: number;
}

export interface FpsMonitorResult {
  fps: number;
  videoDecodedFrames: number;
  videoDroppedFrames: number;
  dropRate: number;
  stress: PerfStress;
}

/**
 * Monitora FPS da página (requestAnimationFrame) e, se houver ref do vídeo,
 * frames decodificados/derrubados do elemento <video> (GPU/decoder).
 * Útil para ver se a live está caindo (estresse de GPU/render).
 */
export function useFpsMonitor(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
): FpsMonitorResult {
  const [result, setResult] = useState<FpsMonitorResult>({
    fps: 0,
    videoDecodedFrames: 0,
    videoDroppedFrames: 0,
    dropRate: 0,
    stress: 'ok',
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const lastTotalRef = useRef(0);
  const lastDroppedRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let rafId: number;

    const tick = () => {
      frameCountRef.current += 1;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const intervalId = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const fps = elapsed > 0 ? Math.round(frameCountRef.current / elapsed) : 0;
      frameCountRef.current = 0;

      let videoDecodedFrames = 0;
      let videoDroppedFrames = 0;
      let dropRate = 0;

      const video = videoRef?.current;
      if (video && typeof (video as HTMLVideoElement & { getVideoPlaybackQuality?: () => VideoPlaybackQuality }).getVideoPlaybackQuality === 'function') {
        const q = (video as HTMLVideoElement & { getVideoPlaybackQuality: () => VideoPlaybackQuality }).getVideoPlaybackQuality();
        const total = q.totalVideoFrames ?? 0;
        const dropped = q.droppedVideoFrames ?? 0;
        const deltaTotal = total - lastTotalRef.current;
        const deltaDropped = dropped - lastDroppedRef.current;
        lastTotalRef.current = total;
        lastDroppedRef.current = dropped;
        videoDecodedFrames = total;
        videoDroppedFrames = dropped;
        dropRate = deltaTotal > 0 ? deltaDropped / deltaTotal : 0;
      }

      let stress: PerfStress = 'ok';
      if (fps < 18 || dropRate > 0.15) stress = 'alto';
      else if (fps < 24 || dropRate > 0.05) stress = 'medio';

      setResult({
        fps,
        videoDecodedFrames,
        videoDroppedFrames,
        dropRate: Math.round(dropRate * 100) / 100,
        stress,
      });
    }, 1000);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
    };
  }, [enabled, videoRef]);

  return result;
}
