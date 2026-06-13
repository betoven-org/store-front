/**
 * Brasa CMS — Section Schema Definition
 *
 * Cada section no frontend exporta um `schema` que descreve suas props.
 * O extractor coleta esses schemas e gera o manifest automaticamente.
 *
 * Uso no componente da section:
 *
 * ```tsx
 * import { defineSection, type ImageWidget, type RichText } from "@brasa/core/section-schema";
 *
 * export const schema = defineSection({
 *   key: "Hero",
 *   title: "Hero Banner",
 *   description: "Banner principal com imagem e CTA",
 *   group: "Marketing",
 *   thumbnail: "/thumbs/hero.png",
 *   props: {
 *     title: { type: "string", title: "Titulo", required: true },
 *     subtitle: { type: "string", format: "textarea", title: "Subtitulo" },
 *     image: { type: "string", format: "image", title: "Imagem de fundo", required: true },
 *     ctaText: { type: "string", title: "Texto do botao", default: "Saiba mais" },
 *     ctaHref: { type: "string", format: "url", title: "Link do botao" },
 *     variant: { type: "string", format: "select", title: "Variante", options: ["light", "dark"], default: "dark" },
 *   },
 * });
 * ```
 */

import type { FieldSchema, LoaderSchema, SectionSchema } from "./manifest";

// Re-export widget types for convenience
export type { ImageWidget, RichText, Color, VideoWidget } from "./manifest";
export type { LoaderSchema } from "./manifest";

export type SectionDefinition = Omit<SectionSchema, "path"> & {
  /** Thumbnail image URL for the section picker */
  thumbnail?: string;
};

/**
 * Define a section schema. Used by the extractor to generate the manifest.
 * Also provides runtime validation and type safety.
 */
export function defineSection(definition: SectionDefinition): SectionDefinition {
  return definition;
}

/**
 * Helper to define a repeated field (array of items).
 */
export function arrayField(items: FieldSchema, opts?: Partial<FieldSchema>): FieldSchema {
  return { type: "array", items, ...opts };
}

/**
 * Helper to define a nested object field.
 */
export function objectField(
  properties: Record<string, FieldSchema>,
  opts?: Partial<FieldSchema>,
): FieldSchema {
  return { type: "object", properties, ...opts };
}

/**
 * Common field presets — shortcuts for frequent patterns.
 */
export const fields = {
  text: (title: string, opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    format: "text",
    title,
    ...opts,
  }),
  textarea: (title: string, opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    format: "textarea",
    title,
    ...opts,
  }),
  richText: (title: string, opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    format: "rich-text",
    title,
    ...opts,
  }),
  image: (title: string, opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    format: "image",
    title,
    ...opts,
  }),
  color: (title: string, opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    format: "color",
    title,
    ...opts,
  }),
  url: (title: string, opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    format: "url",
    title,
    ...opts,
  }),
  date: (title: string, opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    format: "date",
    title,
    ...opts,
  }),
  number: (title: string, opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "number",
    title,
    ...opts,
  }),
  boolean: (title: string, opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "boolean",
    title,
    ...opts,
  }),
  select: (title: string, options: string[], opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    format: "select",
    title,
    options,
    ...opts,
  }),
  hidden: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    format: "hidden",
    ...opts,
  }),
} as const;
