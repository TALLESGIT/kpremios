/*
  # Função para decrementar contador de viewers
  
  Função auxiliar para decrementar o contador de viewers quando um viewer sai da transmissão
*/

-- Função para decrementar contador de viewers
CREATE OR REPLACE FUNCTION decrement_viewer_count(p_stream_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE live_streams
  SET viewer_count = GREATEST(viewer_count - 1, 0)
  WHERE id = p_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

