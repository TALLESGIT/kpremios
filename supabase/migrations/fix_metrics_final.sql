-- =====================================================
-- COMPREHENSIVE FIX FOR VIEWER METRICS AND RPCs
-- =====================================================

-- 1. Ensure RLS is correct for public access
ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public access for all operations on viewer_sessions
-- We use a broad policy here to ensure no friction for anonymous viewers
DROP POLICY IF EXISTS "Public access to viewer_sessions" ON viewer_sessions;
CREATE POLICY "Public access to viewer_sessions"
ON viewer_sessions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. CREATE MISSING RPC: update_viewer_heartbeat
-- This was likely missing, causing the frontend heartbeat loop to fail silently
CREATE OR REPLACE FUNCTION update_viewer_heartbeat(p_session_id text)
RETURNS VOID AS $$
BEGIN
  UPDATE viewer_sessions
  SET last_heartbeat = NOW(),
      is_active = TRUE
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FIX count_active_unique_viewers
-- Ensure it correctly counts sessions active in the last 30 seconds (standard heartbeat window)
CREATE OR REPLACE FUNCTION count_active_unique_viewers(p_stream_id uuid)
RETURNS BIGINT AS $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(DISTINCT session_id)
    INTO v_count
    FROM viewer_sessions
    WHERE stream_id = p_stream_id
      AND is_active = TRUE
      AND last_heartbeat > NOW() - INTERVAL '30 seconds'; -- Tighten window to 30s for accuracy
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FIX get_stream_statistics
-- Ensure it uses the same logic
CREATE OR REPLACE FUNCTION get_stream_statistics(p_stream_id uuid)
RETURNS TABLE (
  total_viewers bigint,
  active_viewers bigint,
  avg_watch_time numeric,
  unique_sessions bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT session_id)::bigint as total_viewers, -- Use session_id instead of user_id to count anons
    COUNT(DISTINCT CASE WHEN is_active = true AND last_heartbeat > NOW() - INTERVAL '30 seconds' THEN session_id END)::bigint as active_viewers,
    COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))), 0)::numeric as avg_watch_time,
    COUNT(DISTINCT session_id)::bigint as unique_sessions
  FROM viewer_sessions
  WHERE stream_id = p_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to anonymous users for these functions
GRANT EXECUTE ON FUNCTION update_viewer_heartbeat(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_active_unique_viewers(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_stream_statistics(uuid) TO anon, authenticated;
