/**
 * Wake Commerce Adapter
 *
 * Connects to Wake (Tray Commerce) GraphQL API.
 * Config: WAKE_STORE_URL, WAKE_TOKEN
 */

import type {
  CommerceAdapter, Product, ProductListingPage, ProductDetailsPage,
  Cart, Suggestion, ImageObject, AggregateOffer,
} from "../types";

export interface WakeConfig {
  storeUrl: string;
  token: string;
}

async function graphql(config: WakeConfig, query: string, variables?: Record<string, any>) {
  const res = await fetch(`${config.storeUrl}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Wake API ${res.status}`);
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors[0].message);
  return data;
}

function mapProduct(raw: any): Product {
  const images: ImageObject[] = (raw.images || []).map((img: any) => ({
    url: img.url || img.src, alt: img.alt || raw.name,
  }));

  const price = raw.price || raw.spotPrice || 0;
  const listPrice = raw.listPrice || raw.price || price;

  const offers: AggregateOffer = {
    lowPrice: price,
    highPrice: listPrice,
    offerCount: 1,
    offers: [{ seller: "wake", price, listPrice, currency: "BRL", availability: raw.available ? "InStock" : "OutOfStock" }],
  };

  return {
    "@type": "Product",
    productID: String(raw.productId || raw.id),
    sku: String(raw.sku || raw.productVariantId || raw.id),
    name: raw.name || raw.productName,
    description: raw.description,
    url: raw.url || `/produto/${raw.slug || raw.id}`,
    image: images,
    brand: raw.brand ? { name: raw.brand.name || raw.brand } : undefined,
    category: raw.category?.name,
    offers,
  };
}

export function createWakeAdapter(config: WakeConfig): CommerceAdapter {
  return {
    platform: "wake",

    async getProduct(slug): Promise<ProductDetailsPage | null> {
      const data = await graphql(config, `
        query ($slug: String!) { product(slug: $slug) { productId name description slug url available price listPrice brand { name } category { name } images { url alt } sku productVariantId } }
      `, { slug });
      if (!data.product) return null;
      return {
        "@type": "ProductDetailsPage",
        breadcrumbList: { items: [{ name: data.product.name, url: data.product.url, position: 1 }] },
        product: mapProduct(data.product),
      };
    },

    async searchProducts(params): Promise<ProductListingPage> {
      const limit = params.limit || 20;
      const page = params.page || 1;
      const offset = (page - 1) * limit;

      const data = await graphql(config, `
        query ($query: String, $limit: Int, $offset: Int) {
          search(query: $query, limit: $limit, offset: $offset) {
            products { productId name slug url available price listPrice brand { name } images { url alt } sku }
            total
          }
        }
      `, { query: params.query || "", limit, offset });

      return {
        "@type": "ProductListingPage",
        breadcrumb: { items: [] },
        filters: [],
        products: (data.search?.products || []).map(mapProduct),
        pageInfo: { currentPage: page, records: data.search?.total || 0, recordsPerPage: limit },
        sortOptions: [
          { label: "Relevância", value: "relevance" },
          { label: "Menor preço", value: "price_asc" },
          { label: "Maior preço", value: "price_desc" },
          { label: "Mais vendidos", value: "sales" },
        ],
      };
    },

    async getProductList(params): Promise<Product[]> {
      const ids = params.ids || [];
      if (ids.length === 0) return [];
      const data = await graphql(config, `
        query ($ids: [Int!]!) { productsByIds(ids: $ids) { productId name slug url available price listPrice images { url alt } sku } }
      `, { ids: ids.map(Number) });
      return (data.productsByIds || []).map(mapProduct);
    },

    async getCart(): Promise<Cart | null> { return null; },
    async addToCart(_cid, _items): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },
    async updateCartItem(_cid, _sku, _qty): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },
    async removeCartItem(_cid, _sku): Promise<Cart> { return { items: [], total: 0, subtotal: 0, currency: "BRL" }; },

    async getSuggestions(query): Promise<Suggestion[]> {
      const data = await graphql(config, `
        query ($query: String!) { search(query: $query, limit: 5) { products { name slug } } }
      `, { query });
      return (data.search?.products || []).map((p: any) => ({ term: p.name, href: `/produto/${p.slug}` }));
    },
  };
}
