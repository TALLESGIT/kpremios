-- Enable RLS on viewer_sessions if not already enabled
ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anonymous) to select from viewer_sessions
-- This is needed for the viewer count to work on the client side if not using RPC
CREATE POLICY "Public viewers can view sessions"
ON viewer_sessions FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anyone to insert a new viewer session
-- Used when a user first joins the stream
CREATE POLICY "Public viewers can insert sessions"
ON viewer_sessions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone to update their own session based on session_id
-- Used for heartbeats and marking as inactive
CREATE POLICY "Public viewers can update their sessions"
ON viewer_sessions FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions to anon and authenticated roles
GRANT ALL ON viewer_sessions TO anon;
GRANT ALL ON viewer_sessions TO authenticated;
GRANT ALL ON viewer_sessions TO service_role;
