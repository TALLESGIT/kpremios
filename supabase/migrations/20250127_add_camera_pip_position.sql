/*
  # Adicionar colunas para posição da câmera PiP na tabela live_streams

  1. Novas Colunas
    - camera_pip_x (integer) - Posição X da câmera PiP
    - camera_pip_y (integer) - Posição Y da câmera PiP

  2. Objetivo
    - Sincronizar a posição da câmera PiP entre admin e viewers em tempo real
*/

-- Adicionar colunas para posição da câmera PiP
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS camera_pip_x integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS camera_pip_y integer DEFAULT 20;

-- Comentários para documentação
COMMENT ON COLUMN live_streams.camera_pip_x IS 'Posição X da câmera PiP (em pixels)';
COMMENT ON COLUMN live_streams.camera_pip_y IS 'Posição Y da câmera PiP (em pixels)';

