-- Script para verificar todas as tabelas do banco de dados
-- Execute no SQL Editor do Supabase

-- Listar todas as tabelas
SELECT 
  table_name as "Nome da Tabela",
  CASE 
    WHEN table_name = 'users' THEN '✅ Usuários'
    WHEN table_name = 'numbers' THEN '✅ Números da Rifa'
    WHEN table_name = 'extra_number_requests' THEN '✅ Solicitações de Números'
    WHEN table_name = 'draw_results' THEN '✅ Resultados dos Sorteios'
    WHEN table_name = 'audit_logs' THEN '✅ Logs de Auditoria'
    WHEN table_name = 'payment_proofs' THEN '✅ Comprovantes'
    WHEN table_name = 'raffles' THEN '✅ Rifas'
    WHEN table_name = 'live_raffles' THEN '✅ Rifas ao Vivo'
    WHEN table_name = 'profiles' THEN '✅ Perfis'
    WHEN table_name = 'live_games' THEN '✅ Jogos ao Vivo'
    WHEN table_name = 'live_participants' THEN '✅ Participantes'
    WHEN table_name = 'live_streams' THEN '⭐ Transmissões ao Vivo'
    WHEN table_name = 'live_chat_messages' THEN '⭐ Chat ao Vivo'
    ELSE 'Outra tabela'
  END as "Descrição"
FROM 
  information_schema.tables
WHERE 
  table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY 
  table_name;

-- Verificar tabelas específicas do Live Streaming
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'live_streams'
    ) THEN '✅ live_streams existe'
    ELSE '❌ live_streams NÃO existe'
  END as "Status live_streams",
  
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'live_chat_messages'
    ) THEN '✅ live_chat_messages existe'
    ELSE '❌ live_chat_messages NÃO existe'
  END as "Status live_chat_messages";

-- Contar registros em cada tabela (se existirem)
SELECT 
  'users' as tabela,
  COUNT(*) as total_registros
FROM users
UNION ALL
SELECT 
  'numbers',
  COUNT(*)
FROM numbers
UNION ALL
SELECT 
  'live_streams',
  COUNT(*)
FROM live_streams
UNION ALL
SELECT 
  'live_chat_messages',
  COUNT(*)
FROM live_chat_messages;

