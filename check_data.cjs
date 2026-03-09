const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDk5NTcsImV4cCI6MjA3MjkyNTk1N30.Fj4f7LatljCx8SUFgH6un_jldg5eXrI37XB4DK7vSog';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const now = new Date().toISOString();

  console.log('--- VIP STATUS ---');
  const { data: vips, error: vipError } = await supabase
    .from('users')
    .select('name, is_vip, vip_type, vip_expires_at')
    .eq('is_vip', true);

  if (vipError) console.error(vipError);
  else {
    console.log(`Total VIPs in DB: ${vips.length}`);
    const active = vips.filter(v => !v.vip_expires_at || new Date(v.vip_expires_at) > new Date());
    console.log(`Active VIPs: ${active.length}`);
    active.forEach(v => console.log(`- ${v.name} (${v.vip_type}) exp: ${v.vip_expires_at}`));
  }

  console.log('\n--- LATEST POOL ---');
  const { data: pool, error: pError } = await supabase
    .from('match_pools')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (pError) console.error(pError);
  else {
    console.log(`Pool: ${pool.match_title}`);
    console.log(`Status: ${pool.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`Result: ${pool.result_home_score} x ${pool.result_away_score}`);

    const { data: bets, error: bError } = await supabase
      .from('pool_bets')
      .select('predicted_home_score, predicted_away_score, payment_status, users(name)')
      .eq('pool_id', pool.id)
      .eq('payment_status', 'approved');

    if (bError) console.error(bError);
    else {
      console.log(`Total Approved Bets: ${bets.length}`);
      const winners = bets.filter(b =>
        b.predicted_home_score === pool.result_home_score &&
        b.predicted_away_score === pool.result_away_score
      );
      console.log(`Winners: ${winners.length}`);
      winners.forEach(w => console.log(`- WINNER: ${w.users.name} (${w.predicted_home_score}x${w.predicted_away_score})`));

      if (winners.length === 0 && bets.length > 0) {
        console.log('Top predictions:');
        bets.slice(0, 5).forEach(b => console.log(`- ${b.users.name}: ${b.predicted_home_score}x${b.predicted_away_score}`));
      }
    }
  }
}

checkData();
