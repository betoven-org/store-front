/**
 * Linx Commerce Adapter
 *
 * Connects to Linx Commerce API.
 * Config: LINX_STORE_ID, LINX_API_KEY
 */

import type {
  CommerceAdapter, Product, ProductListingPage, ProductDetailsPage,
  Cart, Suggestion, ImageObject, AggregateOffer,
} from "../types";

export interface LinxConfig {
  storeId: string;
  apiKey: string;
  baseUrl?: string;
}

async function api(config: LinxConfig, path: string) {
  const base = config.baseUrl || `https://api.linxcommerce.com.br`;
  const res = await fetch(`${base}${path}`, {
    headers: { "X-Store-Id": config.storeId, "X-Api-Key": config.apiKey, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Linx API ${res.status}`);
  return res.json();
}

function mapProduct(raw: any): Product {
  const images: ImageObject[] = (raw.Images || raw.MediaGroups?.[0]?.Medias || []).map((img: any) => ({
    url: img.Url || img.MediaPath, alt: raw.Name,
  }));

  const sku = raw.Skus?.[0] || raw;
  const price = sku.Price || sku.SellPrice || 0;
  const listPrice = sku.ListPrice || sku.OldPrice || price;

  const offers: AggregateOffer = {
    lowPrice: price,
    highPrice: listPrice,
    offerCount: 1,
    offers: [{ seller: "linx", price, listPrice, currency: "BRL", availability: raw.IsAvailable ? "InStock" : "OutOfStock" }],
  };

  return {
    "@type": "Product",
    productID: String(raw.ProductId || raw.Id),
    sku: String(sku.SkuId || sku.Id || raw.Id),
    name: raw.Name || raw.ProductName,
    description: raw.ShortDescription || raw.Description,
    url: raw.Url || `/produto/${raw.Alias || raw.Id}`,
    image: images,
    brand: raw.Brand ? { name: raw.Brand.Name || raw.Brand } : undefined,
    category: raw.CategoryItems?.[0]?.Name,
    offers,
  };
}

export function createLinxAdapter(config: LinxConfig): CommerceAdapter {
  return {
    platform: "linx",

    async getProduct(slug): Promise<ProductDetailsPage | null> {
      try {
        const data = await api(config, `/v1/products?alias=${slug}`);
        const raw = data.Products?.[0];
        if (!raw) return null;
        return {
          "@type": "ProductDetailsPage",
          breadcrumbList: { items: [{ name: raw.Name, url: `/produto/${slug}`, position: 1 }] },
          product: mapProduct(raw),
        };
      } catch { return null; }
    },

    async searchProducts(params): Promise<ProductListingPage> {
      const limit = params.limit || 20;
      const page = params.page || 1;
      const offset = (page - 1) * limit;
      const qp = new URLSearchParams({ PageSize: String(limit), Offset: String(offset) });
      if (params.query) qp.set("Query", params.query);

      const data = await api(config, `/v1/products?${qp}`);
      return {
        "@type": "ProductListingPage",
        breadcrumb: { items: [] },
        filters: [],
        products: (data.Products || []).map(mapProduct),
        pageInfo: { currentPage: page, records: data.TotalCount || 0, recordsPerPage: limit },
        sortOptions: [
          { label: "Relevância", value: "relevance" },
          { label: "Menor preço", value: "price_asc" },
          { label: "Maior preço", value: "price_desc" },
        ],
      };
    },

    async getProductList(params): Promise<Product[]> {
      const ids = params.ids || [];
      if (ids.length === 0) return [];
      const data = await api(config, `/v1/products?ProductIds=${ids.join(",")}`);
      return (data.Products || []).map(mapProduct);
    },

    async getCart(): Promise<Cart | null> { return null; },
    async addToCart(): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },
    async updateCartItem(): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },
    async removeCartItem(): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },

    async getSuggestions(query): Promise<Suggestion[]> {
      const data = await api(config, `/v1/products?Query=${encodeURIComponent(query)}&PageSize=5`);
      return (data.Products || []).map((p: any) => ({ term: p.Name, href: `/produto/${p.Alias}` }));
    },
  };
}
