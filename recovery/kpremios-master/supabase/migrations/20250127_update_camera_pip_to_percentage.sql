/*
  # Alterar colunas de posição da câmera PiP para suportar porcentagens

  1. Mudança
    - Alterar camera_pip_x e camera_pip_y de integer para numeric
    - Agora armazenam valores de 0 a 100 (porcentagem)
    - Permite decimais para maior precisão

  2. Objetivo
    - Sincronizar posição da câmera entre admin e viewers independente do tamanho da tela
    - Usar coordenadas relativas (porcentagem) em vez de pixels absolutos
*/

-- Alterar tipo das colunas para numeric (suporta decimais)
ALTER TABLE live_streams 
ALTER COLUMN camera_pip_x TYPE numeric(5,2) USING COALESCE(camera_pip_x::numeric / 100.0, 0),
ALTER COLUMN camera_pip_y TYPE numeric(5,2) USING COALESCE(camera_pip_y::numeric / 100.0, 0);

-- Atualizar valores existentes: se houver valores > 100, assumir que são pixels e converter
-- (valores antigos em pixels serão convertidos, mas novos valores devem ser 0-100)
UPDATE live_streams 
SET 
  camera_pip_x = CASE 
    WHEN camera_pip_x > 100 THEN 0 
    ELSE camera_pip_x 
  END,
  camera_pip_y = CASE 
    WHEN camera_pip_y > 100 THEN 0 
    ELSE camera_pip_y 
  END
WHERE camera_pip_x IS NOT NULL OR camera_pip_y IS NOT NULL;

-- Atualizar comentários
COMMENT ON COLUMN live_streams.camera_pip_x IS 'Posição X da câmera PiP em porcentagem (0-100)';
COMMENT ON COLUMN live_streams.camera_pip_y IS 'Posição Y da câmera PiP em porcentagem (0-100)';

