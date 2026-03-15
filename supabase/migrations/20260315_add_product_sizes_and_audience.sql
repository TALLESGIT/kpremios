-- Adiciona campos de tamanhos e público-alvo aos produtos
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS available_sizes text[],
ADD COLUMN IF NOT EXISTS target_audience text DEFAULT 'unissex';

-- Adiciona comentário para documentação
COMMENT ON COLUMN products.available_sizes IS 'Lista de tamanhos disponíveis para o produto (ex: P, M, G)';
COMMENT ON COLUMN products.target_audience IS 'Público-alvo do produto (masculino, feminino, kids, unissex)';
