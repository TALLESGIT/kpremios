-- Migration: Proteger is_visible em stream_sources
-- Criado em: 2026-01-13
-- Descrição: Garantir que apenas admins possam atualizar is_visible nas fontes
-- Isso previne que o ZK Studio preview atualize is_visible diretamente para os usuários

-- Verificar se a tabela stream_sources existe e tem RLS habilitado
DO $$
BEGIN
  -- Verificar se a tabela existe
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stream_sources') THEN
    -- Habilitar RLS se ainda não estiver habilitado
    ALTER TABLE stream_sources ENABLE ROW LEVEL SECURITY;
    
    -- Remover políticas antigas se existirem
    DROP POLICY IF EXISTS "Admins can update stream_sources visibility" ON stream_sources;
    DROP POLICY IF EXISTS "Anyone can update stream_sources" ON stream_sources;
    
    -- Criar política que permite apenas admins atualizarem is_visible
    -- Outros campos podem ser atualizados normalmente (para ZK Studio poder atualizar posição, conteúdo, etc)
    -- Mas is_visible só pode ser atualizado por admins
    CREATE POLICY "Admins can update stream_sources visibility"
      ON stream_sources
      FOR UPDATE
      TO authenticated
      USING (
        -- Permitir atualização se o usuário for admin
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND users.is_admin = true
        )
        OR
        -- Permitir atualização de outros campos (não is_visible) se não for admin
        -- Mas isso é verificado no WITH CHECK
        true
      )
      WITH CHECK (
        -- Se está tentando atualizar is_visible, deve ser admin
        (
          -- Se não está mudando is_visible, permitir
          (OLD.is_visible IS NOT DISTINCT FROM NEW.is_visible)
          OR
          -- Se está mudando is_visible, deve ser admin
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.is_admin = true
          )
        )
      );
    
    RAISE NOTICE 'Política RLS criada para stream_sources.is_visible';
  ELSE
    RAISE NOTICE 'Tabela stream_sources não encontrada. Pulando criação de política.';
  END IF;
END $$;
