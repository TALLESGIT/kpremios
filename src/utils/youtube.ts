/**
 * Utility for YouTube related operations
 */

export const getYouTubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;

  // If it's already a clean ID (11 characters, alphanumeric with underscores/hyphens)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  return (match && match[2].length === 11) ? match[2] : null;
};

export const getYouTubeThumbnail = (videoId: string | null | undefined): string => {
  const id = getYouTubeId(videoId);
  if (!id) return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1074&auto=format&fit=crop';
  // hqdefault is much more reliably available than maxresdefault
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
};

export const getYouTubeEmbedUrl = (videoId: string | null | undefined): string => {
  const id = getYouTubeId(videoId);
  if (!id) return '';

  // Use youtube-nocookie.com to reduce tracking errors and CORS noise.
  const origin = window.location.origin;
  return `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0`;
};
