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
function ensureEmbedUrl(url: string): string {
  if (!url) return url;
  // Already a correct embed URL
  if (url.includes('/embed/')) return url;
  // Strip locale prefix (e.g. /intl-pt/, /intl-en/) — Spotify embeds don't use it
  const cleaned = url.replace(/open\.spotify\.com\/intl-[a-z]{2}\//, 'open.spotify.com/');
  // Convert regular open.spotify.com URL to embed format
  return cleaned.replace('open.spotify.com/', 'open.spotify.com/embed/');
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
