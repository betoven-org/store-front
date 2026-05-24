import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getSettings } from "@/lib/cms";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return {};

  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.description,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.image?.url ?? undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);

  if (!product) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Images */}
        <div>
          {product.image && (
            <img
              src={product.image.heroUrl ?? product.image.url}
              alt={product.image.alt}
              width={600}
              height={600}
              className="w-full rounded-lg object-cover"
              loading="eager"
            />
          )}
          {product.gallery.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {product.gallery.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.alt}
                  width={150}
                  height={150}
                  loading="lazy"
                  className="aspect-square w-full rounded object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.category && (
            <span className="text-xs font-semibold uppercase text-[#0d61ac]">
              {product.category.name}
            </span>
          )}
          <h1 className="mt-2 text-2xl font-bold text-gray-900 lg:text-3xl">
            {product.name}
          </h1>
          {product.brand && (
            <p className="mt-1 text-sm text-gray-400">por {product.brand}</p>
          )}
          {product.description && (
            <p className="mt-4 text-gray-600">{product.description}</p>
          )}

          {/* Benefits */}
          {product.benefits && product.benefits.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase text-gray-900">Beneficios</h2>
              <ul className="mt-2 space-y-2">
                {product.benefits.map((b, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    <strong>{b.title}</strong>
                    {b.subtitle && <span> — {b.subtitle}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Differentials */}
          {product.differentials && product.differentials.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase text-gray-900">Diferenciais</h2>
              <ul className="mt-2 space-y-1">
                {product.differentials.map((d, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-[#0d61ac]">&#x2713;</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Composition */}
          {product.composition && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase text-gray-900">Composicao</h2>
              <p className="mt-2 text-sm text-gray-600">{product.composition}</p>
            </div>
          )}

          {/* Usage */}
          {product.usageInstructions && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase text-gray-900">Modo de uso</h2>
              <p className="mt-2 text-sm text-gray-600">{product.usageInstructions}</p>
            </div>
          )}
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            image: product.image?.url,
            brand: product.brand
              ? { "@type": "Brand", name: product.brand }
              : undefined,
          }),
        }}
      />
    </main>
  );
}
