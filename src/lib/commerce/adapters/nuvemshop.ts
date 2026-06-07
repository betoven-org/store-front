/**
 * Nuvemshop / Tiendanube Commerce Adapter
 *
 * Connects to Nuvemshop API v1.
 * Config: NUVEMSHOP_STORE_ID, NUVEMSHOP_ACCESS_TOKEN
 */

import type {
  CommerceAdapter, Product, ProductListingPage, ProductDetailsPage,
  Cart, Suggestion, ImageObject, AggregateOffer,
} from "../types";

export interface NuvemshopConfig {
  storeId: string;
  accessToken: string;
  language?: string;
}

async function api(config: NuvemshopConfig, path: string, options?: RequestInit) {
  const res = await fetch(`https://api.tiendanube.com/v1/${config.storeId}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authentication: `bearer ${config.accessToken}`,
      "User-Agent": "BrasaCMS/1.0",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Nuvemshop API ${res.status}`);
  return res.json();
}

function mapProduct(raw: any, lang = "pt"): Product {
  const name = raw.name?.[lang] || raw.name?.pt || raw.name?.es || Object.values(raw.name || {})[0] || "";
  const desc = raw.description?.[lang] || raw.description?.pt || "";
  const images: ImageObject[] = (raw.images || []).map((img: any) => ({ url: img.src, alt: name }));

  const variant = raw.variants?.[0];
  const price = Number(variant?.price || raw.price || 0);
  const compareAt = Number(variant?.compare_at_price || variant?.promotional_price || price);

  const offers: AggregateOffer = {
    lowPrice: Math.min(price, compareAt),
    highPrice: Math.max(price, compareAt),
    offerCount: 1,
    offers: [{ seller: "nuvemshop", price, listPrice: compareAt, currency: "BRL", availability: raw.published ? "InStock" : "OutOfStock" }],
  };

  return {
    "@type": "Product",
    productID: String(raw.id),
    sku: String(variant?.sku || raw.id),
    name,
    description: desc,
    url: raw.canonical_url || `/produtos/${raw.handle?.[lang] || raw.id}`,
    image: images,
    brand: raw.brand ? { name: raw.brand } : undefined,
    category: raw.categories?.[0]?.name?.[lang],
    offers,
  };
}

export function createNuvemshopAdapter(config: NuvemshopConfig): CommerceAdapter {
  const lang = config.language || "pt";

  return {
    platform: "nuvemshop",

    async getProduct(slug): Promise<ProductDetailsPage | null> {
      try {
        const products = await api(config, `/products?handle=${slug}`);
        const raw = products[0];
        if (!raw) return null;
        return {
          "@type": "ProductDetailsPage",
          breadcrumbList: { items: [{ name: mapProduct(raw, lang).name, url: `/produtos/${slug}`, position: 1 }] },
          product: mapProduct(raw, lang),
        };
      } catch { return null; }
    },

    async searchProducts(params): Promise<ProductListingPage> {
      const limit = params.limit || 20;
      const page = params.page || 1;
      const queryParams = new URLSearchParams({ per_page: String(limit), page: String(page) });
      if (params.query) queryParams.set("q", params.query);
      if (params.category) queryParams.set("category_id", params.category);

      const products = await api(config, `/products?${queryParams}`);
      return {
        "@type": "ProductListingPage",
        breadcrumb: { items: [] },
        filters: [],
        products: products.map((p: any) => mapProduct(p, lang)),
        pageInfo: { currentPage: page, recordsPerPage: limit },
        sortOptions: [
          { label: "Mais recentes", value: "created_at-descending" },
          { label: "Menor preço", value: "price-ascending" },
          { label: "Maior preço", value: "price-descending" },
        ],
      };
    },

    async getProductList(params): Promise<Product[]> {
      const ids = params.ids || [];
      if (ids.length === 0) return [];
      const products = await api(config, `/products?ids=${ids.join(",")}`);
      return products.map((p: any) => mapProduct(p, lang));
    },

    async getCart(): Promise<Cart | null> { return null; },
    async addToCart(_cartId, _items): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },
    async updateCartItem(_cartId, _sku, _qty): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },
    async removeCartItem(_cartId, _sku): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },

    async getSuggestions(query): Promise<Suggestion[]> {
      const products = await api(config, `/products?q=${encodeURIComponent(query)}&per_page=5`);
      return products.map((p: any) => ({ term: mapProduct(p, lang).name, href: p.canonical_url }));
    },
  };
}
