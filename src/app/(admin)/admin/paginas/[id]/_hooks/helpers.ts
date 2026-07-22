import type { SectionBlock } from "@brasa/core/manifest";
import type { EditState, Page } from "./types";

export type PropDiff = {
  key: string;
  published: string;
  draft: string;
};

export type SectionChange = {
  type: "added" | "removed" | "modified" | "reordered";
  component: string;
  id: string;
  details?: string;
  propDiffs?: PropDiff[];
  position?: { from: number; to: number };
};

export function formatPropValue(val: unknown): string {
  if (val === null || val === undefined) return "(vazio)";
  if (typeof val === "boolean") return val ? "sim" : "nao";
  if (typeof val === "object") {
    const str = JSON.stringify(val);
    return str.length > 80 ? str.slice(0, 80) + "..." : str;
  }
  const str = String(val);
  return str.length > 80 ? str.slice(0, 80) + "..." : str;
}

export function countChanges(page: Page): number {
  if (!page.draft) return 0;
  const draft = page.draft;
  const keys: (keyof EditState)[] = [
    "title",
    "metaTitle",
    "metaDescription",
    "ogTitle",
    "ogDescription",
    "ogImageUrl",
    "content",
  ];
  return keys.filter((k) => (draft[k] ?? "") !== ((page[k] as string) ?? "")).length;
}

export function getSectionChanges(
  page: Page,
  draftBlocks: SectionBlock[],
): SectionChange[] {
  const published = (page.sections ?? []) as SectionBlock[];
  const changes: SectionChange[] = [];

  const pubMap = new Map(published.map((b) => [b.id, b]));
  const draftMap = new Map(draftBlocks.map((b) => [b.id, b]));

  // Added
  for (const block of draftBlocks) {
    if (!pubMap.has(block.id)) {
      const propDiffs = Object.entries(block.props).map(([key, val]) => ({
        key,
        published: "(novo)",
        draft: formatPropValue(val),
      }));
      changes.push({
        type: "added",
        component: block.component,
        id: block.id,
        propDiffs,
      });
    }
  }

  // Removed
  for (const block of published) {
    if (!draftMap.has(block.id)) {
      changes.push({
        type: "removed",
        component: block.component,
        id: block.id,
      });
    }
  }

  // Modified
  for (const block of draftBlocks) {
    const pub = pubMap.get(block.id);
    if (pub) {
      const pubProps = JSON.stringify(pub.props);
      const draftProps = JSON.stringify(block.props);
      if (pubProps !== draftProps || pub.component !== block.component) {
        const allKeys = new Set([
          ...Object.keys(pub.props),
          ...Object.keys(block.props),
        ]);
        const propDiffs: PropDiff[] = [];
        for (const k of allKeys) {
          if (JSON.stringify(pub.props[k]) !== JSON.stringify(block.props[k])) {
            propDiffs.push({
              key: k,
              published: formatPropValue(pub.props[k]),
              draft: formatPropValue(block.props[k]),
            });
          }
        }
        changes.push({
          type: "modified",
          component: block.component,
          id: block.id,
          details: propDiffs.map((d) => d.key).join(", "),
          propDiffs,
        });
      }
    }
  }

  // Order changes
  if (changes.length === 0 && published.length === draftBlocks.length) {
    for (let i = 0; i < published.length; i++) {
      if (published[i].id !== draftBlocks[i]?.id) {
        changes.push({
          type: "reordered",
          component: "Ordem",
          id: "reorder",
          details: "Sections reordenadas",
        });
        break;
      }
    }
  }

  return changes;
}

export function slugToPath(slug: string) {
  return slug === "home" ? "/" : `/${slug}`;
}

export const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  metaTitle: "Meta Title",
  metaDescription: "Meta Description",
  ogTitle: "OG Title",
  ogDescription: "OG Description",
  ogImageUrl: "OG Image URL",
  content: "Conteudo",
};

export const DIFF_FIELDS: (keyof EditState)[] = [
  "title",
  "metaTitle",
  "metaDescription",
  "ogTitle",
  "ogDescription",
  "ogImageUrl",
  "content",
];

export function getChanges(
  page: Page,
): { field: string; label: string; published: string; draft: string }[] {
  if (!page.draft) return [];
  const result: { field: string; label: string; published: string; draft: string }[] = [];
  for (const key of DIFF_FIELDS) {
    const pub = ((page[key] as string) ?? "") as string;
    const dra = (page.draft[key] ?? "") as string;
    if (pub !== dra) {
      result.push({
        field: key,
        label: FIELD_LABELS[key] || key,
        published: pub,
        draft: dra,
      });
    }
  }
  return result;
}

export function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max) + "...";
}
