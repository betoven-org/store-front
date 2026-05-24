import { Metadata } from "next";
import { getPosts, getCategories, type PostCard } from "@/lib/cms";
import { formatDate } from "@/lib/format-date";

export const metadata: Metadata = {
  title: "Blog",
  description: "Todos os posts",
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam || "1"));
  const limit = 12;
  const offset = (page - 1) * limit;

  const [{ docs: posts }, { docs: categories }] = await Promise.all([
    getPosts("recent", limit, offset),
    getCategories(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Blog</h1>

      {/* Category filters */}
      {categories.length > 0 && (
        <nav className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
          <a
            href="/blog"
            className="shrink-0 rounded-full bg-[#0d61ac] px-4 py-1.5 text-sm font-medium text-white"
          >
            Todos
          </a>
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`/categorias/${cat.slug}`}
              className="shrink-0 rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-[#0d61ac] hover:text-white transition-colors"
            >
              {cat.name}
            </a>
          ))}
        </nav>
      )}

      {/* Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const imageUrl = post.heroImageUrl ?? post.coverUrl;
          return (
            <article key={post.id}>
              <a href={`/posts/${post.slug}`}>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={post.title}
                    width={640}
                    height={400}
                    loading="lazy"
                    className="aspect-[16/10] w-full rounded-lg object-cover"
                  />
                )}
              </a>
              {post.categoryName && (
                <span className="mt-3 block text-xs font-semibold uppercase text-[#0d61ac]">
                  {post.categoryName}
                </span>
              )}
              <a href={`/posts/${post.slug}`}>
                <h2 className="mt-1 text-base font-semibold text-gray-900 hover:text-[#0d61ac] line-clamp-2">
                  {post.title}
                </h2>
              </a>
              {post.publishedAt && (
                <time className="mt-1 block text-xs text-gray-400" dateTime={post.publishedAt}>
                  {formatDate(post.publishedAt)}
                </time>
              )}
            </article>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex justify-center gap-2">
        {page > 1 && (
          <a
            href={`/blog?page=${page - 1}`}
            className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Anterior
          </a>
        )}
        {posts.length === limit && (
          <a
            href={`/blog?page=${page + 1}`}
            className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Proximo
          </a>
        )}
      </div>
    </main>
  );
}
