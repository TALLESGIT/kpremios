#!/usr/bin/env node

/**
 * Script para aplicar todas as migrações do Supabase na ordem correta
 * 
 * Uso:
 *   node apply-all-migrations.js
 * 
 * Requisitos:
 *   - Supabase CLI instalado (npm install -g supabase)
 *   - Projeto linkado (supabase link --project-ref SEU_PROJECT_ID)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ordem correta das migrações
const MIGRATION_ORDER = [
  '20250911150206_tiny_desert.sql',
  '20250911160228_yellow_peak.sql',
  '20250911161545_light_glitter.sql',
  '20250911162352_copper_pebble.sql',
  '20250911163000_create_payment_proofs_bucket.sql',
  '20250911170000_add_rejection_reason.sql',
  '20250911180000_create_live_games_system.sql',
  '20241220_fix_live_raffles_rls.sql',
  '20241220_fix_profiles_rls.sql',
  '20241220_fix_user_deletion_rls.sql',
  '20250119_add_prize_image_to_raffles.sql',
  '20250119_create_prize_images_bucket.sql',
  '20250120_add_raffle_status.sql',
  '20250120_add_user_winner_fields.sql',
  '20250121_add_raffle_id_to_requests.sql',
  '20250123_create_update_user_extra_numbers_function.sql',
  '20250101_create_raffles_table.sql',
  '20250102_create_live_raffles_table.sql',
  '20250103_create_profiles_table.sql',
];

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

console.log('🚀 Iniciando aplicação de migrações do Supabase...\n');

// Verificar se Supabase CLI está instalado
try {
  execSync('supabase --version', { stdio: 'pipe' });
  console.log('✅ Supabase CLI encontrado\n');
} catch (error) {
  console.error('❌ Supabase CLI não está instalado!');
  console.error('   Instale com: npm install -g supabase\n');
  process.exit(1);
}

// Verificar se o projeto está linkado
try {
  execSync('supabase status', { stdio: 'pipe' });
  console.log('✅ Projeto Supabase linkado\n');
} catch (error) {
  console.error('❌ Projeto Supabase não está linkado!');
  console.error('   Execute: supabase link --project-ref SEU_PROJECT_ID\n');
  process.exit(1);
}

// Aplicar migrações na ordem
console.log('📝 Aplicando migrações na ordem correta...\n');

let successCount = 0;
let errorCount = 0;

MIGRATION_ORDER.forEach((migrationFile, index) => {
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.log(`⚠️  ${index + 1}/${MIGRATION_ORDER.length} - PULADO: ${migrationFile} (arquivo não encontrado)`);
    return;
  }

  try {
    console.log(`🔄 ${index + 1}/${MIGRATION_ORDER.length} - Aplicando: ${migrationFile}`);
    
    // Ler conteúdo da migração
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Aplicar via Supabase CLI
    execSync(`supabase db execute < "${migrationPath}"`, { 
      stdio: 'pipe',
      shell: true 
    });
    
    console.log(`✅ ${index + 1}/${MIGRATION_ORDER.length} - Sucesso: ${migrationFile}\n`);
    successCount++;
  } catch (error) {
    console.error(`❌ ${index + 1}/${MIGRATION_ORDER.length} - ERRO: ${migrationFile}`);
    console.error(`   ${error.message}\n`);
    errorCount++;
    
    // Perguntar se deve continuar
    if (errorCount > 3) {
      console.error('❌ Muitos erros! Abortando...\n');
      process.exit(1);
    }
  }
});

// Resumo final
console.log('\n' + '='.repeat(50));
console.log('📊 RESUMO DA MIGRAÇÃO');
console.log('='.repeat(50));
console.log(`✅ Sucesso: ${successCount} migrações`);
console.log(`❌ Erros: ${errorCount} migrações`);
console.log(`📝 Total: ${MIGRATION_ORDER.length} migrações`);
console.log('='.repeat(50) + '\n');

if (errorCount === 0) {
  console.log('🎉 Todas as migrações foram aplicadas com sucesso!');
  console.log('\n👤 Usuário admin padrão criado:');
  console.log('   Email: admin@zkpremios.com');
  console.log('   Senha: admin123');
  console.log('   ⚠️  Altere a senha após o primeiro login!\n');
} else {
  console.log('⚠️  Algumas migrações falharam. Verifique os erros acima.');
  console.log('   Você pode aplicá-las manualmente via SQL Editor do Supabase.\n');
}

console.log('📚 Para mais informações, consulte: supabase/MIGRACAO_COMPLETA.md\n');

