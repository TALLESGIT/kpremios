import { supabase } from '../lib/supabase';

export interface SpotifyRelease {
  id: string;
  title: string;
  embed_url: string;
  is_active: boolean;
  created_at: string;
}

export const SpotifyService = {
  async getAll() {
    const { data, error } = await supabase
      .from('spotify_releases')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as SpotifyRelease[];
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
  }
};
