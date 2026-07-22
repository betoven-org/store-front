import type { SectionBlock } from "@brasa/core/manifest";

export type EditState = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  content: string;
};

export type Page = {
  id: number;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  content: string;
  draft: EditState | null;
  sections: SectionBlock[] | null;
  draftSections: SectionBlock[] | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PageVersion = {
  id: number;
  version: number;
  title: string | null;
  publishedBy: string | null;
  publishedAt: string;
  sectionCount: number;
};
