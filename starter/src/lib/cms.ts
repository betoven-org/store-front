const CMS_URL = process.env.CMS_URL!;
const CMS_API_KEY = process.env.CMS_API_KEY!;

export class CmsError extends Error {
  constructor(
    public status: number,
    public path: string,
  ) {
    super(`CMS ${status}: ${path}`);
    this.name = "CmsError";
  }
}

async function cms<T>(path: string, opts?: { revalidate?: number }): Promise<T> {
  const res = await fetch(`${CMS_URL}/api/v1${path}`, {
    headers: { "x-api-key": CMS_API_KEY },
    next: { revalidate: opts?.revalidate ?? 60 },
  });

  if (!res.ok) throw new CmsError(res.status, path);
  return res.json();
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export type PostMode = "recent" | "trending" | "popular" | "editor-picks";

export interface PostCard {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverUrl: string | null;
  heroImageUrl: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  authorName: string | null;
  publishedAt: string | null;
  readingTimeMinutes: number | null;
  views?: number;
}

export interface PostFull {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: unknown;
  coverUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  schemaType: string | null;
  canonicalUrl: string | null;
  wordCount: number | null;
  readingTimeMinutes: number | null;
  noindex: boolean;
  nofollow: boolean;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string; slug: string } | null;
  author: {
    id: number;
    name: string;
    slug: string;
    bio: string | null;
    avatar: { url: string } | null;
  } | null;
  heroImage: {
    id: number;
    url: string;
    alt: string;
    sizes: {
      thumbnail: { url: string | null };
      card: { url: string | null };
      hero: { url: string | null };
    };
  } | null;
  tags: { tag: string }[];
}

export function getPosts(mode: PostMode = "recent", limit = 10, offset = 0) {
  return cms<{ docs: PostCard[] }>(
    `/posts?mode=${mode}&limit=${limit}&offset=${offset}`,
  );
}

export function getPost(slug: string) {
  return cms<PostFull>(`/posts/${slug}`, { revalidate: 120 });
}

export function getFeaturedPost() {
  return cms<PostCard | null>(`/posts/featured`);
}

// ── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
}

export function getCategories() {
  return cms<{ docs: Category[] }>(`/categories`, { revalidate: 3600 });
}

export interface CategoryWithPosts {
  category: Category;
  docs: PostCard[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function getCategoryPosts(slug: string, limit = 12, page = 1) {
  return cms<CategoryWithPosts>(
    `/categories/${slug}?limit=${limit}&page=${page}`,
  );
}

// ── Authors ──────────────────────────────────────────────────────────────────

export interface Author {
  id: number;
  name: string;
  slug: string;
  bio: string | null;
  avatar: { url: string; alt: string } | null;
}

export function getAuthors() {
  return cms<{ docs: Author[] }>(`/authors`, { revalidate: 3600 });
}

export interface AuthorWithPosts {
  author: Author;
  docs: PostCard[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function getAuthorPosts(slug: string, limit = 12, page = 1) {
  return cms<AuthorWithPosts>(
    `/authors/${slug}?limit=${limit}&page=${page}`,
  );
}

// ── Products ─────────────────────────────────────────────────────────────────

export interface ProductCard {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  isKit: boolean;
  featured: boolean;
  publishedAt: string | null;
  category: { id: number; name: string; slug: string } | null;
  image: { url: string; alt: string; thumbnailUrl: string | null } | null;
}

export interface ProductFull {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  content: unknown;
  composition: string | null;
  usageInstructions: string | null;
  whoCanUse: string | null;
  benefits: { title: string; subtitle: string }[] | null;
  differentials: string[] | null;
  brand: string | null;
  isKit: boolean;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  category: { id: number; name: string; slug: string } | null;
  image: { url: string; alt: string; cardUrl: string | null; heroUrl: string | null } | null;
  gallery: { id: number; url: string; alt: string }[];
}

export function getProducts(limit = 20, offset = 0, category?: number) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (category) params.set("category", String(category));
  return cms<{ docs: ProductCard[] }>(`/products?${params}`);
}

export function getProduct(slug: string) {
  return cms<ProductFull>(`/products/${slug}`, { revalidate: 120 });
}

// ── Product Categories ───────────────────────────────────────────────────────

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  image: { url: string; alt: string; thumbnailUrl: string | null } | null;
}

export function getProductCategories() {
  return cms<{ docs: ProductCategory[] }>(`/product-categories`, { revalidate: 3600 });
}

// ── Pages ────────────────────────────────────────────────────────────────────

export interface SectionBlock {
  id: string;
  component: string;
  props: Record<string, unknown>;
}

export interface Page {
  id: number;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  sections: SectionBlock[] | null;
}

export function getPage(slug: string) {
  return cms<Page>(`/pages/${slug}`, { revalidate: 300 });
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface SiteSettings {
  siteName: string | null;
  siteDescription: string | null;
  logo: { url: string; alt: string } | null;
  favicon: { url: string } | null;
  whatsapp: string | null;
  social: {
    facebook: string | null;
    instagram: string | null;
    youtube: string | null;
  };
  newsletter: {
    title: string | null;
    description: string | null;
    consent: string | null;
  };
  seo: {
    title: string | null;
    description: string | null;
    keywords: string | null;
  };
  footerText: string | null;
  copyrightText: string | null;
  analytics: {
    umamiWebsiteId: string | null;
    umamiUrl: string | null;
    gtmId: string | null;
    ga4Id: string | null;
    googleAdsId: string | null;
    facebookPixelId: string | null;
  };
  scripts: {
    head: string | null;
    body: string | null;
  };
}

export function getSettings() {
  return cms<SiteSettings>(`/settings`, { revalidate: 3600 });
}

// ── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  docs: PostCard[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function searchPosts(q: string, limit = 12, page = 1, category?: string) {
  const params = new URLSearchParams({ q, limit: String(limit), page: String(page) });
  if (category) params.set("category", category);
  return cms<SearchResult>(`/search?${params}`);
}

// ── Sitemap ──────────────────────────────────────────────────────────────────

export interface SitemapData {
  posts: { slug: string; updatedAt: string; publishedAt: string | null }[];
  products: { slug: string; updatedAt: string }[];
  categories: { slug: string; updatedAt: string }[];
  pages: { slug: string; updatedAt: string }[];
}

export function getSitemapData() {
  return cms<SitemapData>(`/sitemap`, { revalidate: 3600 });
}

// ── Feed ─────────────────────────────────────────────────────────────────────

export interface FeedData {
  site: { title: string | null; description: string | null };
  items: {
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: string | null;
    category: string | null;
    author: string | null;
  }[];
}

export function getFeedData() {
  return cms<FeedData>(`/feed`, { revalidate: 3600 });
}
