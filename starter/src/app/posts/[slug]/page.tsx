import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, getPosts, getSettings } from "@/lib/cms";
import { formatDate } from "@/lib/format-date";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug).catch(() => null);
  if (!post) return {};

  const settings = await getSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return {
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt,
    openGraph: {
      title: post.ogTitle ?? post.title,
      description: post.ogDescription ?? post.excerpt ?? undefined,
      images: post.ogImageUrl ?? post.heroImage?.url ?? undefined,
      url: `${siteUrl}/posts/${post.slug}`,
      siteName: settings.siteName ?? undefined,
      type: "article",
    },
    robots: {
      index: !post.noindex,
      follow: !post.nofollow,
    },
    alternates: post.canonicalUrl ? { canonical: post.canonicalUrl } : undefined,
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug).catch(() => null);

  if (!post) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const imageUrl = post.heroImage?.url ?? post.coverUrl;

  // Related posts — latest as fallback
  const { docs: relatedPosts } = await getPosts("recent", 3);
  const related = relatedPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-400">
        <a href="/" className="hover:text-[#0d61ac]">Home</a>
        <span className="mx-2">/</span>
        <a href="/blog" className="hover:text-[#0d61ac]">Blog</a>
        {post.category && (
          <>
            <span className="mx-2">/</span>
            <a href={`/categorias/${post.category.slug}`} className="hover:text-[#0d61ac]">
              {post.category.name}
            </a>
          </>
        )}
      </nav>

      {/* Header */}
      <header>
        {post.category && (
          <span className="text-xs font-semibold uppercase tracking-wide text-[#0d61ac]">
            {post.category.name}
          </span>
        )}
        <h1 className="mt-2 text-3xl font-bold text-gray-900 lg:text-4xl">
          {post.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-400">
          {post.author && <span>Por {post.author.name}</span>}
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          )}
          {post.readingTimeMinutes && (
            <span>{post.readingTimeMinutes} min de leitura</span>
          )}
        </div>
      </header>

      {/* Hero Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={post.title}
          width={768}
          height={480}
          className="mt-6 w-full rounded-lg object-cover aspect-[16/10]"
          loading="eager"
          fetchPriority="high"
        />
      )}

      {/* Content */}
      <article className="prose prose-lg mt-8 max-w-none">
        {/* TipTap/rich content — render based on your content format */}
        {typeof post.content === "string" ? (
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        ) : (
          <p className="text-gray-500">
            Conteudo requer um renderer compativel com o formato do CMS.
          </p>
        )}
      </article>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span
              key={t.tag}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
            >
              #{t.tag}
            </span>
          ))}
        </div>
      )}

      {/* Share */}
      <div className="mt-8 flex items-center gap-3 border-t pt-6">
        <span className="text-sm font-medium text-gray-500">Compartilhar:</span>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${siteUrl}/posts/${post.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#0d61ac] hover:underline"
        >
          Facebook
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${siteUrl}/posts/${post.slug}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-green-600 hover:underline"
        >
          WhatsApp
        </a>
      </div>

      {/* Related Posts */}
      {related.length > 0 && (
        <section className="mt-12 border-t pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Posts relacionados</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <a key={r.id} href={`/posts/${r.slug}`} className="group">
                {(r.heroImageUrl ?? r.coverUrl) && (
                  <img
                    src={(r.heroImageUrl ?? r.coverUrl)!}
                    alt={r.title}
                    width={320}
                    height={200}
                    loading="lazy"
                    className="aspect-[16/10] w-full rounded-lg object-cover"
                  />
                )}
                <h3 className="mt-2 text-sm font-semibold text-gray-900 group-hover:text-[#0d61ac] line-clamp-2">
                  {r.title}
                </h3>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            image: imageUrl,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            author: post.author
              ? { "@type": "Person", name: post.author.name }
              : undefined,
          }),
        }}
      />
    </main>
  );
}
