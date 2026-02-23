/*
  # Adicionar campo pinned_link na tabela live_chat_messages
  
  1. Nova Coluna
    - `pinned_link` (text) - Link fixado pelo admin no chat
    - `is_pinned` (boolean) - Indica se a mensagem tem link fixado
*/

-- Adicionar colunas para link fixado
ALTER TABLE live_chat_messages 
ADD COLUMN IF NOT EXISTS pinned_link text,
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Criar índice para mensagens fixadas
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_is_pinned ON live_chat_messages(is_pinned) WHERE is_pinned = true;

-- Comentários
COMMENT ON COLUMN live_chat_messages.pinned_link IS 'Link fixado pelo admin para os usuários clicarem';
COMMENT ON COLUMN live_chat_messages.is_pinned IS 'Indica se a mensagem tem um link fixado';

