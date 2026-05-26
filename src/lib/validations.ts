import { z } from "zod";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import {
  posts,
  products,
  categories,
  productCategories,
  authors,
  users,
  pages,
  siteSettings,
} from "@brasa/core/schema";

// ── Helpers ─────────────────────────────────────────────────────────────────────

export function parseBody<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join(", ");
    return { success: false as const, error: messages };
  }
  return { success: true as const, data: result.data };
}

// ── Posts ────────────────────────────────────────────────────────────────────────

const baseInsertPost = createInsertSchema(posts, {
  title: z.string().min(1, "Título é obrigatório"),
  excerpt: z.string().min(1, "Excerpt e obrigatorio"),
  content: z.unknown().refine((v) => v != null, "Conteudo e obrigatorio"),
});

export const createPostSchema = baseInsertPost
  .pick({
    title: true,
    excerpt: true,
    content: true,
    categoryId: true,
    authorId: true,
    heroImageId: true,
    coverUrl: true,
    status: true,
    featured: true,
    metaTitle: true,
    metaDescription: true,
    focusKeyword: true,
    secondaryKeywords: true,
    ogTitle: true,
    ogDescription: true,
    ogImageUrl: true,
    schemaType: true,
    canonicalUrl: true,
    noindex: true,
    nofollow: true,
    seoScore: true,
    seoNotes: true,
  })
  .required({ title: true, excerpt: true, content: true, categoryId: true, authorId: true })
  .extend({ tags: z.array(z.string()).optional() });

export const updatePostSchema = createUpdateSchema(posts)
  .pick({
    title: true,
    excerpt: true,
    content: true,
    categoryId: true,
    authorId: true,
    heroImageId: true,
    coverUrl: true,
    status: true,
    featured: true,
    publishedAt: true,
    metaTitle: true,
    metaDescription: true,
    focusKeyword: true,
    secondaryKeywords: true,
    ogTitle: true,
    ogDescription: true,
    ogImageUrl: true,
    schemaType: true,
    canonicalUrl: true,
    noindex: true,
    nofollow: true,
    wordCount: true,
    readingTimeMinutes: true,
    seoScore: true,
    seoNotes: true,
    lastSeoReviewAt: true,
    approvedAt: true,
  })
  .extend({ tags: z.array(z.string()).optional() });

// ── Bulk actions ────────────────────────────────────────────────────────────────

export const bulkActionSchema = z.object({
  ids: z.array(z.number().int()).min(1, "IDs obrigatorios"),
  action: z.enum(["delete", "publish", "unpublish"]),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int()).min(1, "IDs obrigatorios"),
  action: z.literal("delete"),
});

// ── Products ────────────────────────────────────────────────────────────────────

const baseInsertProduct = createInsertSchema(products, {
  name: z.string().min(1, "Nome e obrigatorio"),
});

export const createProductSchema = baseInsertProduct
  .pick({
    name: true,
    description: true,
    content: true,
    composition: true,
    usageInstructions: true,
    whoCanUse: true,
    benefits: true,
    differentials: true,
    productCategoryId: true,
    imageId: true,
    galleryImages: true,
    seoTitle: true,
    seoDescription: true,
    brand: true,
    isKit: true,
    showOnSite: true,
    noindex: true,
    status: true,
    featured: true,
  })
  .required({ name: true });

export const updateProductSchema = createProductSchema.partial();

// ── Categories ──────────────────────────────────────────────────────────────────

export const createCategorySchema = createInsertSchema(categories, {
  name: z.string().min(1, "Nome e obrigatorio"),
}).pick({ name: true, description: true });

export const updateCategorySchema = createCategorySchema.partial();

// ── Product Categories ──────────────────────────────────────────────────────────

export const createProductCategorySchema = createInsertSchema(productCategories, {
  name: z.string().min(1, "Nome e obrigatorio"),
}).pick({ name: true, description: true, imageId: true, sortOrder: true });

export const updateProductCategorySchema = createProductCategorySchema.partial();

// ── Authors ─────────────────────────────────────────────────────────────────────

export const createAuthorSchema = createInsertSchema(authors, {
  name: z.string().min(1, "Nome e obrigatorio"),
}).pick({ name: true, bio: true, avatarId: true });

export const updateAuthorSchema = createAuthorSchema.partial();

// ── Users ───────────────────────────────────────────────────────────────────────

export const createUserSchema = createInsertSchema(users, {
  name: z.string().min(1, "Nome e obrigatorio"),
  email: z.string().email("Email invalido"),
})
  .pick({ name: true, email: true, role: true })
  .extend({ password: z.string().min(6, "Senha deve ter no minimo 6 caracteres") });

export const updateUserSchema = createUserSchema.partial();

// ── Pages ───────────────────────────────────────────────────────────────────────

export const createPageSchema = createInsertSchema(pages, {
  title: z.string().min(1, "Título é obrigatório"),
  slug: z.string().min(1, "Slug e obrigatorio"),
}).pick({ title: true, slug: true });

export const updatePageSchema = createUpdateSchema(pages).pick({
  title: true,
  content: true,
  metaTitle: true,
  metaDescription: true,
  ogTitle: true,
  ogDescription: true,
  ogImageUrl: true,
});

// ── Settings ────────────────────────────────────────────────────────────────────

export const updateSettingsSchema = createUpdateSchema(siteSettings).omit({
  id: true,
  lastSyncAt: true,
  updatedAt: true,
});
