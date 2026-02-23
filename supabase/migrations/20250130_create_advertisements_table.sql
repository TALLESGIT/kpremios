-- Criar tabela para gerenciar banners/anúncios publicitários
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  position TEXT NOT NULL DEFAULT 'homepage', -- homepage, sidebar, etc
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Índices para performance
CREATE INDEX idx_advertisements_position ON advertisements(position);
CREATE INDEX idx_advertisements_active ON advertisements(is_active);
CREATE INDEX idx_advertisements_dates ON advertisements(start_date, end_date);

-- RLS Policies
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Admins podem fazer tudo
CREATE POLICY "Admins can manage advertisements"
  ON advertisements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Todos podem ler banners ativos
CREATE POLICY "Everyone can view active advertisements"
  ON advertisements
  FOR SELECT
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
  );

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_advertisements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_advertisements_updated_at
  BEFORE UPDATE ON advertisements
  FOR EACH ROW
  EXECUTE FUNCTION update_advertisements_updated_at();

-- Função para incrementar click_count
CREATE OR REPLACE FUNCTION increment_advertisement_clicks(ad_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE advertisements
  SET click_count = click_count + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

