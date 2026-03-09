const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://bukigyhhgrtgryklabjg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0OTk1NywiZXhwIjoyMDcyOTI1OTU3fQ.G41qsBF6Spd5-ZkHqhtAtkzrds5EcORtpgwz1-8PoZQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function applyMigration() {
  console.log('🚀 Iniciando aplicação da migração...');
  const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260309_add_soft_delete_to_polls.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Tentar executar via RPC exec_sql se existir
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) throw error;
    console.log('✅ Migração aplicada via RPC com sucesso!');
  } catch (err) {
    console.log('⚠️ Erro ao aplicar via RPC (exec_sql pode não existir):', err.message);
    console.log('Tentando decompor o SQL...');

    // Decompor o SQL em comandos simples (fallback)
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
    for (let cmd of commands) {
      try {
        // Infelizmente o supabase-js não tem um método genérico para raw SQL sem RPC.
        // Mas podemos tentar inferir as mudanças via queries se o RPC não existir.
        console.log(`Comando: ${cmd.substring(0, 50)}...`);
      } catch (e) {
        console.error('Falha no fallback:', e.message);
      }
    }
  }
}

async function diagnoseVips() {
  console.log('\n🔍 Diagnosticando VIPs...');
  const { data: vips, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_vip', true);

  if (error) {
    console.error('Erro ao buscar VIPs:', error.message);
    return;
  }

  console.log(`Total de VIPs no sistema: ${vips.length}`);

  const now = new Date();
  const active = vips.filter(v => !v.vip_expires_at || new Date(v.vip_expires_at) > now);
  const expired = vips.filter(v => v.vip_expires_at && new Date(v.vip_expires_at) <= now);

  console.log(`VIPs Ativos: ${active.length}`);
  console.log(`VIPs Expirados: ${expired.length}`);

  if (active.length > 0) {
    console.log('\nExemplo de VIP Ativo:');
    console.log(JSON.stringify(active[0], null, 2));
  }

  if (expired.length > 0) {
    console.log('\nExemplo de VIP Expirado:');
    console.log(JSON.stringify(expired[0], null, 2));
  }
}

async function run() {
  await applyMigration();
  await diagnoseVips();
}

run();
