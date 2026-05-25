-- =============================================================================
-- Supabase do cliente: criar tabela product_categories
-- Rodar no SQL Editor do Supabase (https://supabase.com/dashboard)
-- =============================================================================

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inserir categorias (mesmas do blog)
INSERT INTO product_categories (name, slug, description, sort_order) VALUES
  ('Saude',           'saude',           'Produtos para saude e bem-estar',               1),
  ('Geral',           'geral',           'Produtos gerais',                                2),
  ('Fit',             'fit',             'Suplementos e produtos fitness',                 3),
  ('Emagrecedor',     'emagrecedor',     'Produtos para emagrecimento e controle de peso', 4),
  ('Ativos',          'ativos',          'Ativos farmaceuticos e formulacoes',             5),
  ('Nutricosmetico',  'nutricosmetico',  'Nutricosmeticos e suplementos de beleza',        6),
  ('Dermocosmeticos', 'dermocosmeticos', 'Produtos dermatologicos e cosmeticos',           7)
ON CONFLICT (slug) DO NOTHING;

-- 3. Habilitar RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- 4. Politica de leitura publica
CREATE POLICY "Leitura publica" ON product_categories
  FOR SELECT USING (true);

-- 5. Politica de escrita para service_role
CREATE POLICY "Escrita service_role" ON product_categories
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Webhook para sync com CMS (Neon)
-- Vai em Database > Webhooks > Create new webhook:
--   Nome: sync-product-categories
--   Tabela: product_categories
--   Eventos: INSERT, UPDATE, DELETE
--   URL: https://cms.brasa.tech/api/webhooks/supabase-sync
--   Headers: x-supabase-webhook-secret = (mesmo valor do SUPABASE_WEBHOOK_SECRET no CMS)

-- 7. Verificar
SELECT id, name, slug, sort_order FROM product_categories ORDER BY sort_order;
