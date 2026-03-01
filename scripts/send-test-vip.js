/**
 * TESTE DE ALERTA VIP
 * 
 * Instruções:
 * 1. Abra o Console do navegador no Administrativo.
 * 2. Copie e cole o código abaixo.
 * 
 * Ou execute via Node:
 * node scripts/send-test-vip.js
 */

const TEST_VIP = {
  user_name: "Talles (Teste VIP)",
  stream_id: "COLOQUE_AQUI_O_ID_DA_STREAM" // Pegue no ID da URL se precisar
};

console.log("Para testar manualmente, use o SQL Editor do Supabase:");
console.log(`INSERT INTO vip_alerts (user_name, stream_id) VALUES ('${TEST_VIP.user_name}', '${TEST_VIP.stream_id}');`);
