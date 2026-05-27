import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  uuid,
  customType,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
import { relations } from "drizzle-orm";

// -- Enums --------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "editor", "author", "viewer"]);
export const postStatusEnum = pgEnum("post_status", ["draft", "published"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "overdue",
  "suspended",
]);

// -- Tenants ------------------------------------------------------------------

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  logoUrl: text("logo_url"),
  plan: varchar("plan", { length: 50 }).default("starter").notNull(),
  active: boolean("active").default(true).notNull(),
  apiKey: text("api_key").unique(),
  frontendUrl: text("frontend_url"),
  revalidateSecret: text("revalidate_secret"),
  manifest: jsonb("manifest"),
  draftManifest: jsonb("draft_manifest"),
  globalSections: jsonb("global_sections"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Users --------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").default("editor").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Categories ---------------------------------------------------------------

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  supabaseId: uuid("supabase_id").unique(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Media --------------------------------------------------------------------

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  supabaseUrl: text("supabase_url").unique(),
  filename: varchar("filename", { length: 255 }).notNull(),
  alt: varchar("alt", { length: 255 }).notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  cardUrl: text("card_url"),
  heroUrl: text("hero_url"),
  mimeType: varchar("mime_type", { length: 100 }),
  size: integer("size"),
  blurhash: varchar("blurhash", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Authors ------------------------------------------------------------------

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  supabaseId: uuid("supabase_id").unique(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  bio: text("bio"),
  avatarId: integer("avatar_id").references(() => media.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Posts --------------------------------------------------------------------

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  supabaseId: uuid("supabase_id").unique(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: jsonb("content"),
  categoryId: integer("category_id").references(() => categories.id),
  authorId: integer("author_id").references(() => authors.id),
  heroImageId: integer("hero_image_id").references(() => media.id, {
    onDelete: "set null",
  }),
  coverUrl: text("cover_url"),
  metaTitle: varchar("meta_title", { length: 500 }),
  metaDescription: text("meta_description"),
  focusKeyword: varchar("focus_keyword", { length: 255 }),
  secondaryKeywords: text("secondary_keywords"),
  ogTitle: varchar("og_title", { length: 500 }),
  ogDescription: text("og_description"),
  ogImageUrl: text("og_image_url"),
  schemaType: varchar("schema_type", { length: 100 }),
  canonicalUrl: text("canonical_url"),
  wordCount: integer("word_count"),
  readingTimeMinutes: integer("reading_time_minutes"),
  seoScore: integer("seo_score"),
  seoNotes: text("seo_notes"),
  lastSeoReviewAt: timestamp("last_seo_review_at", { mode: "string" }),
  approvedAt: timestamp("approved_at", { mode: "string" }),
  noindex: boolean("noindex").default(false).notNull(),
  nofollow: boolean("nofollow").default(false).notNull(),
  status: postStatusEnum("status").default("draft").notNull(),
  featured: boolean("featured").default(false).notNull(),
  publishedAt: timestamp("published_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  searchVector: tsvector("search_vector"),
});

// -- Product Categories -------------------------------------------------------

export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id").references((): any => productCategories.id, {
    onDelete: "set null",
  }),
  imageId: integer("image_id").references(() => media.id, {
    onDelete: "set null",
  }),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Products -----------------------------------------------------------------

export const productStatusEnum = pgEnum("product_status", ["draft", "published"]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  name: varchar("name", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  description: text("description"),
  content: jsonb("content"),
  composition: text("composition"),
  usageInstructions: text("usage_instructions"),
  whoCanUse: text("who_can_use"),
  benefits: jsonb("benefits"), // [{title: string, subtitle: string}]
  differentials: jsonb("differentials"), // string[]
  productCategoryId: integer("product_category_id").references(
    () => productCategories.id
  ),
  imageId: integer("image_id").references(() => media.id, {
    onDelete: "set null",
  }),
  faq: jsonb("faq"), // [{pergunta: string, resposta: string}]
  galleryImages: jsonb("gallery_images"), // number[] (media ids)
  seoTitle: varchar("seo_title", { length: 500 }),
  seoDescription: text("seo_description"),
  brand: varchar("brand", { length: 255 }),
  isKit: boolean("is_kit").default(false).notNull(),
  showOnSite: boolean("show_on_site").default(true).notNull(),
  noindex: boolean("noindex").default(false).notNull(),
  status: productStatusEnum("product_status").default("draft").notNull(),
  featured: boolean("featured").default(false).notNull(),
  publishedAt: timestamp("published_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  searchVector: tsvector("search_vector"),
});

// -- Tags ---------------------------------------------------------------------

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 100 }).notNull(),
});

// -- Subscribers --------------------------------------------------------------

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Pages --------------------------------------------------------------------

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  ogTitle: varchar("og_title", { length: 255 }),
  ogDescription: text("og_description"),
  ogImageUrl: text("og_image_url"),
  content: text("content"),
  draft: jsonb("draft"),
  sections: jsonb("sections"),
  draftSections: jsonb("draft_sections"),
  scheduledAt: timestamp("scheduled_at", { mode: "string" }),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const pagesRelations = relations(pages, () => ({}));

// -- Site Settings ------------------------------------------------------------

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  siteName: varchar("site_name", { length: 255 }).default("Medicinal na Web"),
  siteDescription: text("site_description"),
  logoId: integer("logo_id").references(() => media.id, {
    onDelete: "set null",
  }),
  faviconId: integer("favicon_id").references(() => media.id, {
    onDelete: "set null",
  }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  facebook: text("facebook"),
  instagram: text("instagram"),
  youtube: text("youtube"),
  footerText: text("footer_text"),
  copyrightText: text("copyright_text"),
  newsletterTitle: varchar("newsletter_title", { length: 255 }),
  newsletterDescription: text("newsletter_description"),
  newsletterConsent: text("newsletter_consent"),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"),
  privacyPolicy: text("privacy_policy"),
  robotsTxt: text("robots_txt").default("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api"),
  supabaseUrl: text("supabase_url"),
  supabaseAnonKey: text("supabase_anon_key"),
  supabaseServiceRoleKey: text("supabase_service_role_key"),
  umamiWebsiteId: varchar("umami_website_id", { length: 100 }),
  umamiUrl: text("umami_url"),
  gtmId: varchar("gtm_id", { length: 50 }),
  ga4Id: varchar("ga4_id", { length: 50 }),
  googleAdsId: varchar("google_ads_id", { length: 50 }),
  facebookPixelId: varchar("facebook_pixel_id", { length: 50 }),
  customHeadScripts: text("custom_head_scripts"),
  customBodyScripts: text("custom_body_scripts"),
  supabaseSyncEnabled: boolean("supabase_sync_enabled").default(false),
  lastSyncAt: timestamp("last_sync_at", { mode: "string" }),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Subscriptions ------------------------------------------------------------

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  nextDueDate: timestamp("next_due_date", { mode: "string" }).notNull(),
  graceDays: integer("grace_days").default(7).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Relations ----------------------------------------------------------------

export const usersRelations = relations(users, () => ({}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
}));

export const mediaRelations = relations(media, () => ({}));

export const authorsRelations = relations(authors, ({ one }) => ({
  avatar: one(media, {
    fields: [authors.avatarId],
    references: [media.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
  author: one(authors, {
    fields: [posts.authorId],
    references: [authors.id],
  }),
  heroImage: one(media, {
    fields: [posts.heroImageId],
    references: [media.id],
  }),
  tags: many(tags),
}));

export const tagsRelations = relations(tags, ({ one }) => ({
  post: one(posts, {
    fields: [tags.postId],
    references: [posts.id],
  }),
}));

export const subscribersRelations = relations(subscribers, () => ({}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one, many }) => ({
    parent: one(productCategories, {
      fields: [productCategories.parentId],
      references: [productCategories.id],
      relationName: "parentChild",
    }),
    children: many(productCategories, { relationName: "parentChild" }),
    image: one(media, {
      fields: [productCategories.imageId],
      references: [media.id],
    }),
    products: many(products),
  })
);

export const productsRelations = relations(products, ({ one }) => ({
  category: one(productCategories, {
    fields: [products.productCategoryId],
    references: [productCategories.id],
  }),
  image: one(media, {
    fields: [products.imageId],
    references: [media.id],
  }),
}));

export const siteSettingsRelations = relations(siteSettings, ({ one }) => ({
  logo: one(media, {
    fields: [siteSettings.logoId],
    references: [media.id],
  }),
  favicon: one(media, {
    fields: [siteSettings.faviconId],
    references: [media.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, () => ({}));

// -- CMS Guides ---------------------------------------------------------------

export const cmsGuides = pgTable("cms_guides", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Request Metrics ----------------------------------------------------------

export const requestMetrics = pgTable("request_metrics", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").default(1).notNull().references(() => tenants.id),
  path: varchar("path", { length: 500 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("status_code").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  country: varchar("country", { length: 2 }),
  city: varchar("city", { length: 100 }),
  userAgent: text("user_agent"),
  referer: text("referer"),
  isBot: boolean("is_bot").default(false).notNull(),
  contentLength: integer("content_length"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// -- Page Versions ------------------------------------------------------------

export const pageVersions = pgTable("page_versions", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  version: integer("version").notNull(),
  title: varchar("title", { length: 500 }),
  metaTitle: varchar("meta_title", { length: 500 }),
  metaDescription: text("meta_description"),
  ogTitle: varchar("og_title", { length: 500 }),
  ogDescription: text("og_description"),
  ogImageUrl: text("og_image_url"),
  content: text("content"),
  sections: jsonb("sections"),
  publishedBy: varchar("published_by", { length: 255 }),
  publishedAt: timestamp("published_at", { mode: "string" }).defaultNow().notNull(),
});

export const pageVersionsRelations = relations(pageVersions, ({ one }) => ({
  page: one(pages, {
    fields: [pageVersions.pageId],
    references: [pages.id],
  }),
}));

export const tenantsRelations = relations(tenants, () => ({}));
