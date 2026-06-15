/**
 * Brasa Plugin System — Interface for extensible CMS functionality.
 * Inspired by deco/blocks/app.ts (Apache-2.0).
 *
 * Plugins can add sections, loaders, actions, settings, and routes
 * to the CMS without modifying core code.
 */

import type { SectionSchema } from "@brasa/core/manifest";
import type { LoaderFn } from "@/lib/loaders";

/**
 * Plugin manifest — declares what the plugin provides.
 */
export type PluginManifest = {
  /** Unique plugin identifier (e.g., "vtex", "shopify", "analytics") */
  id: string;
  /** Display name */
  name: string;
  /** Plugin version (semver) */
  version: string;
  /** Description */
  description?: string;
  /** Plugin icon (Lucide icon name) */
  icon?: string;
};

/**
 * Plugin settings schema — defines configuration UI in admin.
 */
export type PluginSettingsField = {
  key: string;
  type: "string" | "number" | "boolean" | "select";
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: string[]; // for select type
};

/**
 * Full plugin definition.
 */
export type BrasaPlugin = {
  /** Plugin identity */
  manifest: PluginManifest;

  /** Sections this plugin provides (merged into tenant manifest) */
  sections?: SectionSchema[];

  /** Loaders this plugin provides (merged into loader registry) */
  loaders?: Record<string, LoaderFn>;

  /** Settings schema for admin configuration UI */
  settings?: PluginSettingsField[];

  /** Middleware function — runs before every request (optional) */
  middleware?: (req: Request, ctx: { tenantId: number }) => Promise<Response | void>;

  /** Lifecycle hooks */
  onInstall?: (tenantId: number, settings: Record<string, unknown>) => Promise<void>;
  onUninstall?: (tenantId: number) => Promise<void>;
  onSettingsChange?: (tenantId: number, settings: Record<string, unknown>) => Promise<void>;
};

/**
 * Installed plugin record (stored in DB).
 */
export type InstalledPlugin = {
  id: number;
  tenantId: number;
  pluginId: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  installedAt: string;
};
