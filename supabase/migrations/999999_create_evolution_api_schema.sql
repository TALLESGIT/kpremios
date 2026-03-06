-- ============================================
-- SCHEMA SEPARADO PARA EVOLUTION API
-- ============================================
-- Este schema será usado exclusivamente pela Evolution API
-- Mantém os dados separados do schema principal (public)
-- ============================================

-- Criar schema separado
CREATE SCHEMA IF NOT EXISTS evolution_api;

-- Dar permissões necessárias
GRANT ALL ON SCHEMA evolution_api TO postgres;
GRANT ALL ON SCHEMA evolution_api TO authenticated;
GRANT ALL ON SCHEMA evolution_api TO service_role;

-- Comentário explicativo
COMMENT ON SCHEMA evolution_api IS 'Schema dedicado para Evolution API - WhatsApp integration';

-- ============================================
-- NOTA: As tabelas serão criadas automaticamente
-- pela Evolution API quando ela iniciar pela primeira vez
-- ============================================

