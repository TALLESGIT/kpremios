-- =====================================================
-- FIX VIP OVERLAY VISIBILITY FOR ANONYMOUS USERS
-- =====================================================

-- 1. Create a secure RPC to check VIP status without exposing the users table
-- This allows the frontend to check if a message sender is VIP even if the current user is anonymous
CREATE OR REPLACE FUNCTION public_get_vip_status(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
    AND is_vip = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to everyone (including anon)
GRANT EXECUTE ON FUNCTION public_get_vip_status(uuid) TO anon, authenticated, service_role;


-- 2. Ensure live_chat_messages is readable by everyone
-- This is critical for the Realtime subscription to work for anonymous users
DROP POLICY IF EXISTS "Anyone can read messages from active streams" ON live_chat_messages;
DROP POLICY IF EXISTS "Todos podem ler mensagens" ON live_chat_messages;

CREATE POLICY "Public read access to chat"
ON live_chat_messages
FOR SELECT
TO anon, authenticated
USING (true); -- Simply allow reading all messages. If privacy is a concern, we can scope to stream_id but for Realtime simply 'true' is most robust.
