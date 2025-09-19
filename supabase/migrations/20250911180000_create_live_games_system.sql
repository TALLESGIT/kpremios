-- Criar tabela para jogos ao vivo (Resta Um)
CREATE TABLE live_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
  max_participants INTEGER DEFAULT 100,
  current_participants INTEGER DEFAULT 0,
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  elimination_interval INTEGER DEFAULT 30, -- segundos entre eliminações
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela para participantes da live
CREATE TABLE live_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES live_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  lucky_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner')),
  eliminated_at TIMESTAMP WITH TIME ZONE,
  elimination_round INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id),
  UNIQUE(game_id, lucky_number)
);

-- Criar índices para performance
CREATE INDEX idx_live_games_status ON live_games(status);
CREATE INDEX idx_live_games_created_by ON live_games(created_by);
CREATE INDEX idx_live_participants_game_id ON live_participants(game_id);
CREATE INDEX idx_live_participants_user_id ON live_participants(user_id);
CREATE INDEX idx_live_participants_status ON live_participants(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE live_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_participants ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para live_games
CREATE POLICY "Todos podem ver jogos ativos" ON live_games
  FOR SELECT USING (status IN ('waiting', 'active'));

CREATE POLICY "Admins podem gerenciar jogos" ON live_games
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Políticas de segurança para live_participants
CREATE POLICY "Todos podem ver participantes de jogos ativos" ON live_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_games 
      WHERE live_games.id = live_participants.game_id 
      AND live_games.status IN ('waiting', 'active')
    )
  );

CREATE POLICY "Usuários podem se inscrever em jogos" ON live_participants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM live_games 
      WHERE live_games.id = live_participants.game_id 
      AND live_games.status = 'waiting'
    )
  );

CREATE POLICY "Usuários podem atualizar própria participação" ON live_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar participantes" ON live_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Função para atualizar contador de participantes
CREATE OR REPLACE FUNCTION update_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE live_games 
    SET current_participants = current_participants + 1
    WHERE id = NEW.game_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE live_games 
    SET current_participants = current_participants - 1
    WHERE id = OLD.game_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador automaticamente
CREATE TRIGGER trigger_update_participants_count
  AFTER INSERT OR DELETE ON live_participants
  FOR EACH ROW EXECUTE FUNCTION update_participants_count();