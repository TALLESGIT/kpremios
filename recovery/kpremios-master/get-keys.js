const ACCESS_TOKEN = 'sbp_e7adf29748ac8b2da3f5040e6848a929e07b8365';
const PROJECT_REF = 'bukigyhhgrtgryklabjg';

async function getKeys() {
    console.log(`Buscando chaves para o projeto: ${PROJECT_REF}...`);
    try {
        const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status} ${await response.text()}`);
        }

        const keys = await response.json();
        console.log('Chaves encontradas:');

        let serviceKey = null;
        keys.forEach(k => {
            console.log(`- ${k.name}: ${k.api_key.substring(0, 15)}...`);
            if (k.name === 'service_role') serviceKey = k.api_key;
        });

        if (serviceKey) {
            console.log('\n✅ Service Role Key encontrada!');
            console.log(`SERVICE_ROLE_KEY=${serviceKey}`);
        } else {
            console.log('\n❌ Service Role Key não encontrada.');
        }
    } catch (err) {
        console.error('Erro ao buscar chaves:', err.message);
    }
}

getKeys();
