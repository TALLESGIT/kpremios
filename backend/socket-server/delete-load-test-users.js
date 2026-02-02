// =====================================================
// APAGAR USUÁRIOS DE TESTE DE CARGA (Auth + public.users + mensagens)
// Uso: node delete-load-test-users.js [pathUsersJson]
// Requer: .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// Lê: load-test-users.json (ou caminho passado) com [{ id, email, name }, ...]
// =====================================================

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const { createClient } = require('@supabase/supabase-js');

const usersJsonPath = process.argv[2] || path.join(__dirname, 'load-test-users.json');
const BATCH_SIZE = 30;
const DELAY_MS = 200;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

if (!fs.existsSync(usersJsonPath)) {
  console.error('Ficheiro não encontrado:', usersJsonPath);
  console.error('Execute primeiro: node create-load-test-users.js 850');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const list = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
  const ids = list.map((u) => u.id).filter(Boolean);
  if (ids.length === 0) {
    console.log('Nenhum id no ficheiro.');
    process.exit(0);
  }

  console.log('A apagar', ids.length, 'usuários de teste...');

  // 1) Mensagens de chat (user_id -> null ou apagar; aqui apagamos para limpar)
  const { error: msgErr } = await supabase.from('live_chat_messages').delete().in('user_id', ids);
  if (msgErr) console.warn('Aviso ao apagar mensagens:', msgErr.message);
  else console.log('Mensagens de chat limpas.');

  // 2) public.users
  const { error: usersErr } = await supabase.from('users').delete().in('id', ids);
  if (usersErr) {
    console.error('Erro ao apagar public.users:', usersErr.message);
    process.exit(1);
  }
  console.log('Linhas em public.users apagadas.');

  // 3) Auth (em lotes para não sobrecarregar)
  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((uid) =>
        supabase.auth.admin.deleteUser(uid).then(({ error }) => {
          if (error) console.warn('Aviso ao apagar auth user', uid, error.message);
          else deleted++;
        })
      )
    );
    if ((i + batch.length) % 100 === 0 || i + batch.length === ids.length) {
      console.log('Auth: apagados', deleted, '/', ids.length);
    }
    await delay(DELAY_MS);
  }

  console.log('Total apagados na Auth:', deleted);
  console.log('Pode remover ou manter o ficheiro', usersJsonPath);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
