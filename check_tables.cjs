const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDk5NTcsImV4cCI6MjA3MjkyNTk1N30.Fj4f7LatljCx8SUFgH6un_jldg5eXrI37XB4DK7vSog';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTables() {
  const tables = [
    'users',
    'match_pools',
    'pool_bets',
    'raffles',
    'numbers',
    'extra_number_requests',
    'draw_results',
    'vip_subscriptions'
  ];

  console.log('--- DATABASE TABLE COUNTS ---');
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`${table}: Error - ${error.message}`);
    } else {
      console.log(`${table}: ${count} records`);
    }
  }
}

checkAllTables();
