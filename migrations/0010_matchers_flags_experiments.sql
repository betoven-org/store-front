-- Sprint 3: Matchers, Feature Flags, Experiments
-- 2026-06-14

-- Enums
DO $$ BEGIN
  CREATE TYPE matcher_type AS ENUM ('device','random','date','cron','pathname','cookie','queryString','host','userAgent','location','multi','negate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE flag_type AS ENUM ('boolean','multivariate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE experiment_status AS ENUM ('draft','running','paused','completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE experiment_type AS ENUM ('page','section','image','message');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Matchers
CREATE TABLE IF NOT EXISTS matchers (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type matcher_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matchers_tenant ON matchers(tenant_id);

-- Feature Flags
CREATE TABLE IF NOT EXISTS flags (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(100) NOT NULL,
  type flag_type NOT NULL DEFAULT 'boolean',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_flags_tenant ON flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_flags_key ON flags(tenant_id, key);

-- Flag Variants
CREATE TABLE IF NOT EXISTS flag_variants (
  id SERIAL PRIMARY KEY,
  flag_id INT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  value JSONB NOT NULL,
  matcher_id INT REFERENCES matchers(id) ON DELETE SET NULL,
  weight INT NOT NULL DEFAULT 100,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flag_variants_flag ON flag_variants(flag_id);

-- Experiments
CREATE TABLE IF NOT EXISTS experiments (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type experiment_type NOT NULL,
  flag_id INT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  status experiment_status NOT NULL DEFAULT 'draft',
  goal VARCHAR(50),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experiments_tenant ON experiments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(tenant_id, status);

-- Experiment Results (daily aggregation per variant)
CREATE TABLE IF NOT EXISTS experiment_results (
  id SERIAL PRIMARY KEY,
  experiment_id INT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id INT NOT NULL REFERENCES flag_variants(id) ON DELETE CASCADE,
  impressions INT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL,
  UNIQUE(experiment_id, variant_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_experiment_results_exp ON experiment_results(experiment_id);
