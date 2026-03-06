import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDk5NTcsImV4cCI6MjA3MjkyNTk1N30.Fj4f7LatljCx8SUFgH6un_jldg5eXrI37XB4DK7vSog';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    const tables = ['users', 'profiles', 'raffles', 'numbers', 'cruzeiro_settings', 'cruzeiro_games', 'live_games'];
    console.log('--- Diagnóstico de Tabelas Supabase ---');

    for (const table of tables) {
        try {
            const { data, count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: false })
                .limit(1);

            if (error) {
                console.log(`[${table}]: ERRO - ${error.message} (Código: ${error.code})`);
            } else {
                console.log(`[${table}]: OK - Linhas encontradas: ${count !== null ? count : 'N/A'}. Primeiro registro: ${data && data.length > 0 ? 'SIM' : 'NÃO'}`);
                if (data && data.length > 0) {
                    console.log(`  -> Exemplo de dados: ${JSON.stringify(data[0]).substring(0, 100)}...`);
                }
            }
        } catch (e) {
            console.log(`[${table}]: EXCEÇÃO - ${e.message}`);
        }
    }
}

diagnose();
