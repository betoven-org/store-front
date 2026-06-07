/**
 * VNDA Commerce Adapter
 *
 * Connects to VNDA REST API.
 * Config: VNDA_DOMAIN, VNDA_TOKEN
 */

import type {
  CommerceAdapter, Product, ProductListingPage, ProductDetailsPage,
  Cart, Suggestion, ImageObject, AggregateOffer,
} from "../types";

export interface VndaConfig {
  domain: string;
  token: string;
}

async function api(config: VndaConfig, path: string) {
  const res = await fetch(`https://${config.domain}/api/v2${path}`, {
    headers: { Authorization: `Token ${config.token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`VNDA API ${res.status}`);
  return res.json();
}

function mapProduct(raw: any): Product {
  const images: ImageObject[] = (raw.images || raw.variants?.[0]?.images || []).map((img: any) => ({
    url: img.url || img.sku_url, alt: raw.name,
  }));

  const variant = raw.variants?.[0];
  const price = variant?.price || raw.price || 0;
  const salePrice = variant?.sale_price || raw.sale_price || price;

  const offers: AggregateOffer = {
    lowPrice: salePrice,
    highPrice: price,
    offerCount: 1,
    offers: [{ seller: "vnda", price: salePrice, listPrice: price, currency: "BRL", availability: raw.available ? "InStock" : "OutOfStock" }],
  };

  return {
    "@type": "Product",
    productID: String(raw.id),
    sku: String(variant?.sku || raw.id),
    name: raw.name,
    description: raw.description,
    url: raw.url || `/produto/${raw.slug}`,
    image: images,
    brand: raw.brand?.name ? { name: raw.brand.name } : undefined,
    category: raw.category_name || raw.categories?.[0]?.name,
    offers,
  };
}

export function createVndaAdapter(config: VndaConfig): CommerceAdapter {
  return {
    platform: "vnda",

    async getProduct(slug): Promise<ProductDetailsPage | null> {
      try {
        const raw = await api(config, `/products/${slug}`);
        if (!raw) return null;
        return {
          "@type": "ProductDetailsPage",
          breadcrumbList: { items: [{ name: raw.name, url: `/produto/${slug}`, position: 1 }] },
          product: mapProduct(raw),
        };
      } catch { return null; }
    },

    async searchProducts(params): Promise<ProductListingPage> {
      const limit = params.limit || 20;
      const page = params.page || 1;
      const qp = new URLSearchParams({ per_page: String(limit), page: String(page) });
      if (params.query) qp.set("term", params.query);

      const products = await api(config, `/products?${qp}`);
      return {
        "@type": "ProductListingPage",
        breadcrumb: { items: [] },
        filters: [],
        products: (Array.isArray(products) ? products : []).map(mapProduct),
        pageInfo: { currentPage: page, recordsPerPage: limit },
        sortOptions: [
          { label: "Mais recentes", value: "newest" },
          { label: "Menor preço", value: "price_asc" },
          { label: "Maior preço", value: "price_desc" },
        ],
      };
    },

    async getProductList(params): Promise<Product[]> {
      const ids = params.ids || [];
      const results: Product[] = [];
      for (const id of ids.slice(0, 10)) {
        try {
          const raw = await api(config, `/products/${id}`);
          if (raw) results.push(mapProduct(raw));
        } catch { /* skip */ }
      }
      return results;
    },

    async getCart(): Promise<Cart | null> { return null; },
    async addToCart(): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },
    async updateCartItem(): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },
    async removeCartItem(): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },

    async getSuggestions(query): Promise<Suggestion[]> {
      const products = await api(config, `/products?term=${encodeURIComponent(query)}&per_page=5`);
      return (Array.isArray(products) ? products : []).map((p: any) => ({ term: p.name, href: `/produto/${p.slug}` }));
    },
  };
}
