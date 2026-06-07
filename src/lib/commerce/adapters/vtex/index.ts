/**
 * VTEX Commerce Adapter — Complete implementation
 *
 * Ported from deco-cx/apps/vtex with full Intelligent Search,
 * Catalog System, Checkout and Autocomplete support.
 *
 * Config: VTEX_ACCOUNT, VTEX_ENVIRONMENT, VTEX_SALES_CHANNEL
 * Optional: VTEX_APP_KEY, VTEX_APP_TOKEN (for private APIs)
 */

import type {
  CommerceAdapter, Product, ProductListingPage, ProductDetailsPage,
  Cart, CartItem, Suggestion, ImageObject, AggregateOffer, Offer,
  BreadcrumbList, Filter, FilterValue, SortOption, PageInfo,
} from "../../types";
import { VtexClient, type VtexClientConfig } from "./client";

// ── Product transformation ─────────────────────────────────────────────────────

function mapImage(img: any): ImageObject {
  return {
    url: img.imageUrl?.replace("vteximg.com.br", "vtexassets.com") || img.imageUrl,
    alt: img.imageLabel || img.imageText || "",
    width: img.imageWidth,
    height: img.imageHeight,
  };
}

function mapOffer(seller: any, currency: string): Offer {
  const co = seller.commertialOffer || seller;
  return {
    seller: seller.sellerId || seller.sellerName || "1",
    price: (co.Price ?? co.spotPrice ?? 0),
    listPrice: (co.ListPrice ?? co.listPrice ?? co.Price ?? 0),
    currency,
    availability: (co.AvailableQuantity ?? co.availableQuantity ?? 0) > 0 ? "InStock" : "OutOfStock",
    installments: co.Installments?.map((inst: any) => ({
      billingDuration: inst.NumberOfInstallments,
      billingIncrement: inst.Value,
    })),
  };
}

function mapProductVTEX(raw: any, baseUrl: string, currency = "BRL"): Product {
  const items = raw.items || raw.skus || [];
  const firstItem = items[0] || {};
  const sellers = firstItem.sellers || [];
  const bestSeller = sellers.find((s: any) => (s.commertialOffer?.AvailableQuantity || 0) > 0) || sellers[0];

  const images: ImageObject[] = (firstItem.images || []).map(mapImage);
  const allOffers = sellers.map((s: any) => mapOffer(s, currency));
  const prices = allOffers.filter((o: Offer) => o.price > 0).map((o: Offer) => o.price);

  const offers: AggregateOffer = {
    lowPrice: prices.length > 0 ? Math.min(...prices) : 0,
    highPrice: prices.length > 0 ? Math.max(...prices) : 0,
    offerCount: allOffers.length,
    offers: allOffers,
  };

  const additionalProperty = (raw.specificationGroups || []).flatMap((group: any) =>
    (group.specifications || []).flatMap((spec: any) =>
      (spec.values || []).map((val: string) => ({ name: spec.name, value: val }))
    )
  );

  return {
    "@type": "Product",
    productID: raw.productId,
    sku: firstItem.itemId || raw.productId,
    name: raw.productName || raw.name,
    description: raw.description || raw.metaTagDescription,
    url: `${baseUrl}/${raw.linkText}/p`,
    image: images.length > 0 ? images : undefined,
    brand: raw.brand ? { name: raw.brand } : undefined,
    category: raw.categories?.[0]?.replace(/^\//g, "").replace(/\/$/g, "") || undefined,
    gtin: firstItem.ean || undefined,
    offers,
    additionalProperty: additionalProperty.length > 0 ? additionalProperty : undefined,
    isVariantOf: items.length > 1 ? {
      productGroupID: raw.productId,
      name: raw.productName,
      hasVariant: items.map((item: any) => ({
        productID: raw.productId,
        sku: item.itemId,
        name: item.name || item.nameComplete,
        url: `${baseUrl}/${raw.linkText}/p?skuId=${item.itemId}`,
        image: (item.images || []).map(mapImage),
        offers: {
          lowPrice: item.sellers?.[0]?.commertialOffer?.Price || 0,
          highPrice: item.sellers?.[0]?.commertialOffer?.ListPrice || 0,
          offerCount: item.sellers?.length || 0,
          offers: (item.sellers || []).map((s: any) => mapOffer(s, currency)),
        },
        additionalProperty: (item.variations || []).map((v: any) => ({ name: v.name, value: v.values?.[0] || "" })),
      })),
    } : undefined,
  };
}

// Intelligent Search product mapping
function mapProductIS(raw: any, baseUrl: string, currency = "BRL"): Product {
  const items = raw.items || [];
  const firstItem = items[0] || {};
  const sellers = firstItem.sellers || [];
  const images: ImageObject[] = (firstItem.images || []).map(mapImage);
  const allOffers = sellers.map((s: any) => mapOffer(s, currency));
  const prices = allOffers.filter((o: Offer) => o.price > 0).map((o: Offer) => o.price);

  return {
    "@type": "Product",
    productID: raw.productId,
    sku: firstItem.itemId || raw.productId,
    name: raw.productName,
    description: raw.description,
    url: `${baseUrl}/${raw.linkText}/p`,
    image: images.length > 0 ? images : undefined,
    brand: raw.brand ? { name: raw.brand } : undefined,
    category: raw.categories?.[0]?.replace(/^\//g, "").replace(/\/$/g, ""),
    offers: {
      lowPrice: prices.length > 0 ? Math.min(...prices) : 0,
      highPrice: prices.length > 0 ? Math.max(...prices) : 0,
      offerCount: allOffers.length,
      offers: allOffers,
    },
  };
}

// ── Filter transformation ──────────────────────────────────────────────────────

function mapFilters(facets: any[]): Filter[] {
  if (!Array.isArray(facets)) return [];
  return facets.map((facet) => ({
    label: facet.name || facet.key,
    key: facet.key || facet.name,
    values: (facet.values || []).map((v: any) => ({
      label: v.name || v.value || v.key,
      value: v.value || v.key || v.id || "",
      quantity: v.quantity || v.count || 0,
      selected: v.selected || false,
    })),
  }));
}

// ── Cart transformation ────────────────────────────────────────────────────────

function mapCart(orderForm: any): Cart {
  const items: CartItem[] = (orderForm.items || []).map((item: any) => ({
    productID: item.productId,
    sku: item.id,
    name: item.name,
    image: item.imageUrl,
    price: item.sellingPrice / 100,
    listPrice: item.listPrice / 100,
    quantity: item.quantity,
    url: item.detailUrl,
  }));

  const itemsTotal = orderForm.totalizers?.find((t: any) => t.id === "Items");
  const discounts = orderForm.totalizers?.find((t: any) => t.id === "Discounts");

  return {
    items,
    total: (orderForm.value || 0) / 100,
    subtotal: (itemsTotal?.value || 0) / 100,
    discounts: discounts ? Math.abs(discounts.value) / 100 : undefined,
    coupon: orderForm.marketingData?.coupon || undefined,
    currency: orderForm.storePreferencesData?.currencyCode || "BRL",
  };
}

// ── Sort options ───────────────────────────────────────────────────────────────

const SORT_OPTIONS: SortOption[] = [
  { label: "Relevância", value: "" },
  { label: "Mais vendidos", value: "OrderByTopSaleDESC" },
  { label: "Mais recentes", value: "OrderByReleaseDateDESC" },
  { label: "Menor preço", value: "OrderByPriceASC" },
  { label: "Maior preço", value: "OrderByPriceDESC" },
  { label: "Nome A-Z", value: "OrderByNameASC" },
  { label: "Nome Z-A", value: "OrderByNameDESC" },
  { label: "Melhor avaliação", value: "OrderByScoreDESC" },
];

// ── Adapter ────────────────────────────────────────────────────────────────────

export function createVtexAdapter(config: VtexClientConfig): CommerceAdapter {
  const client = new VtexClient(config);
  const baseUrl = `https://${config.account}.${config.environment || "vtexcommercestable.com.br"}`;
  const currency = "BRL";

  return {
    platform: "vtex",

    async getProduct(slug): Promise<ProductDetailsPage | null> {
      try {
        // Try Intelligent Search first
        const params = new URLSearchParams({
          query: slug,
          page: "1",
          count: "1",
          locale: client.locale,
          sc: client.salesChannel,
        });
        const isResult = await client.searchProducts(params);
        const product = isResult.products?.[0];

        if (product) {
          return {
            "@type": "ProductDetailsPage",
            breadcrumbList: {
              items: [
                { name: "Home", url: "/", position: 0 },
                ...(product.categories || []).map((cat: string, i: number) => ({
                  name: cat.split("/").filter(Boolean).pop() || cat,
                  url: cat,
                  position: i + 1,
                })),
                { name: product.productName, url: `/${product.linkText}/p`, position: 99 },
              ],
            },
            product: mapProductIS(product, baseUrl, currency),
            seo: {
              title: product.productTitle || product.productName,
              description: product.metaTagDescription || product.description || "",
            },
          };
        }

        // Fallback to Catalog System
        const catalogProducts = await client.catalogSearch(`/${slug}/p`);
        if (catalogProducts.length === 0) return null;

        const raw = catalogProducts[0];
        return {
          "@type": "ProductDetailsPage",
          breadcrumbList: {
            items: [
              { name: "Home", url: "/", position: 0 },
              { name: raw.productName, url: `/${raw.linkText}/p`, position: 1 },
            ],
          },
          product: mapProductVTEX(raw, baseUrl, currency),
          seo: {
            title: raw.productTitle || raw.productName,
            description: raw.metaTagDescription || raw.description || "",
          },
        };
      } catch {
        return null;
      }
    },

    async searchProducts(params): Promise<ProductListingPage> {
      const page = params.page || 1;
      const limit = params.limit || 20;

      try {
        // Intelligent Search
        const sp = new URLSearchParams({
          page: String(page),
          count: String(limit),
          locale: client.locale,
          sc: client.salesChannel,
        });

        if (params.query) sp.set("query", params.query);
        if (params.sort) sp.set("sort", params.sort);
        if (params.category) sp.set("query", params.category);

        // Apply filters
        if (params.filters) {
          for (const [key, values] of Object.entries(params.filters)) {
            for (const value of values) {
              sp.append("fq", `${key}:${value}`);
            }
          }
        }

        const result = await client.searchProducts(sp);
        const products = (result.products || []).map((p: any) => mapProductIS(p, baseUrl, currency));
        const total = result.pagination?.total || result.total || products.length;

        // Get facets
        let filters: Filter[] = [];
        try {
          const facetsUrl = `https://${config.account}.${config.environment || "vtexcommercestable.com.br"}/api/io/_v/api/intelligent-search/facets/?${sp}`;
          const facetsRes = await fetch(facetsUrl, { headers: { Accept: "application/json" } });
          if (facetsRes.ok) {
            const facetsData = await facetsRes.json();
            filters = mapFilters(facetsData.facets || []);
          }
        } catch { /* facets are optional */ }

        return {
          "@type": "ProductListingPage",
          breadcrumb: { items: params.category ? [{ name: params.category, url: `/${params.category}`, position: 1 }] : [] },
          filters,
          products,
          pageInfo: {
            currentPage: page,
            records: total,
            recordsPerPage: limit,
            totalPages: Math.ceil(total / limit),
            nextPage: page * limit < total ? String(page + 1) : undefined,
            previousPage: page > 1 ? String(page - 1) : undefined,
          },
          sortOptions: SORT_OPTIONS,
          seo: params.query ? { title: `Busca: ${params.query}`, description: `Resultados para "${params.query}"` } : undefined,
        };
      } catch {
        // Fallback to Catalog System
        const sp = new URLSearchParams();
        if (params.query) sp.set("ft", params.query);
        sp.set("_from", String((page - 1) * limit));
        sp.set("_to", String(page * limit - 1));
        if (params.sort) sp.set("O", params.sort);
        sp.set("sc", client.salesChannel);

        const path = params.category ? `/${params.category}` : "";
        const products = await client.catalogSearch(path, sp);

        return {
          "@type": "ProductListingPage",
          breadcrumb: { items: [] },
          filters: [],
          products: products.map((p: any) => mapProductVTEX(p, baseUrl, currency)),
          pageInfo: { currentPage: page, recordsPerPage: limit, records: products.length },
          sortOptions: SORT_OPTIONS,
        };
      }
    },

    async getProductList(params): Promise<Product[]> {
      const ids = params.ids || params.skus || [];
      if (ids.length === 0) return [];

      try {
        // Try by SKU IDs
        const fq = ids.map((id) => `skuId:${id}`).join("&fq=");
        const products = await client.catalogSearch(`?fq=${fq}`);
        return products.map((p: any) => mapProductVTEX(p, baseUrl, currency));
      } catch {
        return [];
      }
    },

    async getCart(cartId): Promise<Cart | null> {
      if (!cartId) return null;
      try {
        const orderForm = await client.getOrderForm(cartId);
        return mapCart(orderForm);
      } catch {
        return null;
      }
    },

    async addToCart(cartId, items): Promise<Cart> {
      const orderForm = await client.addToCart(
        cartId,
        items.map((i) => ({ id: i.sku, quantity: i.quantity, seller: "1" })),
      );
      return mapCart(orderForm);
    },

    async updateCartItem(cartId, sku, quantity): Promise<Cart> {
      // Find item index first
      const currentCart = await client.getOrderForm(cartId);
      const index = currentCart.items?.findIndex((item: any) => item.id === sku);
      if (index === undefined || index === -1) return mapCart(currentCart);

      const orderForm = await client.updateItems(cartId, [{ index, quantity }]);
      return mapCart(orderForm);
    },

    async removeCartItem(cartId, sku): Promise<Cart> {
      return this.updateCartItem(cartId, sku, 0);
    },

    async getSuggestions(query): Promise<Suggestion[]> {
      try {
        const data = await client.suggestions(query);
        return (data.searches || []).map((s: any) => ({
          term: s.term,
          href: `/busca?q=${encodeURIComponent(s.term)}`,
          hits: s.count,
        }));
      } catch {
        return [];
      }
    },
  };
}
