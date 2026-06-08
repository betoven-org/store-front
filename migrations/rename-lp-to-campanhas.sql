-- Migration: rename LP slugs to campanhas/*
-- Altera slugs das 3 landing pages de lp-* para campanhas/* (nested slug)

UPDATE pages SET slug = 'campanhas/morosil' WHERE slug = 'lp-morosil';
UPDATE pages SET slug = 'campanhas/maca-peruana' WHERE slug = 'lp-maca-peruana';
UPDATE pages SET slug = 'campanhas/peptistrong' WHERE slug = 'lp-peptistrong';
