-- Add updated_at and banner_url to cruzeiro_games
ALTER TABLE cruzeiro_games 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Função auxiliar para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = user_id AND is_admin = true
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS if needed
DROP POLICY IF EXISTS "Admins can manage cruzeiro_games" ON cruzeiro_games;
CREATE POLICY "Admins can manage cruzeiro_games"
  ON cruzeiro_games
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
