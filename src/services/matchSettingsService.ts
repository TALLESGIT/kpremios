import { supabase } from '../lib/supabase';
import { MatchSettings } from '../types';

/**
 * Busca as configurações da ZKTV (nome do time, cor da marca, status live)
 */
export async function getActiveMatchSettings(): Promise<MatchSettings | null> {
  try {
    const { data, error } = await supabase
      .from('match_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching match settings:', error);
      return null;
    }

    return data as MatchSettings;
  } catch (err) {
    console.error('Unexpected error fetching match settings:', err);
    return null;
  }
}
