const ACCESS_TOKEN = 'sbp_e7adf29748ac8b2da3f5040e6848a929e07b8365';
const PROJECT_REF = 'bukigyhhgrtgryklabjg';
const SUPABASE_URL = 'https://bukigyhhgrtgryklabjg.supabase.co';

const fs = require('fs');
const path = require('path');

async function applySQL(sql, serviceKey) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro na execução SQL: ${response.status} ${text}`);
    }
}

async function run() {
    try {
        console.log(`Buscando chaves para o projeto: ${PROJECT_REF}...`);
        const keysResponse = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!keysResponse.ok) {
            throw new Error(`Erro ao buscar chaves: ${keysResponse.status} ${await keysResponse.text()}`);
        }

        const keys = await keysResponse.json();
        const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;

        if (!serviceKey) {
            throw new Error('Service Role Key não encontrada para o projeto.');
        }

        console.log('✅ Service Role Key obtida com sucesso.');

        const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
        const files = [
            'fix_chat_rls_and_realtime.sql',
            'fix_heartbeat_and_storage.sql',
            'add_click_increment_rpc.sql'
        ];

        for (const file of files) {
            console.log(`⏳ Aplicando ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await applySQL(sql, serviceKey);
            console.log(`✅ ${file} aplicado!`);
        }

        console.log('\n🎉 Todas as migrações foram aplicadas com sucesso!');
    } catch (err) {
        console.error('\n❌ ERRO FATAL:', err.message);
        process.exit(1);
    }
}

run();
