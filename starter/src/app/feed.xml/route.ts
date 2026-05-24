import { getFeedData } from "@/lib/cms";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000";
  const data = await getFeedData();

  const items = data.items
    .map(
      (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${siteUrl}/posts/${item.slug}</link>
      <guid isPermaLink="true">${siteUrl}/posts/${item.slug}</guid>
      ${item.excerpt ? `<description><![CDATA[${item.excerpt}]]></description>` : ""}
      ${item.publishedAt ? `<pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>` : ""}
      ${item.category ? `<category><![CDATA[${item.category}]]></category>` : ""}
      ${item.author ? `<dc:creator><![CDATA[${item.author}]]></dc:creator>` : ""}
    </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${data.site.title ?? "Blog"}</title>
    <link>${siteUrl}</link>
    <description>${data.site.description ?? ""}</description>
    <language>pt-BR</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
