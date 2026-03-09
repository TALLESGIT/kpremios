const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDk5NTcsImV4cCI6MjA3MjkyNTk1N30.Fj4f7LatljCx8SUFgH6un_jldg5eXrI37XB4DK7vSog';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActiveVips() {
  const now = new Date().toISOString();

  // Buscar usuários onde is_vip é true
  const { data: vips, error } = await supabase
    .from('users')
    .select('id, name, whatsapp, is_vip, vip_type, vip_expires_at')
    .eq('is_vip', true);

  if (error) {
    console.error('Erro ao buscar VIPs:', error.message);
    return;
  }

  console.log(`\n--- RELATÓRIO DE VIPS (Total no Banco: ${vips.length}) ---`);

  const activeVips = vips.filter(v => {
    // Se não tiver data de expiração, consideramos ativo (permanente)
    // Se tiver, comparamos com a data atual
    return !v.vip_expires_at || new Date(v.vip_expires_at) > new Date();
  });

  console.log(`VIPs Ativos (dentro do prazo): ${activeVips.length}`);

  if (activeVips.length > 0) {
    console.log('\nLista de VIPs Ativos:');
    activeVips.forEach(v => {
      const exp = v.vip_expires_at ? new Date(v.vip_expires_at).toLocaleDateString('pt-BR') : 'Permanente';
      console.log(`- ${v.name} | WhatsApp: ${v.whatsapp} | Tipo: ${v.vip_type || 'N/A'} | Expira em: ${exp}`);
    });
  } else {
    console.log('Nenhum VIP ativo encontrado.');
  }

  const expiredVips = vips.filter(v => v.vip_expires_at && new Date(v.vip_expires_at) <= new Date());
  if (expiredVips.length > 0) {
    console.log(`\nVIPs Expirados: ${expiredVips.length}`);
  }
}

checkActiveVips();
