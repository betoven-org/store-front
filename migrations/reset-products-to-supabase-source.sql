-- =============================================================================
-- Migration: Resetar produtos para respeitar Supabase como fonte de verdade
-- Rodar no Neon (banco do CMS)
-- =============================================================================

-- 1. Ver estado atual dos produtos
SELECT product_status, COUNT(*) FROM products WHERE tenant_id = 1 GROUP BY product_status;

-- 2. Resetar TODOS produtos pra draft
-- O webhook do Supabase vai promover os corretos pra published
UPDATE products SET product_status = 'draft' WHERE tenant_id = 1;

-- 3. Verificar
SELECT product_status, COUNT(*) FROM products WHERE tenant_id = 1 GROUP BY product_status;

-- =============================================================================
-- IMPORTANTE: Depois de rodar isso, force um sync completo:
--
-- Opcao A: No Supabase, faca um UPDATE trivial em cada produto published
--   UPDATE products SET updated_at = NOW() WHERE status = 'published';
--   (isso dispara os webhooks que sincronizam pro Neon)
--
-- Opcao B: Chame o endpoint de sync manual do CMS:
--   POST https://cms.brasa.tech/api/cron/supabase-sync
--   Header: x-cron-secret: <CRON_SECRET>
--
-- Opcao C: Se souber quais devem ser published, rode direto:
--   UPDATE products SET product_status = 'published'
--   WHERE tenant_id = 1 AND slug IN ('slug-1', 'slug-2', ...);
-- =============================================================================
