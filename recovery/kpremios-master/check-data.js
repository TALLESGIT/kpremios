
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConnection() {
    console.log('--- Checking Supabase Connection ---');
    console.log('URL:', supabaseUrl);

    try {
        const { data: settings, error: settingsError } = await supabase
            .from('cruzeiro_settings')
            .select('*');

        if (settingsError) {
            console.error('Error fetching settings:', settingsError.message);
        } else {
            console.log('Settings Found:', settings);
        }

        const { data: games, error: gamesError } = await supabase
            .from('cruzeiro_games')
            .select('*')
            .limit(5);

        if (gamesError) {
            console.error('Error fetching games:', gamesError.message);
        } else {
            console.log('Games Found (first 5):', games);
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkConnection();
