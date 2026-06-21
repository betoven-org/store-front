import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { eq, and } from "drizzle-orm";

// ── Types ────────────────────────────────────────────────────────────────────

export type SbLandingPage = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  key_takeaways: string[] | null;
  faq: { pergunta: string; resposta: string }[] | null;
  clinical_references: unknown[] | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  og_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  hero_cta_label: string | null;
  hero_cta_url: string | null;
  related_links: { label: string; url: string }[] | null;
  secondary_cta_label: string | null;
  secondary_cta_url: string | null;
  sections: { id: string; component: string; props: Record<string, unknown> }[] | null;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

// ── Sections builder ─────────────────────────────────────────────────────────

export function landingPageToSections(lp: SbLandingPage) {
  const sections: {
    id: string;
    component: string;
    props: Record<string, unknown>;
  }[] = [];

  sections.push({
    id: "lp-hero",
    component: "Hero",
    props: {
      title: lp.title,
      subtitle: lp.excerpt || "",
      ...(lp.cover_image_url
        ? { backgroundImage: lp.cover_image_url, dark: true }
        : {}),
      align: "centro",
      ...(lp.hero_cta_label
        ? {
            cta: {
              label: lp.hero_cta_label,
              href: lp.hero_cta_url || "#",
            },
          }
        : {}),
    },
  });

  if (lp.content) {
    sections.push({
      id: "lp-content",
      component: "RichContent",
      props: { content: lp.content, maxWidth: "medium" },
    });
  }

  if (lp.faq && lp.faq.length > 0) {
    sections.push({
      id: "lp-faq",
      component: "FAQ",
      props: {
        title: "Perguntas Frequentes",
        items: lp.faq.map((f) => ({
          question: f.pergunta,
          answer: f.resposta,
        })),
      },
    });
  }

  return sections;
}

// ── Upsert page ──────────────────────────────────────────────────────────────

export async function upsertLandingPage(
  lp: SbLandingPage,
  tenantId: number,
): Promise<"created" | "updated" | "deleted"> {
  const pageSlug = `campanhas/${lp.slug}`;
  // Use custom sections from Supabase if defined, otherwise auto-generate
  const sections = (Array.isArray(lp.sections) && lp.sections.length > 0)
    ? lp.sections
    : landingPageToSections(lp);
  const sectionsJson = JSON.stringify(sections);

  const [existing] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.slug, pageSlug), eq(pages.tenantId, tenantId)))
    .limit(1);

  const pageData = {
    title: lp.title,
    sections: sectionsJson,
    draftSections: sectionsJson,
    metaTitle: lp.meta_title,
    metaDescription: lp.meta_description,
    ogTitle: lp.og_title,
    ogDescription: lp.og_description,
    ogImageUrl: lp.og_image_url,
    updatedAt: lp.updated_at,
  };

  if (existing) {
    await db.update(pages).set(pageData).where(eq(pages.id, existing.id));
    return "updated";
  } else {
    await db.insert(pages).values({
      ...pageData,
      tenantId,
      slug: pageSlug,
      createdAt: lp.created_at,
    });
    return "created";
  }
}

export async function deleteLandingPage(
  slug: string,
  tenantId: number,
): Promise<boolean> {
  const pageSlug = `campanhas/${slug}`;
  const result = await db
    .delete(pages)
    .where(and(eq(pages.slug, pageSlug), eq(pages.tenantId, tenantId)));
  return true;
}
