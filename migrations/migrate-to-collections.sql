-- =============================================================================
-- Migration: Legacy tables -> Collections system
-- Tenant: id=1 (medicinal)
-- Run with: psql $DATABASE_URL -f migrations/migrate-to-collections.sql
--
-- This script:
--   1. Creates 6 collections (categorias, autores, posts, categorias-produto, produtos, inscritos)
--   2. Creates collection_fields for each
--   3. Copies data from legacy tables into collection_items
--
-- IMPORTANT: Run this only once. It is NOT idempotent by default.
-- If you need to re-run, delete the created collections first:
--   DELETE FROM collections WHERE tenant_id = 1;
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CATEGORIAS (slug: categorias)
-- ─────────────────────────────────────────────────────────────────────────────

WITH new_collection AS (
  INSERT INTO collections (tenant_id, name, slug, icon, source, sync_config, created_at, updated_at)
  VALUES (
    1,
    'Categorias',
    'categorias',
    '📂',
    'synced',
    '{"supabaseTable": "categories", "matchColumn": "id", "fieldMap": {"name": "name", "slug": "slug", "description": "description"}}'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
),
fields_insert AS (
  INSERT INTO collection_fields (collection_id, slug, name, type, required, sort_order, config, created_at)
  SELECT
    nc.id,
    f.slug,
    f.name,
    f.type::collection_field_type,
    f.required,
    f.sort_order,
    f.config::jsonb,
    NOW()
  FROM new_collection nc,
  (VALUES
    ('name',        'Nome',       'text',      true,  0, NULL),
    ('slug',        'Slug',       'text',      true,  1, NULL),
    ('description', 'Descricao',  'long_text', false, 2, NULL)
  ) AS f(slug, name, type, required, sort_order, config)
)
INSERT INTO collection_items (tenant_id, collection_id, slug, data, status, featured, external_id, published_at, created_at, updated_at)
SELECT
  c.tenant_id,
  nc.id,
  c.slug,
  jsonb_build_object(
    'name', c.name,
    'slug', c.slug,
    'description', c.description
  ),
  'published',
  false,
  c.supabase_id::text,
  c.created_at,
  c.created_at,
  c.updated_at
FROM categories c, new_collection nc
WHERE c.tenant_id = 1;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AUTORES (slug: autores)
-- ─────────────────────────────────────────────────────────────────────────────

WITH new_collection AS (
  INSERT INTO collections (tenant_id, name, slug, icon, source, sync_config, created_at, updated_at)
  VALUES (
    1,
    'Autores',
    'autores',
    '✍️',
    'synced',
    NULL,
    NOW(),
    NOW()
  )
  RETURNING id
),
fields_insert AS (
  INSERT INTO collection_fields (collection_id, slug, name, type, required, sort_order, config, created_at)
  SELECT
    nc.id,
    f.slug,
    f.name,
    f.type::collection_field_type,
    f.required,
    f.sort_order,
    f.config::jsonb,
    NOW()
  FROM new_collection nc,
  (VALUES
    ('name',   'Nome',   'text',      true,  0, NULL),
    ('slug',   'Slug',   'text',      true,  1, NULL),
    ('bio',    'Bio',    'long_text', false, 2, NULL),
    ('avatar', 'Avatar', 'image',     false, 3, NULL)
  ) AS f(slug, name, type, required, sort_order, config)
)
INSERT INTO collection_items (tenant_id, collection_id, slug, data, status, featured, external_id, published_at, created_at, updated_at)
SELECT
  a.tenant_id,
  nc.id,
  a.slug,
  jsonb_build_object(
    'name', a.name,
    'slug', a.slug,
    'bio', a.bio,
    'avatar', m.url
  ),
  'published',
  false,
  a.supabase_id::text,
  a.created_at,
  a.created_at,
  a.updated_at
FROM authors a
CROSS JOIN new_collection nc
LEFT JOIN media m ON m.id = a.avatar_id
WHERE a.tenant_id = 1;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. POSTS (slug: posts)
-- ─────────────────────────────────────────────────────────────────────────────

WITH new_collection AS (
  INSERT INTO collections (tenant_id, name, slug, icon, source, sync_config, created_at, updated_at)
  VALUES (
    1,
    'Posts',
    'posts',
    '📝',
    'synced',
    '{"supabaseTable": "articles", "matchColumn": "id", "fieldMap": {"title": "title", "slug": "slug", "excerpt": "excerpt", "content": "content", "hero_image": "hero_image_url"}}'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
),
-- We need the categorias collection ID to set reference config
cat_collection AS (
  SELECT id FROM collections WHERE tenant_id = 1 AND slug = 'categorias' LIMIT 1
),
author_collection AS (
  SELECT id FROM collections WHERE tenant_id = 1 AND slug = 'autores' LIMIT 1
),
fields_insert AS (
  INSERT INTO collection_fields (collection_id, slug, name, type, required, sort_order, config, created_at)
  SELECT
    nc.id,
    f.slug,
    f.name,
    f.type::collection_field_type,
    f.required,
    f.sort_order,
    f.config::jsonb,
    NOW()
  FROM new_collection nc,
       cat_collection cc,
       author_collection ac,
  (VALUES
    ('title',            'Titulo',          'text',      true,  0,  NULL),
    ('slug',             'Slug',            'text',      true,  1,  NULL),
    ('excerpt',          'Resumo',          'long_text', false, 2,  NULL),
    ('content',          'Conteudo',        'json',      false, 3,  NULL),
    ('category',         'Categoria',       'reference', false, 4,  '{"collectionSlug":"categorias"}'),
    ('author',           'Autor',           'reference', false, 5,  '{"collectionSlug":"autores"}'),
    ('hero_image',       'Imagem de Capa',  'image',     false, 6,  NULL),
    ('cover_url',        'URL da Capa',     'url',       false, 7,  NULL),
    ('meta_title',       'Meta Title',      'text',      false, 8,  NULL),
    ('meta_description', 'Meta Description','long_text', false, 9,  NULL),
    ('status',           'Status',          'select',    false, 10, '{"options":[{"value":"draft","label":"Rascunho"},{"value":"published","label":"Publicado"}]}'),
    ('featured',         'Destaque',        'boolean',   false, 11, NULL),
    ('published_at',     'Data Publicacao', 'date',      false, 12, NULL)
  ) AS f(slug, name, type, required, sort_order, config)
),
-- Map legacy category IDs to collection_items IDs (match by slug — always present)
cat_map AS (
  SELECT
    ci.id AS collection_item_id,
    c.id  AS legacy_id
  FROM collection_items ci
  JOIN cat_collection cc ON ci.collection_id = cc.id
  JOIN categories c ON c.slug = ci.slug AND c.tenant_id = 1
  WHERE ci.tenant_id = 1
),
-- Map legacy author IDs to collection_items IDs (match by slug — always present)
author_map AS (
  SELECT
    ci.id AS collection_item_id,
    a.id  AS legacy_id
  FROM collection_items ci
  JOIN author_collection ac ON ci.collection_id = ac.id
  JOIN authors a ON a.slug = ci.slug AND a.tenant_id = 1
  WHERE ci.tenant_id = 1
)
INSERT INTO collection_items (tenant_id, collection_id, slug, data, status, featured, external_id, published_at, created_at, updated_at)
SELECT
  p.tenant_id,
  nc.id,
  p.slug,
  jsonb_build_object(
    'title', p.title,
    'slug', p.slug,
    'excerpt', p.excerpt,
    'content', p.content,
    'category', cm.collection_item_id,
    'author', am.collection_item_id,
    'hero_image', hm.url,
    'cover_url', p.cover_url,
    'meta_title', p.meta_title,
    'meta_description', p.meta_description,
    'status', p.status,
    'featured', p.featured,
    'published_at', p.published_at
  ),
  p.status::text::post_status,
  p.featured,
  p.supabase_id::text,
  p.published_at,
  p.created_at,
  p.updated_at
FROM posts p
CROSS JOIN new_collection nc
LEFT JOIN cat_map cm ON cm.legacy_id = p.category_id
LEFT JOIN author_map am ON am.legacy_id = p.author_id
LEFT JOIN media hm ON hm.id = p.hero_image_id
WHERE p.tenant_id = 1;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CATEGORIAS DE PRODUTO (slug: categorias-produto)
-- ─────────────────────────────────────────────────────────────────────────────

WITH new_collection AS (
  INSERT INTO collections (tenant_id, name, slug, icon, source, sync_config, created_at, updated_at)
  VALUES (
    1,
    'Categorias de Produto',
    'categorias-produto',
    '🏷️',
    'local',
    NULL,
    NOW(),
    NOW()
  )
  RETURNING id
),
fields_insert AS (
  INSERT INTO collection_fields (collection_id, slug, name, type, required, sort_order, config, created_at)
  SELECT
    nc.id,
    f.slug,
    f.name,
    f.type::collection_field_type,
    f.required,
    f.sort_order,
    f.config::jsonb,
    NOW()
  FROM new_collection nc,
  (VALUES
    ('name',        'Nome',       'text',      true,  0, NULL),
    ('slug',        'Slug',       'text',      true,  1, NULL),
    ('description', 'Descricao',  'long_text', false, 2, NULL),
    ('image',       'Imagem',     'image',     false, 3, NULL),
    ('sort_order',  'Ordenacao',  'number',    false, 4, NULL)
  ) AS f(slug, name, type, required, sort_order, config)
)
INSERT INTO collection_items (tenant_id, collection_id, slug, data, status, featured, external_id, published_at, created_at, updated_at)
SELECT
  pc.tenant_id,
  nc.id,
  pc.slug,
  jsonb_build_object(
    'name', pc.name,
    'slug', pc.slug,
    'description', pc.description,
    'image', m.url,
    'sort_order', pc.sort_order
  ),
  'published',
  false,
  pc.id::text,
  pc.created_at,
  pc.created_at,
  pc.updated_at
FROM product_categories pc
CROSS JOIN new_collection nc
LEFT JOIN media m ON m.id = pc.image_id
WHERE pc.tenant_id = 1;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PRODUTOS (slug: produtos)
-- ─────────────────────────────────────────────────────────────────────────────

WITH new_collection AS (
  INSERT INTO collections (tenant_id, name, slug, icon, source, sync_config, created_at, updated_at)
  VALUES (
    1,
    'Produtos',
    'produtos',
    '📦',
    'synced',
    '{"supabaseTable": "products", "matchColumn": "slug", "fieldMap": {"name": "name", "slug": "slug", "description": "description"}}'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
),
-- Get categorias-produto collection for reference config
prodcat_collection AS (
  SELECT id FROM collections WHERE tenant_id = 1 AND slug = 'categorias-produto' LIMIT 1
),
fields_insert AS (
  INSERT INTO collection_fields (collection_id, slug, name, type, required, sort_order, config, created_at)
  SELECT
    nc.id,
    f.slug,
    f.name,
    f.type::collection_field_type,
    f.required,
    f.sort_order,
    f.config::jsonb,
    NOW()
  FROM new_collection nc,
       prodcat_collection pcc,
  (VALUES
    ('name',               'Nome',                'text',      true,  0,  NULL),
    ('slug',               'Slug',                'text',      true,  1,  NULL),
    ('description',        'Descricao',           'long_text', false, 2,  NULL),
    ('content',            'Conteudo',            'json',      false, 3,  NULL),
    ('composition',        'Composicao',          'long_text', false, 4,  NULL),
    ('usage_instructions', 'Modo de Uso',         'long_text', false, 5,  NULL),
    ('benefits',           'Beneficios',          'json',      false, 6,  NULL),
    ('differentials',      'Diferenciais',        'json',      false, 7,  NULL),
    ('faq',                'FAQ',                 'json',      false, 8,  NULL),
    ('category',           'Categoria',           'reference', false, 9,  '{"collectionSlug":"categorias-produto"}'),
    ('image',              'Imagem',              'image',     false, 10, NULL),
    ('gallery_images',     'Galeria',             'json',      false, 11, NULL),
    ('seo_title',          'SEO Title',           'text',      false, 12, NULL),
    ('seo_description',    'SEO Description',     'long_text', false, 13, NULL),
    ('brand',              'Marca',               'text',      false, 14, NULL),
    ('is_kit',             'Kit',                 'boolean',   false, 15, NULL),
    ('show_on_site',       'Mostrar no Site',     'boolean',   false, 16, NULL),
    ('status',             'Status',              'select',    false, 17, '{"options":[{"value":"draft","label":"Rascunho"},{"value":"published","label":"Publicado"}]}'),
    ('featured',           'Destaque',            'boolean',   false, 18, NULL),
    ('published_at',       'Data Publicacao',     'date',      false, 19, NULL)
  ) AS f(slug, name, type, required, sort_order, config)
),
-- Map legacy product_category IDs -> collection_items IDs (match by slug)
prodcat_map AS (
  SELECT
    ci.id AS collection_item_id,
    pc.id AS legacy_id
  FROM collection_items ci
  JOIN prodcat_collection pcc ON ci.collection_id = pcc.id
  JOIN product_categories pc ON pc.slug = ci.slug AND pc.tenant_id = 1
  WHERE ci.tenant_id = 1
),
-- Resolve gallery_images (array of media IDs) to array of URLs
gallery_resolved AS (
  SELECT
    pr.id AS product_id,
    jsonb_agg(gm.url ORDER BY gi.ord) AS gallery_urls
  FROM products pr,
       jsonb_array_elements(pr.gallery_images) WITH ORDINALITY AS gi(val, ord)
  JOIN media gm ON gm.id = (gi.val)::int
  WHERE pr.tenant_id = 1
    AND pr.gallery_images IS NOT NULL
    AND jsonb_typeof(pr.gallery_images) = 'array'
    AND jsonb_array_length(pr.gallery_images) > 0
  GROUP BY pr.id
)
INSERT INTO collection_items (tenant_id, collection_id, slug, data, status, featured, external_id, published_at, created_at, updated_at)
SELECT
  pr.tenant_id,
  nc.id,
  pr.slug,
  jsonb_build_object(
    'name', pr.name,
    'slug', pr.slug,
    'description', pr.description,
    'content', pr.content,
    'composition', pr.composition,
    'usage_instructions', pr.usage_instructions,
    'benefits', pr.benefits,
    'differentials', pr.differentials,
    'faq', pr.faq,
    'category', pcm.collection_item_id,
    'image', im.url,
    'gallery_images', COALESCE(gr.gallery_urls, '[]'::jsonb),
    'seo_title', pr.seo_title,
    'seo_description', pr.seo_description,
    'brand', pr.brand,
    'is_kit', pr.is_kit,
    'show_on_site', pr.show_on_site,
    'status', pr.product_status,
    'featured', pr.featured,
    'published_at', pr.published_at
  ),
  pr.product_status::text::post_status,
  pr.featured,
  pr.slug,  -- products match by slug, not supabase_id
  pr.published_at,
  pr.created_at,
  pr.updated_at
FROM products pr
CROSS JOIN new_collection nc
LEFT JOIN prodcat_map pcm ON pcm.legacy_id = pr.product_category_id
LEFT JOIN media im ON im.id = pr.image_id
LEFT JOIN gallery_resolved gr ON gr.product_id = pr.id
WHERE pr.tenant_id = 1;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. INSCRITOS (slug: inscritos)
-- ─────────────────────────────────────────────────────────────────────────────

WITH new_collection AS (
  INSERT INTO collections (tenant_id, name, slug, icon, source, sync_config, created_at, updated_at)
  VALUES (
    1,
    'Inscritos',
    'inscritos',
    '📧',
    'synced',
    '{"supabaseTable": "newsletter_subscribers", "matchColumn": "email", "fieldMap": {"name": "name", "email": "email", "active": "active"}}'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id
),
fields_insert AS (
  INSERT INTO collection_fields (collection_id, slug, name, type, required, sort_order, config, created_at)
  SELECT
    nc.id,
    f.slug,
    f.name,
    f.type::collection_field_type,
    f.required,
    f.sort_order,
    f.config::jsonb,
    NOW()
  FROM new_collection nc,
  (VALUES
    ('name',   'Nome',   'text',    false, 0, NULL),
    ('email',  'Email',  'text',    true,  1, NULL),
    ('active', 'Ativo',  'boolean', false, 2, NULL)
  ) AS f(slug, name, type, required, sort_order, config)
)
INSERT INTO collection_items (tenant_id, collection_id, slug, data, status, featured, external_id, published_at, created_at, updated_at)
SELECT
  s.tenant_id,
  nc.id,
  -- Use email as slug (sanitized)
  LOWER(REPLACE(REPLACE(s.email, '@', '-at-'), '.', '-')),
  jsonb_build_object(
    'name', s.name,
    'email', s.email,
    'active', s.active
  ),
  'published',
  false,
  s.email,  -- matchColumn is email
  s.created_at,
  s.created_at,
  s.created_at  -- subscribers have no updated_at
FROM subscribers s
CROSS JOIN new_collection nc
WHERE s.tenant_id = 1;


-- ─────────────────────────────────────────────────────────────────────────────
-- Summary
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Migration complete ===';
  FOR r IN
    SELECT
      c.name,
      c.slug,
      c.source,
      (SELECT count(*) FROM collection_fields cf WHERE cf.collection_id = c.id) AS fields,
      (SELECT count(*) FROM collection_items ci WHERE ci.collection_id = c.id AND ci.deleted_at IS NULL) AS items
    FROM collections c
    WHERE c.tenant_id = 1
    ORDER BY c.id
  LOOP
    RAISE NOTICE '  % (%) — source: %, fields: %, items: %',
      r.name, r.slug, r.source, r.fields, r.items;
  END LOOP;
END $$;

COMMIT;
