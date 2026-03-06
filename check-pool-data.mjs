import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPoolData() {
    console.log('\n🔍 Verificando dados de bolões e apostas...\n');

    try {
        // Verificar bolões
        const { data: pools, error: poolsError } = await supabase
            .from('match_pools')
            .select('*')
            .order('created_at', { ascending: false });

        if (poolsError) {
            console.error('❌ Erro ao buscar bolões:', poolsError.message);
        } else {
            console.log(`📊 Bolões encontrados: ${pools?.length || 0}`);
            if (pools && pools.length > 0) {
                pools.forEach(pool => {
                    console.log(`\n  - ID: ${pool.id}`);
                    console.log(`    Partida: ${pool.match_title}`);
                    console.log(`    ${pool.home_team} vs ${pool.away_team}`);
                    console.log(`    Ativo: ${pool.is_active ? 'SIM' : 'NÃO'}`);
                    console.log(`    Participantes: ${pool.total_participants}`);
                    console.log(`    Total arrecadado: R$ ${pool.total_pool_amount}`);
                });
            }
        }

        // Verificar apostas
        const { data: bets, error: betsError } = await supabase
            .from('pool_bets')
            .select(`
                *,
                users!inner (
                    id,
                    name,
                    email,
                    whatsapp
                ),
                match_pools (
                    match_title,
                    home_team,
                    away_team
                )
            `)
            .eq('payment_status', 'approved')
            .order('created_at', { ascending: false });

        if (betsError) {
            console.error('❌ Erro ao buscar apostas:', betsError.message);
        } else {
            console.log(`\n💰 Apostas pagas encontradas: ${bets?.length || 0}`);
            if (bets && bets.length > 0) {
                console.log('\n📋 LISTA DE USUÁRIOS AFETADOS:\n');
                bets.forEach((bet, index) => {
                    console.log(`${index + 1}. ${bet.users.name}`);
                    console.log(`   WhatsApp: ${bet.users.whatsapp || 'Não cadastrado'}`);
                    console.log(`   Email: ${bet.users.email || 'Não cadastrado'}`);
                    console.log(`   Aposta: ${bet.predicted_home_score} x ${bet.predicted_away_score}`);
                    console.log(`   Bolão: ${bet.match_pools?.match_title || 'Bolão excluído'}`);
                    console.log('');
                });
            }
        }

        // Verificar lives
        const { data: lives, error: livesError } = await supabase
            .from('live_streams')
            .select('id, title, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (!livesError && lives) {
            console.log(`\n📺 Últimas lives criadas: ${lives.length}`);
            lives.forEach(live => {
                console.log(`  - ${live.title} (${new Date(live.created_at).toLocaleString('pt-BR')})`);
            });
        }

    } catch (err) {
        console.error('❌ Erro inesperado:', err);
    }
}

checkPoolData();
