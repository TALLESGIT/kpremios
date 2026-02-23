// =====================================================
// CRIAR USUÁRIOS DE TESTE DE CARGA (Auth + public.users)
// Uso: node create-load-test-users.js [quantidade] [numVips]
// Requer: .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// Gera: load-test-users.json (lista de id, email, name para o load-test.js)
// =====================================================

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const { createClient } = require('@supabase/supabase-js');

const COUNT = parseInt(process.argv[2] || '1500', 10);
const NUM_VIPS = parseInt(process.argv[3] || '25', 10); // primeiros N usuários são VIP (para stress de mensagens VIP)
const BATCH_SIZE = 25;
const DELAY_MS = 400;
const PREFIX_EMAIL = 'loadtest';
const DOMAIN_EMAIL = 'zkpremios-loadtest.local';
const PASSWORD = 'LoadTest123!';

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const usersCreated = [];

async function createOneUser(index) {
  const email = `${PREFIX_EMAIL}-${String(index).padStart(4, '0')}@${DOMAIN_EMAIL}`;
  const name = `Viewer${index}`;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name }
  });

  if (authError) {
    if (authError.message && authError.message.includes('already been registered')) {
      const { data: existing } = await supabase.from('users').select('id, name, email, is_vip').eq('email', email).single();
      if (existing) {
        usersCreated.push({ id: existing.id, email: existing.email, name: existing.name || name, is_vip: !!existing.is_vip });
        return null;
      }
    }
    throw authError;
  }

  const userId = authData.user.id;

  const isVip = index <= NUM_VIPS;
  const { error: insertError } = await supabase.from('users').upsert(
    {
      id: userId,
      name,
      email,
      whatsapp: '(11) 00000-0000',
      is_admin: false,
      is_vip: isVip
    },
    { onConflict: 'id' }
  );

  if (insertError) throw insertError;

  usersCreated.push({ id: userId, email, name, is_vip: isVip });
  return null;
}

async function run() {
  console.log('Criando', COUNT, 'usuários de teste (Auth + public.users)...');
  console.log('VIPs (primeiros):', NUM_VIPS);
  console.log('E-mail exemplo:', `${PREFIX_EMAIL}-0001@${DOMAIN_EMAIL}\n`);

  for (let i = 0; i < COUNT; i += BATCH_SIZE) {
    const batch = Math.min(BATCH_SIZE, COUNT - i);
    const promises = [];
    for (let j = 0; j < batch; j++) {
      promises.push(createOneUser(i + j + 1));
    }
    await Promise.all(promises);
    if ((i + batch) % 100 === 0 || i + batch === COUNT) {
      console.log('Criados:', usersCreated.length, '/', COUNT);
    }
    await delay(DELAY_MS);
  }

  const outPath = path.join(__dirname, 'load-test-users.json');
  fs.writeFileSync(outPath, JSON.stringify(usersCreated, null, 2), 'utf8');
  console.log('\nFicheiro gerado:', outPath);
  console.log('Total:', usersCreated.length, 'usuários.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
