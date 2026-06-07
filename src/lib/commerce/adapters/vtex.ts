/**
 * VTEX Commerce Adapter
 *
 * Connects to VTEX Intelligent Search + Checkout APIs.
 * Config: VTEX_ACCOUNT, VTEX_ENVIRONMENT (vtexcommercestable.com.br)
 */

import type {
  CommerceAdapter, Product, ProductListingPage, ProductDetailsPage,
  Cart, Suggestion, ImageObject, Offer, AggregateOffer, Filter, FilterValue,
} from "../types";

export interface VtexConfig {
  account: string;
  environment?: string;
  salesChannel?: string;
  locale?: string;
}

function buildUrl(config: VtexConfig, path: string): string {
  const env = config.environment || "vtexcommercestable.com.br";
  return `https://${config.account}.${env}${path}`;
}

function mapProduct(raw: any, baseUrl: string): Product {
  const images: ImageObject[] = (raw.items?.[0]?.images || []).map((img: any) => ({
    url: img.imageUrl,
    alt: img.imageLabel || raw.productName,
  }));

  const item = raw.items?.[0];
  const seller = item?.sellers?.[0];
  const price = seller?.commertialOffer?.Price || 0;
  const listPrice = seller?.commertialOffer?.ListPrice || price;
  const availability = seller?.commertialOffer?.AvailableQuantity > 0 ? "InStock" : "OutOfStock";

  const offers: AggregateOffer = {
    lowPrice: price,
    highPrice: listPrice,
    offerCount: 1,
    offers: [{
      seller: seller?.sellerId || "1",
      price,
      listPrice,
      currency: "BRL",
      availability: availability as "InStock" | "OutOfStock",
    }],
  };

  return {
    "@type": "Product",
    productID: raw.productId,
    sku: item?.itemId || raw.productId,
    name: raw.productName,
    description: raw.description,
    url: `${baseUrl}/${raw.linkText}/p`,
    image: images,
    brand: raw.brand ? { name: raw.brand } : undefined,
    category: raw.categories?.[0]?.replace(/^\/|\/$/g, ""),
    offers,
  };
}

export function createVtexAdapter(config: VtexConfig): CommerceAdapter {
  const baseUrl = `https://${config.account}.${config.environment || "vtexcommercestable.com.br"}`;
  const searchUrl = `https://${config.account}.vtexcommercestable.com.br`;

  return {
    platform: "vtex",

    async getProduct(slug: string): Promise<ProductDetailsPage | null> {
      const res = await fetch(
        `${searchUrl}/api/catalog_system/pub/products/search/${slug}/p`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) return null;
      const [raw] = await res.json();
      if (!raw) return null;

      return {
        "@type": "ProductDetailsPage",
        breadcrumbList: { items: [{ name: raw.productName, url: `/${raw.linkText}/p`, position: 1 }] },
        product: mapProduct(raw, baseUrl),
      };
    },

    async searchProducts(params): Promise<ProductListingPage> {
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.set("ft", params.query);
      const page = params.page || 1;
      const limit = params.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      searchParams.set("_from", String(from));
      searchParams.set("_to", String(to));
      if (params.sort) searchParams.set("O", params.sort);
      if (config.salesChannel) searchParams.set("sc", config.salesChannel);

      const path = params.category
        ? `/api/catalog_system/pub/products/search/${params.category}`
        : "/api/catalog_system/pub/products/search";

      const res = await fetch(`${searchUrl}${path}?${searchParams}`, {
        headers: { Accept: "application/json" },
      });

      const products = res.ok ? (await res.json()).map((p: any) => mapProduct(p, baseUrl)) : [];
      const total = Number(res.headers.get("resources")?.split("/")[1]) || products.length;

      return {
        "@type": "ProductListingPage",
        breadcrumb: { items: [] },
        filters: [],
        products,
        pageInfo: { currentPage: page, records: total, recordsPerPage: limit, totalPages: Math.ceil(total / limit) },
        sortOptions: [
          { label: "Relevância", value: "" },
          { label: "Menor preço", value: "OrderByPriceASC" },
          { label: "Maior preço", value: "OrderByPriceDESC" },
          { label: "Mais vendidos", value: "OrderByTopSaleDESC" },
          { label: "Mais recentes", value: "OrderByReleaseDateDESC" },
        ],
      };
    },

    async getProductList(params): Promise<Product[]> {
      const ids = params.ids || params.skus || [];
      if (ids.length === 0) return [];
      const fq = ids.map((id) => `skuId:${id}`).join("&fq=");
      const res = await fetch(`${searchUrl}/api/catalog_system/pub/products/search?fq=${fq}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      return (await res.json()).map((p: any) => mapProduct(p, baseUrl));
    },

    async getCart(cartId?: string): Promise<Cart | null> {
      if (!cartId) return null;
      const res = await fetch(`${buildUrl(config, `/api/checkout/pub/orderForm/${cartId}`)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        items: (data.items || []).map((i: any) => ({
          productID: i.productId, sku: i.id, name: i.name,
          image: i.imageUrl, price: i.sellingPrice / 100,
          listPrice: i.listPrice / 100, quantity: i.quantity,
        })),
        total: (data.value || 0) / 100,
        subtotal: (data.totalizers?.find((t: any) => t.id === "Items")?.value || 0) / 100,
        currency: "BRL",
      };
    },

    async addToCart(cartId, items): Promise<Cart> {
      const res = await fetch(`${buildUrl(config, `/api/checkout/pub/orderForm/${cartId}/items`)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItems: items.map((i) => ({ id: i.sku, quantity: i.quantity, seller: "1" })) }),
      });
      const data = await res.json();
      return { items: [], total: (data.value || 0) / 100, subtotal: 0, currency: "BRL" };
    },

    async updateCartItem(cartId, sku, quantity): Promise<Cart> {
      return this.addToCart(cartId, [{ sku, quantity }]);
    },

    async removeCartItem(cartId, sku): Promise<Cart> {
      return this.addToCart(cartId, [{ sku, quantity: 0 }]);
    },

    async getSuggestions(query): Promise<Suggestion[]> {
      const res = await fetch(`${searchUrl}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=4`);
      if (!res.ok) return [];
      const products = await res.json();
      return products.map((p: any) => ({ term: p.productName, href: `/${p.linkText}/p` }));
    },
  };
}
