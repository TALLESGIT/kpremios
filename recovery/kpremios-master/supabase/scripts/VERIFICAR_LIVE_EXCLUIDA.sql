-- ============================================
-- 🚨 SCRIPT DE RECUPERAÇÃO: LIVE EXCLUÍDA
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- para verificar se há dados recuperáveis

-- 1. Verificar se há participantes órfãos (sem game_id válido)
-- Isso pode acontecer se o CASCADE não funcionou completamente
SELECT 
  lp.id,
  lp.user_id,
  lp.user_name,
  lp.lucky_number,
  lp.status,
  lp.joined_at,
  lp.game_id as game_id_orfao,
  u.name as nome_usuario,
  u.whatsapp,
  u.email
FROM live_participants lp
LEFT JOIN live_games lg ON lg.id = lp.game_id
LEFT JOIN users u ON u.id = lp.user_id
WHERE lg.id IS NULL  -- Participantes sem jogo associado
ORDER BY lp.joined_at DESC;

-- 2. Verificar jogos excluídos recentemente (últimas 24 horas)
-- Se você tiver backup ou logs, pode verificar aqui
SELECT 
  id,
  title,
  status,
  current_participants,
  created_at,
  finished_at
FROM live_games 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 3. Verificar todos os participantes ativos recentes
-- Para identificar quem participou do jogo excluído
SELECT 
  lp.*,
  u.name as nome_completo,
  u.whatsapp,
  u.email,
  lg.title as titulo_jogo,
  lg.status as status_jogo
FROM live_participants lp
LEFT JOIN users u ON u.id = lp.user_id
LEFT JOIN live_games lg ON lg.id = lp.game_id
WHERE lp.joined_at > NOW() - INTERVAL '7 days'
ORDER BY lp.joined_at DESC;

-- 4. Contar participantes por jogo (para identificar qual foi excluído)
SELECT 
  lg.id,
  lg.title,
  lg.status,
  COUNT(lp.id) as total_participantes,
  lg.created_at
FROM live_games lg
LEFT JOIN live_participants lp ON lp.game_id = lg.id
GROUP BY lg.id, lg.title, lg.status, lg.created_at
ORDER BY lg.created_at DESC;

-- ============================================
-- 📋 PRÓXIMOS PASSOS:
-- ============================================
-- 1. Se encontrar participantes órfãos (query 1), 
--    você pode recriar o jogo e associá-los novamente
-- 
-- 2. Se não encontrar nada, os dados foram perdidos
--    e você precisará restaurar do backup do Supabase
--
-- 3. Para restaurar do backup:
--    - Acesse: https://app.supabase.com
--    - Settings → Database → Backups
--    - Selecione um backup anterior à exclusão
--    - Restaure o banco de dados
