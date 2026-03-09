const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDk5NTcsImV4cCI6MjA3MjkyNTk1N30.Fj4f7LatljCx8SUFgH6un_jldg5eXrI37XB4DK7vSog';
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalCheck() {
  const { data: vips } = await supabase.from('users').select('name, vip_expires_at').eq('is_vip', true);
  console.log('--- VIP EXPIRATIONS ---');
  vips.slice(0, 5).forEach(v => console.log(`${v.name}: ${v.vip_expires_at}`));
  console.log(`... and ${vips.length - 5} more.`);

  const { data: pool } = await supabase.from('match_pools').select('id, match_title, result_home_score, result_away_score').order('created_at', { ascending: false }).limit(1).single();
  console.log('\n--- POOL DATA ---');
  console.log(`Latest Pool: ${pool.match_title}`);
  console.log(`Result: ${pool.result_home_score} x ${pool.result_away_score}`);

  const { count: betCount } = await supabase.from('pool_bets').select('*', { count: 'exact', head: true }).eq('pool_id', pool.id).eq('payment_status', 'approved');
  console.log(`Total Approved Bets: ${betCount}`);

  const { data: winners } = await supabase.from('pool_bets').select('users(name)').eq('pool_id', pool.id).eq('payment_status', 'approved').eq('predicted_home_score', pool.result_home_score).eq('predicted_away_score', pool.result_away_score);
  console.log(`Winners Found: ${winners.length}`);
}
finalCheck();
