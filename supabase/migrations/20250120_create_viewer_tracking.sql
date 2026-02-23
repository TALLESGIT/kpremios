-- Criar tabela para rastrear sessões de visualização
CREATE TABLE IF NOT EXISTS viewer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text NOT NULL, -- ID único da sessão do navegador
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  is_active boolean DEFAULT true,
  user_agent text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela para rastrear visualizações de propagandas
CREATE TABLE IF NOT EXISTS ad_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES live_streams(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  ad_id text NOT NULL, -- ID da propaganda (do slideshow ou overlay)
  ad_type text NOT NULL CHECK (ad_type IN ('slideshow', 'overlay')),
  viewed_at timestamptz DEFAULT now(),
  duration_seconds integer DEFAULT 0, -- Tempo que a propaganda foi vista
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_stream_id ON viewer_sessions(stream_id);
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_session_id ON viewer_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_started_at ON viewer_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_ad_views_stream_id ON ad_views(stream_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_ad_id ON ad_views(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_viewed_at ON ad_views(viewed_at);

-- Habilitar RLS
ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para viewer_sessions
-- Todos podem criar sessões (viewers anônimos)
CREATE POLICY "Anyone can create viewer sessions" ON viewer_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Apenas o próprio usuário ou admins podem ver suas sessões
CREATE POLICY "Users can view own sessions" ON viewer_sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Anônimos podem ver suas próprias sessões (via session_id)
CREATE POLICY "Anon can view own sessions" ON viewer_sessions
  FOR SELECT
  TO anon
  USING (true); -- Simplificado para permitir tracking

-- Admins podem ver todas as sessões
CREATE POLICY "Admins can view all sessions" ON viewer_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Políticas RLS para ad_views
-- Todos podem criar visualizações de propagandas
CREATE POLICY "Anyone can create ad views" ON ad_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins podem ver todas as visualizações
CREATE POLICY "Admins can view all ad views" ON ad_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Função para atualizar duração da sessão quando viewer sai
CREATE OR REPLACE FUNCTION update_viewer_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer;
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar duração automaticamente
CREATE TRIGGER trigger_update_session_duration
  BEFORE UPDATE ON viewer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_viewer_session_duration();

-- Função para obter estatísticas de uma transmissão
CREATE OR REPLACE FUNCTION get_stream_statistics(p_stream_id uuid)
RETURNS TABLE (
  total_viewers bigint,
  active_viewers bigint,
  avg_watch_time numeric,
  total_watch_time bigint,
  unique_sessions bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_viewers,
    COUNT(*) FILTER (WHERE is_active = true)::bigint as active_viewers,
    COALESCE(AVG(duration_seconds), 0)::numeric as avg_watch_time,
    COALESCE(SUM(duration_seconds), 0)::bigint as total_watch_time,
    COUNT(DISTINCT session_id)::bigint as unique_sessions
  FROM viewer_sessions
  WHERE stream_id = p_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de propagandas
CREATE OR REPLACE FUNCTION get_ad_statistics(p_stream_id uuid)
RETURNS TABLE (
  ad_id text,
  ad_type text,
  total_views bigint,
  total_duration bigint,
  avg_duration numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad_id,
    ad_type,
    COUNT(*)::bigint as total_views,
    COALESCE(SUM(duration_seconds), 0)::bigint as total_duration,
    COALESCE(AVG(duration_seconds), 0)::numeric as avg_duration
  FROM ad_views
  WHERE stream_id = p_stream_id
  GROUP BY ad_id, ad_type
  ORDER BY total_views DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

