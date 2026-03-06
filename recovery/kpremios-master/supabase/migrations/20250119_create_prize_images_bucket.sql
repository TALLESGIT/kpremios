/*
  # Criar bucket para imagens de prêmios

  1. Storage
    - Criar bucket 'prize-images' para armazenar imagens de prêmios
    - Configurar políticas de acesso público para leitura
    - Permitir upload apenas para usuários autenticados

  2. Segurança
    - Políticas RLS para o bucket
    - Acesso público para leitura (para exibir imagens)
    - Upload restrito a usuários autenticados
*/

-- Criar bucket para imagens de prêmios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prize-images',
  'prize-images',
  true,
  5242880, -- 5MB em bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública das imagens
CREATE POLICY "Public read access for prize images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'prize-images');

-- Política para permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload prize images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'prize-images');

-- Política para permitir atualização apenas para usuários autenticados
CREATE POLICY "Authenticated users can update prize images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'prize-images');

-- Política para permitir exclusão apenas para usuários autenticados
CREATE POLICY "Authenticated users can delete prize images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'prize-images');
