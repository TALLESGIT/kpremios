-- Migration: Create opponent_players table
-- Date: 2026-03-20

CREATE TABLE IF NOT EXISTS public.opponent_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  full_name TEXT,
  photo_url TEXT,
  position TEXT NOT NULL, -- GOL, LAT, ZAG, MEI, ATA
  number INTEGER,
  team_id INTEGER NOT NULL, -- api-sports team_id
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.opponent_players ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access to opponent_players" 
  ON public.opponent_players FOR SELECT USING (true);

CREATE POLICY "Admins can manage opponent_players" 
  ON public.opponent_players FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_opponent_players_team_id ON public.opponent_players(team_id);
