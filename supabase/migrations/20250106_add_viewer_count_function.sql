-- Função para incrementar contador de visualizações
CREATE OR REPLACE FUNCTION increment_viewer_count(stream_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE live_streams
  SET viewer_count = COALESCE(viewer_count, 0) + 1
  WHERE id = stream_id;
END;
$$ LANGUAGE plpgsql;

