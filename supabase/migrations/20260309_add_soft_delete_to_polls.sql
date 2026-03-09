-- Migração: Adicionar exclusão lógica para enquetes
-- Objetivo: Permitir que o admin exclua uma enquete da visualização sem perder os dados de votos.

-- 1. Adicionar coluna is_deleted
ALTER TABLE stream_polls 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- 2. Atualizar índices para considerar apenas enquetes não deletadas (opcional, mas recomendado)
DROP INDEX IF EXISTS idx_stream_polls_active;
CREATE INDEX IF NOT EXISTS idx_stream_polls_active 
ON stream_polls(stream_id, is_active) 
WHERE is_active = true AND is_deleted = false;

DROP INDEX IF EXISTS idx_stream_polls_pinned;
CREATE INDEX IF NOT EXISTS idx_stream_polls_pinned 
ON stream_polls(stream_id, is_pinned) 
WHERE is_pinned = true AND is_deleted = false;

-- 3. Atualizar Políticas de RLS para que usuários comuns não vejam enquetes "deletadas"
-- Primeiro removemos as políticas existentes que seriam impeditivas
DROP POLICY IF EXISTS "Anyone can read active polls" ON stream_polls;

-- Nova política: Todos podem ler enquetes ativas que não foram deletadas
CREATE POLICY "Anyone can read active polls" ON stream_polls
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND is_deleted = false);

-- 4. Função para obter resultados: garantir que funcione mesmo em enquetes deletadas (para o admin)
-- A função get_poll_results não precisa de alteração pois ela já busca por ID direto e não tem filtro is_active.
-- Apenas garantimos que o admin continue tendo acesso via RLS (a política "Admins can manage polls" já cobre SELECT sem filtros).
