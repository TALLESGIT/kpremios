-- Migration: Encerrar promoção VIP hoje às 20:30
-- Criado em: 2026-01-14
-- Descrição: Atualiza a função grant_free_vip_if_eligible para encerrar a promoção hoje às 20:30

-- Atualizar função para encerrar promoção hoje às 20:30
CREATE OR REPLACE FUNCTION grant_free_vip_if_eligible(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_already_vip BOOLEAN;
  v_count INTEGER;
  v_current_timestamp TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  -- Verificar se é admin
  SELECT is_admin INTO v_is_admin FROM users WHERE id = p_user_id;
  IF v_is_admin THEN
    RETURN FALSE; -- Admins não participam
  END IF;
  
  -- Verificar se já tem VIP
  SELECT is_vip INTO v_already_vip FROM users WHERE id = p_user_id;
  IF v_already_vip THEN
    RETURN FALSE; -- Já tem VIP
  END IF;
  
  -- Verificar data/hora - promoção encerra hoje (2026-01-14) às 20:30
  v_current_timestamp := NOW();
  v_end_time := '2026-01-14 20:30:00'::TIMESTAMPTZ;
  
  IF v_current_timestamp >= v_end_time THEN
    RETURN FALSE; -- Promoção expirou hoje às 20:30
  END IF;
  
  -- Contar VIPs grátis já concedidos
  SELECT COUNT(*) INTO v_count 
  FROM users 
  WHERE vip_type = 'free' AND vip_granted_at IS NOT NULL;
  
  -- Atualizado para 100 primeiros usuários
  IF v_count >= 100 THEN
    RETURN FALSE; -- Já chegou ao limite
  END IF;
  
  -- Conceder VIP grátis (mantém expiração original em 01/02/2026)
  UPDATE users SET
    is_vip = TRUE,
    vip_type = 'free',
    vip_granted_at = NOW(),
    vip_expires_at = '2026-02-01 23:59:59'::TIMESTAMP
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION grant_free_vip_if_eligible IS 'Concede VIP grátis para os 100 primeiros usuários. Promoção encerra hoje (2026-01-14) às 20:30';
