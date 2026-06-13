/**
 * Brasa CMS — Manifest Types
 *
 * O manifest e gerado em build-time a partir dos componentes TSX.
 * Ele descreve quais sections existem e quais props cada uma aceita.
 *
 * Convencao de JSDoc nos Props:
 *   @title       — Label do campo no editor
 *   @description — Texto de ajuda abaixo do campo
 *   @format      — Tipo de widget: "rich-text" | "image" | "color" | "url" | "date" | "textarea" | "code"
 *   @default     — Valor padrao
 *   @hide        — Nao mostrar no editor
 *   @options     — Opcoes separadas por virgula (gera select)
 *   @group       — Agrupa campos em abas/seções no editor
 */

// ── Field Schema ─────────────────────────────────────────────────────────────

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "union";

export type FieldFormat =
  | "text"
  | "textarea"
  | "rich-text"
  | "image"
  | "color"
  | "url"
  | "date"
  | "datetime"
  | "email"
  | "code"
  | "video"
  | "select"
  | "hidden"
  | "icon"
  | "map";

export type FieldSchema = {
  type: FieldType;
  title?: string;
  description?: string;
  format?: FieldFormat;
  required?: boolean;
  default?: unknown;
  group?: string;

  // For "object" type
  properties?: Record<string, FieldSchema>;

  // For "array" type
  items?: FieldSchema;

  // For "union" / select
  options?: string[];
};

// ── Loader Schema ────────────────────────────────────────────────────────────

export type LoaderSchema = {
  /** Registered loader function name (e.g. "loadPosts", "loadProducts") */
  fn: string;
  /** Human-readable label for the editor */
  title?: string;
  /** Props passed to the loader, derived from section props.
   *  Keys are loader param names, values are section prop keys or static values. */
  propsMap?: Record<string, string>;
  /** Cache tags for on-demand revalidation */
  cacheTags?: string[];
};

// ── Section Schema ───────────────────────────────────────────────────────────

export type SectionSchema = {
  /** Component name (e.g. "Hero") */
  key: string;
  /** Display title for the editor */
  title: string;
  /** Description shown in the section picker */
  description?: string;
  /** Group/category for organizing sections */
  group?: string;
  /** Thumbnail image URL for the section picker */
  thumbnail?: string;
  /** File path relative to sections/ */
  path: string;
  /** Props schema */
  props: Record<string, FieldSchema>;
  /** Loader configuration — declares what data this section needs */
  loader?: LoaderSchema;
};

// ── Manifest ─────────────────────────────────────────────────────────────────

export type BrasaManifest = {
  /** Generated timestamp */
  generatedAt: string;
  /** All available sections */
  sections: SectionSchema[];
};

// ── Page Content (stored in DB) ──────────────────────────────────────────────

export type SectionVariant = {
  /** Variant name (e.g. "Controle", "Variante A") */
  name: string;
  /** Traffic weight (0-100). All variants should sum to 100 */
  weight: number;
  /** Props for this variant */
  props: Record<string, unknown>;
};

export type SectionBlock = {
  /** Unique ID for this block instance */
  id: string;
  /** Section key (matches SectionSchema.key) */
  component: string;
  /** Props values (used when no variants) */
  props: Record<string, unknown>;
  /** A/B test variants. When set, `props` is ignored and a variant is chosen by weight */
  variants?: SectionVariant[];
  /** Matcher conditions for conditional rendering */
  matcher?: {
    device?: "mobile" | "desktop" | "all";
    startDate?: string;
    endDate?: string;
  };
  /** Deferred loading — section loads on scroll (lazy) */
  deferred?: boolean;
  /** Loader overrides — editor can customize loader params per instance */
  loaderProps?: Record<string, unknown>;
};

export type PageContent = SectionBlock[];

// ── Widget Types (used in component Props) ───────────────────────────────────
// Developers use these types in their Props interfaces.
// The extractor recognizes them and maps to the correct field format.

/** Image URL — renders image upload widget in the editor */
export type ImageWidget = string;

/** Rich text HTML — renders rich text editor in the editor */
export type RichText = string;

/** HTML color — renders color picker */
export type Color = string;

/** Video URL */
export type VideoWidget = string;
