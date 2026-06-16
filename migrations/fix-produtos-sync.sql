-- =============================================================================
-- Migration: Fix produtos collection syncConfig for Supabase sync
-- Tenant: id=1 (medicinal)
-- Run with: psql $DATABASE_URL -f migrations/fix-produtos-sync.sql
--
-- This script:
--   1. Creates "produtos" collection if missing (source=synced)
--   2. Updates syncConfig with complete fieldMap (Supabase cols -> CMS fields)
--   3. Adds missing collection_fields (who_can_use, etc.)
--   4. Uses matchColumn=id (UUID) instead of slug for reliability
--
-- IDEMPOTENT: safe to run multiple times.
-- =============================================================================

BEGIN;

-- ── 1. Upsert collection ────────────────────────────────────────────────────

DO $$
DECLARE
  v_col_id int;
  v_sync_config jsonb := '{
    "supabaseTable": "products",
    "matchColumn": "id",
    "fieldMap": {
      "title": "name",
      "slug": "slug",
      "excerpt": "description",
      "content": "content",
      "cover_image_url": "image",
      "composition": "composition",
      "usage_instructions": "usage_instructions",
      "who_can_use": "who_can_use",
      "benefits": "benefits",
      "differentials": "differentials",
      "faq": "faq",
      "category_id": "category",
      "brand": "brand",
      "is_kit": "is_kit",
      "meta_title": "seo_title",
      "meta_description": "seo_description"
    }
  }'::jsonb;
BEGIN
  SELECT id INTO v_col_id
  FROM collections
  WHERE tenant_id = 1 AND slug = 'produtos'
  LIMIT 1;

  IF v_col_id IS NULL THEN
    INSERT INTO collections (tenant_id, name, slug, icon, source, sync_config, created_at, updated_at)
    VALUES (1, 'Produtos', 'produtos', '📦', 'synced', v_sync_config, NOW(), NOW())
    RETURNING id INTO v_col_id;
    RAISE NOTICE 'Created produtos collection id=%', v_col_id;
  ELSE
    UPDATE collections
    SET source = 'synced',
        sync_config = v_sync_config,
        updated_at = NOW()
    WHERE id = v_col_id;
    RAISE NOTICE 'Updated produtos collection id=%', v_col_id;
  END IF;
END $$;


-- ── 2. Ensure all fields exist (skip already existing) ──────────────────────

WITH prod_col AS (
  SELECT id FROM collections WHERE tenant_id = 1 AND slug = 'produtos' LIMIT 1
),
desired_fields (slug, name, type, required, sort_order, config) AS (
  VALUES
    ('name',               'Nome',                'text'::collection_field_type,      true,  0,  NULL::jsonb),
    ('slug',               'Slug',                'text'::collection_field_type,      true,  1,  NULL),
    ('description',        'Descricao',           'long_text'::collection_field_type, false, 2,  NULL),
    ('content',            'Conteudo',            'json'::collection_field_type,      false, 3,  NULL),
    ('composition',        'Composicao',          'long_text'::collection_field_type, false, 4,  NULL),
    ('usage_instructions', 'Modo de Uso',         'long_text'::collection_field_type, false, 5,  NULL),
    ('who_can_use',        'Indicacao',           'long_text'::collection_field_type, false, 6,  NULL),
    ('benefits',           'Beneficios',          'json'::collection_field_type,      false, 7,  NULL),
    ('differentials',      'Diferenciais',        'json'::collection_field_type,      false, 8,  NULL),
    ('faq',                'FAQ',                 'json'::collection_field_type,      false, 9,  NULL),
    ('category',           'Categoria',           'reference'::collection_field_type, false, 10, '{"collectionSlug":"categorias"}'::jsonb),
    ('image',              'Imagem',              'image'::collection_field_type,     false, 11, NULL),
    ('gallery_images',     'Galeria',             'json'::collection_field_type,      false, 12, NULL),
    ('seo_title',          'SEO Title',           'text'::collection_field_type,      false, 13, NULL),
    ('seo_description',    'SEO Description',     'long_text'::collection_field_type, false, 14, NULL),
    ('brand',              'Marca',               'text'::collection_field_type,      false, 15, NULL),
    ('is_kit',             'Kit',                 'boolean'::collection_field_type,   false, 16, NULL),
    ('show_on_site',       'Mostrar no Site',     'boolean'::collection_field_type,   false, 17, NULL),
    ('status',             'Status',              'select'::collection_field_type,    false, 18, '{"options":[{"value":"draft","label":"Rascunho"},{"value":"published","label":"Publicado"}]}'::jsonb),
    ('featured',           'Destaque',            'boolean'::collection_field_type,   false, 19, NULL),
    ('published_at',       'Data Publicacao',     'date'::collection_field_type,      false, 20, NULL)
),
existing_fields AS (
  SELECT cf.slug
  FROM collection_fields cf
  JOIN prod_col pc ON cf.collection_id = pc.id
)
INSERT INTO collection_fields (collection_id, slug, name, type, required, sort_order, config, created_at)
SELECT
  pc.id,
  df.slug,
  df.name,
  df.type,
  df.required,
  df.sort_order,
  df.config,
  NOW()
FROM desired_fields df
CROSS JOIN prod_col pc
WHERE df.slug NOT IN (SELECT slug FROM existing_fields);


-- ── 3. Summary ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  col_id int;
  field_count int;
  item_count int;
  sc jsonb;
BEGIN
  SELECT id, sync_config INTO col_id, sc FROM collections WHERE tenant_id = 1 AND slug = 'produtos';
  SELECT count(*) INTO field_count FROM collection_fields WHERE collection_id = col_id;
  SELECT count(*) INTO item_count FROM collection_items WHERE collection_id = col_id AND deleted_at IS NULL;
  RAISE NOTICE '=== produtos collection ===';
  RAISE NOTICE '  id=%, fields=%, items=%', col_id, field_count, item_count;
  RAISE NOTICE '  supabaseTable=%', sc->>'supabaseTable';
  RAISE NOTICE '  matchColumn=%', sc->>'matchColumn';
  RAISE NOTICE '  fieldMap keys=%', (SELECT count(*) FROM jsonb_object_keys(sc->'fieldMap'));
END $$;

COMMIT;
