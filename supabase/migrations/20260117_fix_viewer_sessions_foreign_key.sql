-- Fix foreign key constraint violations in viewer_sessions
-- This migration ensures that user_id references are valid or null

-- Function to validate and clean user_id before insert/update
CREATE OR REPLACE FUNCTION validate_viewer_session_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is not null, verify it exists in users table
  IF NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id) THEN
      -- User doesn't exist, set to null
      NEW.user_id := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate user_id before insert/update
DROP TRIGGER IF EXISTS trigger_validate_viewer_session_user_id ON viewer_sessions;
CREATE TRIGGER trigger_validate_viewer_session_user_id
  BEFORE INSERT OR UPDATE ON viewer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_viewer_session_user_id();

-- Clean existing invalid references (set to null where user doesn't exist)
UPDATE viewer_sessions
SET user_id = NULL
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = viewer_sessions.user_id);

-- Add comment explaining the fix
COMMENT ON FUNCTION validate_viewer_session_user_id() IS 
  'Validates that user_id exists in users table before insert/update. Sets to NULL if user does not exist.';
