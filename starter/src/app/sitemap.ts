import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/cms";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000";
  const data = await getSitemapData();

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  for (const post of data.posts) {
    entries.push({
      url: `${siteUrl}/posts/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const cat of data.categories) {
    entries.push({
      url: `${siteUrl}/categorias/${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const product of data.products) {
    entries.push({
      url: `${siteUrl}/produtos/${product.slug}/p`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const page of data.pages) {
    if (page.slug === "home") continue;
    entries.push({
      url: `${siteUrl}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}
