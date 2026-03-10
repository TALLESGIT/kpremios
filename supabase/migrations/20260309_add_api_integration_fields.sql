-- Migration: Add API integration fields to Cruzeiro tables
-- Date: 2026-03-09

-- Add columns to cruzeiro_standings
ALTER TABLE cruzeiro_standings 
ADD COLUMN IF NOT EXISTS api_team_id INTEGER,
ADD COLUMN IF NOT EXISTS api_league_id INTEGER;

-- Add columns to cruzeiro_games
ALTER TABLE cruzeiro_games 
ADD COLUMN IF NOT EXISTS api_fixture_id INTEGER,
ADD COLUMN IF NOT EXISTS api_league_id INTEGER,
ADD COLUMN IF NOT EXISTS api_home_team_id INTEGER,
ADD COLUMN IF NOT EXISTS api_away_team_id INTEGER;

-- Create index for performance on sync
CREATE INDEX IF NOT EXISTS idx_cruzeiro_standings_api_team ON cruzeiro_standings(api_team_id, api_league_id);
CREATE INDEX IF NOT EXISTS idx_cruzeiro_games_api_fixture ON cruzeiro_games(api_fixture_id);
