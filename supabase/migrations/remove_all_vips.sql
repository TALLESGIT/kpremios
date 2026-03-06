-- Migration: Remover todos os VIPs ativos
-- Criado em: 2025-01-30
-- Descrição: Remove todos os status VIP dos usuários e limpa assinaturas VIP

-- 1. Remover status VIP de todos os usuários na tabela users
UPDATE users
SET 
  is_vip = false,
  vip_type = NULL,
  vip_granted_at = NULL,
  vip_expires_at = NULL,
  vip_payment_id = NULL,
  vip_since = NULL
WHERE is_vip = true;

-- 2. Desativar todas as assinaturas VIP ativas
UPDATE vip_subscriptions
SET 
  status = 'cancelled',
  expires_at = NOW()
WHERE status = 'active';

-- 3. Verificar quantos VIPs foram removidos
DO $$
DECLARE
  v_users_updated INTEGER;
  v_subscriptions_updated INTEGER;
BEGIN
  GET DIAGNOSTICS v_users_updated = ROW_COUNT;
  
  SELECT COUNT(*) INTO v_subscriptions_updated
  FROM vip_subscriptions
  WHERE status = 'cancelled';
  
  RAISE NOTICE 'VIPs removidos: % usuários, % assinaturas', v_users_updated, v_subscriptions_updated;
END $$;

-- 4. Comentário de confirmação
COMMENT ON FUNCTION remove_all_vips() IS 'Remove todos os status VIP dos usuários e cancela todas as assinaturas VIP ativas';

