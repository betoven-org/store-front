import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryPosts } from "@/lib/cms";
import { formatDate } from "@/lib/format-date";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryPosts(slug, 1).catch(() => null);
  if (!data?.category) return {};
  return {
    title: data.category.name,
    description: data.category.description,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam || "1"));

  const data = await getCategoryPosts(slug, 12, page).catch(() => null);

  if (!data?.category) notFound();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{data.category.name}</h1>
      {data.category.description && (
        <p className="mt-2 text-gray-500">{data.category.description}</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.docs.map((post) => (
          <article key={post.id}>
            <a href={`/posts/${post.slug}`}>
              {post.heroImage && (
                <img
                  src={post.heroImage.url}
                  alt={post.heroImage.alt}
                  width={640}
                  height={400}
                  loading="lazy"
                  className="aspect-[16/10] w-full rounded-lg object-cover"
                />
              )}
              <h2 className="mt-2 text-base font-semibold text-gray-900 hover:text-[#0d61ac] line-clamp-2">
                {post.title}
              </h2>
            </a>
            {post.publishedAt && (
              <time className="mt-1 block text-xs text-gray-400" dateTime={post.publishedAt}>
                {formatDate(post.publishedAt)}
              </time>
            )}
          </article>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex justify-center gap-2">
        {data.hasPrevPage && (
          <a
            href={`/categorias/${slug}?page=${page - 1}`}
            className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Anterior
          </a>
        )}
        {data.hasNextPage && (
          <a
            href={`/categorias/${slug}?page=${page + 1}`}
            className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Proximo
          </a>
        )}
      </div>
    </main>
  );
}
