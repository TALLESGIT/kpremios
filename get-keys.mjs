import fetch from 'node-fetch';

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
        keys.forEach(k => {
            console.log(`- ${k.name}: ${k.api_key.substring(0, 10)}...`);
        });

        const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;
        if (serviceKey) {
            console.log('\n✅ Service Role Key encontrada!');
            console.log('Use esta chave no seu script de migração.');
        } else {
            console.log('\n❌ Service Role Key não encontrada.');
        }
    } catch (err) {
        console.error('Erro ao buscar chaves:', err.message);
    }
}

getKeys();
