import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase.from('match_pools').insert({
    match_title: 'test title',
    home_team: 'Cruzeiro',
    away_team: 'Oponente',
    home_team_logo: 'logo1',
    away_team_logo: 'logo2',
    is_active: false
  });
  if (error) {
    console.error('ERRO SUPABASE:');
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log('SUCESSO');
  }
}

run();
