ALTER TABLE pages ADD COLUMN IF NOT EXISTS status post_status NOT NULL DEFAULT 'published';
