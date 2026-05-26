import { sql, SQL } from "drizzle-orm";

/**
 * Constroi uma tsquery a partir do input do usuário.
 * - Divide por espacos, aplica unaccent e stemming portugues
 * - Usa & (AND) entre os termos e :* (prefix match) no ultimo termo
 * - Fallback para similarity (pg_trgm) se FTS nao encontrar nada
 */
export function buildTsQuery(query: string): SQL {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/[^\w\u00C0-\u024F]/g, ""));

  if (terms.length === 0) {
    return sql`to_tsquery('portuguese_unaccent', '')`;
  }

  // Ultimo termo com prefix match (:*), anteriores exatos
  const parts = terms.map((t, i) =>
    i === terms.length - 1 ? `${t}:*` : t
  );

  const queryStr = parts.join(" & ");
  return sql`to_tsquery('portuguese_unaccent', unaccent(${queryStr}))`;
}

/**
 * SQL fragment para ordenar por relevancia (ts_rank_cd).
 */
export function searchRank(vectorColumn: SQL, query: string): SQL {
  return sql`ts_rank_cd(${vectorColumn}, ${buildTsQuery(query)})`;
}

/**
 * SQL fragment para filtrar por FTS (@@) OU similarity (pg_trgm fallback).
 * Garante que mesmo com typos o resultado aparece.
 */
export function searchWhere(vectorColumn: SQL, textColumn: SQL, query: string): SQL {
  const tsq = buildTsQuery(query);
  return sql`(${vectorColumn} @@ ${tsq} OR similarity(${textColumn}, ${query}) > 0.15)`;
}

/**
 * SQL fragment para highlight de resultados.
 */
export function searchHeadline(textColumn: SQL, query: string): SQL {
  const tsq = buildTsQuery(query);
  return sql`ts_headline('portuguese_unaccent', ${textColumn}, ${tsq}, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=30')`;
}
