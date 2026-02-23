-- Migration: Cleanup old match pools and live games
-- Deletes data older than 7 days

CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete match pools and their bets older than 7 days
  -- Cascade should handle pool_bets if foreign key is set to CASCADE
  DELETE FROM match_pools 
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete live games and their participants older than 7 days
  DELETE FROM live_games 
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Optional: Log the cleanup (if you have a logs table)
  -- INSERT INTO system_logs (action, details) VALUES ('cleanup', 'Old pools and games deleted');
END;
$$ LANGUAGE plpgsql;
