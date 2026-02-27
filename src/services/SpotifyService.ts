import { supabase } from '../lib/supabase';

export interface SpotifyRelease {
  id: string;
  title: string;
  embed_url: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Ensures a Spotify URL is in the correct embed format.
 * Converts: open.spotify.com/album/... → open.spotify.com/embed/album/...
 * Spotify blocks non-embed URLs from being iframed via CSP frame-ancestors.
 */
function ensureEmbedUrl(url: string | null | undefined): string {
  if (!url) return 'https://open.spotify.com/embed/track/noop';

  // If it's already an embed but has extra stuff, keep it but clean it
  if (url.includes('/embed/')) {
    return url.split('?')[0] + '?utm_source=generator';
  }

  // Basic cleaning
  let cleaned = url.trim();

  // Strip iframe tags if accidental
  if (cleaned.includes('<iframe')) {
    const srcMatch = cleaned.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1]) {
      cleaned = srcMatch[1];
    }
  }

  // Strip locale prefix (e.g. /intl-pt/, /intl-en/)
  cleaned = cleaned.replace(/open\.spotify\.com\/intl-[a-z]{2}\//, 'open.spotify.com/');

  // Convert regular open.spotify.com URL to embed format
  if (cleaned.includes('open.spotify.com/') && !cleaned.includes('/embed/')) {
    cleaned = cleaned.replace('open.spotify.com/', 'open.spotify.com/embed/');
  } else if (!cleaned.startsWith('http')) {
    // If it's just an ID or something else, it might be a track ID
    // But Spotify URLs are complex, so we assume it should be a full URL
    // If it's just "4a03...", we can't be sure if it's a track or album.
    // Better to return it if it looks like a track ID, formatted as a track embed.
    if (/^[a-zA-Z0-9]{22}$/.test(cleaned)) {
      return `https://open.spotify.com/embed/track/${cleaned}?utm_source=generator`;
    }
    return 'https://open.spotify.com/embed/track/noop';
  }

  // Ensure it has https
  if (!cleaned.startsWith('http')) {
    cleaned = 'https://' + cleaned;
  }

  // Strip query params and add generator param
  return cleaned.split('?')[0] + '?utm_source=generator';
}

export const SpotifyService = {
  async getAll() {
    const { data, error } = await supabase
      .from('spotify_releases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Sanitize embed URLs to prevent CSP violations
    return (data as SpotifyRelease[]).map(release => ({
      ...release,
      embed_url: ensureEmbedUrl(release.embed_url),
    }));
  },

  async add(title: string, embedUrl: string) {
    // Basic validation/cleaning of embed URL
    let cleanUrl = embedUrl;
    if (embedUrl.includes('<iframe')) {
      const srcMatch = embedUrl.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        cleanUrl = srcMatch[1];
      }
    }

    const { data, error } = await supabase
      .from('spotify_releases')
      .insert({ title, embed_url: cleanUrl })
      .select()
      .single();

    if (error) throw error;
    return data as SpotifyRelease;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('spotify_releases')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Fetches album/track artwork via Spotify's oEmbed API.
   * Converts embed URLs back to regular URLs for the API call.
   */
  async getAlbumArt(embedUrl: string): Promise<string | null> {
    try {
      // Convert embed URL to regular URL for oEmbed API
      const regularUrl = embedUrl
        .replace('/embed/', '/')
        .replace(/\?.*$/, ''); // strip query params

      const response = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(regularUrl)}`
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.thumbnail_url || null;
    } catch {
      return null;
    }
  }
};
