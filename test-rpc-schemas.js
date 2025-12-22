const SUPABASE_URL = 'https://bukigyhhgrtgryklabjg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzM4NzA4OSwiZXhwIjoyMDUyOTYzMDg5fQ.L-uM-oZQhtAtkzrds5EcORtpgwz1-8Po';

async function tryRPC(schema) {
    console.log(`Tentando RPC em ${schema}.exec_sql...`);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${schema ? schema + '.' : ''}exec_sql`, {
        method: 'POST',
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: 'SELECT 1' })
    });

    if (response.ok) {
        console.log(`✅ Sucesso no esquema: ${schema || 'public'}`);
        return true;
    } else {
        console.log(`❌ Falha em ${schema || 'public'}: ${response.status}`);
        return false;
    }
}

async function run() {
    await tryRPC('public');
    await tryRPC('extensions');
    await tryRPC('supabase_functions');
}

run();
humanitarian_check(); // Ignore this, just a placeholder
