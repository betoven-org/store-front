import { unstable_cache } from "next/cache";
import type { SectionBlock, BrasaManifest } from "@brasa/core/manifest";
import { loaderRegistry } from "./index";
import type { LoaderContext } from "./types";
import { CACHE_TTL_EDITORIAL } from "@/lib/cache-config";

export type ResolvedSection = SectionBlock & {
  /** Data injected by the loader (null if no loader or loader failed) */
  loaderData: unknown | null;
};

/**
 * Resolves loaders for an array of sections.
 * Executes all loaders in parallel for performance.
 * Each loader result is cached individually via unstable_cache.
 */
export async function resolveSections(
  sections: SectionBlock[],
  manifest: BrasaManifest,
  ctx: LoaderContext,
): Promise<ResolvedSection[]> {
  const schemaMap = new Map(manifest.sections.map((s) => [s.key, s]));

  const resolved = await Promise.all(
    sections.map(async (block): Promise<ResolvedSection> => {
      const schema = schemaMap.get(block.component);

      if (!schema?.loader) {
        return { ...block, loaderData: null };
      }

      const loaderFn = loaderRegistry[schema.loader.fn];
      if (!loaderFn) {
        console.warn(`[loader] Unknown loader: ${schema.loader.fn} for section ${block.component}`);
        return { ...block, loaderData: null };
      }

      // Build loader props: merge schema defaults with instance overrides
      const loaderProps: Record<string, unknown> = {};

      // Map section props to loader props via propsMap
      if (schema.loader.propsMap) {
        for (const [loaderParam, sectionPropKey] of Object.entries(schema.loader.propsMap)) {
          loaderProps[loaderParam] = block.props[sectionPropKey];
        }
      }

      // Apply per-instance overrides from the editor
      if (block.loaderProps) {
        Object.assign(loaderProps, block.loaderProps);
      }

      // Build cache key from loader name + props
      const cacheKey = [
        "loader",
        schema.loader.fn,
        String(ctx.tenantId),
        JSON.stringify(loaderProps),
      ];

      const cacheTags = schema.loader.cacheTags || [];

      try {
        const result = await unstable_cache(
          async () => loaderFn(loaderProps, ctx),
          cacheKey,
          { revalidate: CACHE_TTL_EDITORIAL, tags: cacheTags },
        )();

        return { ...block, loaderData: result.data };
      } catch (err) {
        console.error(`[loader] Failed ${schema.loader.fn} for ${block.component}:`, err);
        return { ...block, loaderData: null };
      }
    }),
  );

  return resolved;
}
