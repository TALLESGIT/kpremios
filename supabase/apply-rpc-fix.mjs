import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase
// IMPORTANTE: Substitua estas variáveis pelas suas credenciais do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'SEU_SUPABASE_URL_AQUI';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'SUA_SERVICE_KEY_AQUI';

if (!SUPABASE_URL || SUPABASE_URL === 'SEU_SUPABASE_URL_AQUI') {
    console.error('❌ ERRO: Configure SUPABASE_URL no ambiente ou no script');
    console.error('   Encontre em: https://supabase.com/dashboard/project/SEU_PROJETO/settings/api');
    process.exit(1);
}

if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'SUA_SERVICE_KEY_AQUI') {
    console.error('❌ ERRO: Configure SUPABASE_SERVICE_KEY no ambiente ou no script');
    console.error('   Encontre a "service_role" key em: https://supabase.com/dashboard/project/SEU_PROJETO/settings/api');
    console.error('   ⚠️  CUIDADO: Esta chave é secreta! Não compartilhe!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
    try {
        console.log('🚀 Aplicando correções de RPC Functions...\n');

        const migrationPath = path.join(__dirname, 'migrations', 'fix_rpc_functions.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Lendo arquivo: fix_rpc_functions.sql');
        console.log('⏳ Executando SQL no Supabase...\n');

        // Dividir por função e executar uma por uma
        const functions = sql.split('-- ').filter(f => f.trim());

        let success = 0;
        let errors = 0;

        for (const [index, func] of functions.entries()) {
            if (!func.trim()) continue;

            const funcName = func.split('\n')[0].trim();
            console.log(`🔄 [${index + 1}/${functions.length}] ${funcName}`);

            try {
                const { error } = await supabase.rpc('exec_sql', { sql: '-- ' + func });

                if (error) {
                    // Tentar execução direta via REST API se RPC falhar
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_SERVICE_KEY,
                            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ query: '-- ' + func })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                    }
                }

                console.log(`✅ [${index + 1}/${functions.length}] ${funcName} - OK\n`);
                success++;
            } catch (err) {
                console.error(`❌ [${index + 1}/${functions.length}] ${funcName} - ERRO`);
                console.error(`   ${err.message}\n`);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMO');
        console.log('='.repeat(60));
        console.log(`✅ Sucesso: ${success} funções`);
        console.log(`❌ Erros: ${errors} funções`);
        console.log('='.repeat(60) + '\n');

        if (errors === 0) {
            console.log('🎉 Todas as funções RPC foram criadas com sucesso!');
            console.log('\n📋 Próximos passos:');
            console.log('   1. Recarregue a aplicação (F5)');
            console.log('   2. Teste o chat enviando uma mensagem');
            console.log('   3. Verifique se as métricas atualizam em tempo real');
            console.log('   4. Confirme se os usuários aparecem na lista de moderadores\n');
        } else {
            console.log('⚠️  Algumas funções falharam.');
            console.log('   Você pode aplicar manualmente via SQL Editor do Supabase:');
            console.log('   https://supabase.com/dashboard/project/SEU_PROJETO/editor\n');
        }

    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    }
}

applyMigration();
