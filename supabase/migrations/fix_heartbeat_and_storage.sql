-- =====================================================
-- FIX: Viewer Heartbeat and Banner Storage
-- =====================================================

-- 1. Create or replace the update_viewer_heartbeat function
CREATE OR REPLACE FUNCTION update_viewer_heartbeat(
  p_session_id text
)
RETURNS void AS $$
BEGIN
  UPDATE viewer_sessions
  SET last_heartbeat = NOW()
  WHERE session_id = p_session_id
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure count_active_unique_viewers is optimized
CREATE OR REPLACE FUNCTION count_active_unique_viewers(
  p_stream_id uuid
)
RETURNS BIGINT AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(DISTINCT session_id)
  INTO v_count
  FROM viewer_sessions
  WHERE stream_id = p_stream_id
    AND is_active = true
    AND last_heartbeat > NOW() - INTERVAL '30 seconds'; -- Reduced interval for better responsiveness
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create banners storage bucket
-- Use a DO block to safely create the bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('banners', 'banners', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- 4. Storage Policies for banners
-- Allow public to read banners
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'banners');

-- Allow admins to manage banners
CREATE POLICY "Admins can manage banners" ON storage.objects FOR ALL 
USING (
  bucket_id = 'banners' 
  AND (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  )
);
