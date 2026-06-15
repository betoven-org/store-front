/**
 * Plugin Registry — manages plugin lifecycle and resolution.
 */

import type { BrasaPlugin, InstalledPlugin } from "./types";
import type { LoaderFn } from "@/lib/loaders";
import type { SectionSchema } from "@brasa/core/manifest";

// ── Global plugin store ─────────────────────────────────────────────────────

const registeredPlugins = new Map<string, BrasaPlugin>();

/**
 * Register a plugin (called at app startup).
 */
export function registerPlugin(plugin: BrasaPlugin) {
  registeredPlugins.set(plugin.manifest.id, plugin);
}

/**
 * Get a registered plugin by ID.
 */
export function getPlugin(id: string): BrasaPlugin | undefined {
  return registeredPlugins.get(id);
}

/**
 * List all registered plugins.
 */
export function listPlugins(): BrasaPlugin[] {
  return Array.from(registeredPlugins.values());
}

/**
 * Merge plugin sections into a manifest.
 * Only includes sections from installed+enabled plugins.
 */
export function mergePluginSections(
  baseSections: SectionSchema[],
  installed: InstalledPlugin[]
): SectionSchema[] {
  const merged = [...baseSections];

  for (const inst of installed) {
    if (!inst.enabled) continue;
    const plugin = registeredPlugins.get(inst.pluginId);
    if (!plugin?.sections) continue;

    for (const section of plugin.sections) {
      // Prefix section key with plugin ID to avoid collisions
      merged.push({
        ...section,
        key: `${inst.pluginId}/${section.key}`,
        group: plugin.manifest.name,
      });
    }
  }

  return merged;
}

/**
 * Merge plugin loaders into the loader registry.
 */
export function mergePluginLoaders(
  baseRegistry: Record<string, LoaderFn>,
  installed: InstalledPlugin[]
): Record<string, LoaderFn> {
  const merged = { ...baseRegistry };

  for (const inst of installed) {
    if (!inst.enabled) continue;
    const plugin = registeredPlugins.get(inst.pluginId);
    if (!plugin?.loaders) continue;

    for (const [name, fn] of Object.entries(plugin.loaders)) {
      merged[`${inst.pluginId}/${name}`] = fn;
    }
  }

  return merged;
}
