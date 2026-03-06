const SUPABASE_URL = 'https://bukigyhhgrtgryklabjg.supabase.co';
// Reconstructed Service Role Key from captured parts (if needed) or just the one I got.
// Actually, I'll just run get-keys.js again and redirect to a file.
const fs = require('fs');
const path = require('path');

async function applySQL(sql, serviceKey) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'params=single-object'
        },
        body: JSON.stringify({ sql })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro na execução: ${response.status} ${text}`);
    }
    return await response.json();
}

async function run() {
    const serviceKey = process.env.SERVICE_ROLE_KEY;
    if (!serviceKey) {
        console.error('SERVICE_ROLE_KEY não definidida.');
        process.exit(1);
    }

    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    const files = [
        'fix_chat_rls_and_realtime.sql',
        'fix_heartbeat_and_storage.sql',
        'add_click_increment_rpc.sql'
    ];

    for (const file of files) {
        console.log(`Aplicando ${file}...`);
        try {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await applySQL(sql, serviceKey);
            console.log(`✅ ${file} aplicado com sucesso!`);
        } catch (err) {
            console.error(`❌ Erro ao aplicar ${file}:`, err.message);
        }
    }
}

run();
