-- Create ZK TV Settings Table
CREATE TABLE IF NOT EXISTS cruzeiro_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  live_url TEXT,
  is_live BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default settings
INSERT INTO cruzeiro_settings (live_url, is_live)
VALUES ('', false)
ON CONFLICT DO NOTHING;

-- Create ZK TV Games Table
CREATE TABLE IF NOT EXISTS cruzeiro_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opponent TEXT NOT NULL,
  opponent_logo TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT,
  score_home INTEGER,
  score_away INTEGER,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'finished', 'live')),
  competition TEXT,
  is_home BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create ZK TV Standings Table
CREATE TABLE IF NOT EXISTS cruzeiro_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position INTEGER NOT NULL,
  team TEXT NOT NULL,
  logo TEXT,
  points INTEGER DEFAULT 0,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  is_cruzeiro BOOLEAN DEFAULT false,
  competition TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE cruzeiro_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cruzeiro_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE cruzeiro_standings ENABLE ROW LEVEL SECURITY;

-- Select policies (public)
CREATE POLICY "Allow public read access to cruzeiro_settings" ON cruzeiro_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read access to cruzeiro_games" ON cruzeiro_games FOR SELECT USING (true);
CREATE POLICY "Allow public read access to cruzeiro_standings" ON cruzeiro_standings FOR SELECT USING (true);

-- Admin policies (full access)
CREATE POLICY "Admins can manage cruzeiro_settings"
  ON cruzeiro_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage cruzeiro_games"
  ON cruzeiro_games
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage cruzeiro_standings"
  ON cruzeiro_standings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );
