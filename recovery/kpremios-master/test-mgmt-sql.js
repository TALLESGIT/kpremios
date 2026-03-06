const ACCESS_TOKEN = 'sbp_e7adf29748ac8b2da3f5040e6848a929e07b8365';
const PROJECT_REF = 'bukigyhhgrtgryklabjg';

async function runSQL(sql) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro na API: ${response.status} ${text}`);
    }
    return await response.json();
}

async function test() {
    console.log('Testando conexão SQL via Management API...');
    try {
        const result = await runSQL('SELECT 1');
        console.log('✅ Conexão SQL OK:', result);
    } catch (err) {
        console.error('❌ Erro:', err.message);

        // Tentar endpoint alternativo /sql se /query falhar
        console.log('Tentando endpoint alternativo /sql...');
        try {
            const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: 'SELECT 1' })
            });
            if (response.ok) {
                console.log('✅ Conexão SQL OK via /sql');
            } else {
                console.log(`❌ /sql também falhou: ${response.status}`);
            }
        } catch (err2) {
            console.error('❌ Erro no fallback:', err2.message);
        }
    }
}

test();
