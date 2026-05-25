-- =============================================================================
-- Migration: Criar tabela product_categories e popular com categorias do blog
-- Rodar no Supabase SQL Editor do cliente
-- =============================================================================

-- 1. Criar tabela (se não existir)
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1 REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  parent_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
  image_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Criar indices
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON product_categories(slug);

-- 3. Inserir categorias (mesmas do blog)
-- Baseado nas categorias de post do tenant medicinal (id=1)
INSERT INTO product_categories (tenant_id, name, slug, description, sort_order) VALUES
  (1, 'Saude',           'saude',           'Produtos para saude e bem-estar',                    1),
  (1, 'Geral',           'geral',           'Produtos gerais',                                     2),
  (1, 'Fit',             'fit',             'Suplementos e produtos fitness',                      3),
  (1, 'Emagrecedor',     'emagrecedor',     'Produtos para emagrecimento e controle de peso',      4),
  (1, 'Ativos',          'ativos',          'Ativos farmaceuticos e formulacoes',                  5),
  (1, 'Nutricosmetico',  'nutricosmetico',  'Nutricosmeticos e suplementos de beleza',             6),
  (1, 'Dermocosmeticos', 'dermocosmeticos', 'Produtos dermatologicos e cosmeticos',                7)
ON CONFLICT (slug) DO NOTHING;

-- 4. Verificar resultado
SELECT id, name, slug, sort_order FROM product_categories WHERE tenant_id = 1 ORDER BY sort_order;
