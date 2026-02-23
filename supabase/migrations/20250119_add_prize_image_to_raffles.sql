/*
  # Adicionar coluna prize_image à tabela raffles

  1. Alterações
    - Adiciona coluna `prize_image` (text) à tabela raffles
    - Permite armazenar URL da imagem do prêmio
    - Valor padrão é NULL (opcional)

  2. Segurança
    - Mantém as políticas RLS existentes
    - Coluna é opcional para compatibilidade
*/

-- Adicionar coluna prize_image à tabela raffles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'raffles' AND column_name = 'prize_image'
  ) THEN
    ALTER TABLE raffles ADD COLUMN prize_image text;
  END IF;
END $$;
