-- Adiciona a coluna vip_color à tabela live_chat_messages para suportar cores exclusivas de VIPs no chat.
ALTER TABLE public.live_chat_messages 
ADD COLUMN IF NOT EXISTS vip_color TEXT;

COMMENT ON COLUMN public.live_chat_messages.vip_color IS 'Cor personalizada do usuário VIP (ex: purple, gold, hex)';
