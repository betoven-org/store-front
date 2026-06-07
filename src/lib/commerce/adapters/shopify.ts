/**
 * Shopify Commerce Adapter
 *
 * Connects to Shopify Storefront API (GraphQL).
 * Config: SHOPIFY_STORE, SHOPIFY_STOREFRONT_TOKEN
 */

import type {
  CommerceAdapter, Product, ProductListingPage, ProductDetailsPage,
  Cart, Suggestion, ImageObject, AggregateOffer,
} from "../types";

export interface ShopifyConfig {
  store: string;
  storefrontToken: string;
  apiVersion?: string;
}

async function storefront(config: ShopifyConfig, query: string, variables?: Record<string, any>) {
  const version = config.apiVersion || "2024-01";
  const res = await fetch(
    `https://${config.store}.myshopify.com/api/${version}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontToken,
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!res.ok) throw new Error(`Shopify API ${res.status}`);
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors[0].message);
  return data;
}

function mapProduct(node: any): Product {
  const variant = node.variants?.edges?.[0]?.node;
  const images: ImageObject[] = (node.images?.edges || []).map((e: any) => ({
    url: e.node.url, alt: e.node.altText || node.title, width: e.node.width, height: e.node.height,
  }));

  const price = Number(variant?.price?.amount || 0);
  const compareAt = Number(variant?.compareAtPrice?.amount || price);

  const offers: AggregateOffer = {
    lowPrice: price,
    highPrice: compareAt,
    offerCount: 1,
    offers: [{
      seller: "shopify",
      price,
      listPrice: compareAt,
      currency: variant?.price?.currencyCode || "BRL",
      availability: variant?.availableForSale ? "InStock" : "OutOfStock",
    }],
  };

  return {
    "@type": "Product",
    productID: node.id,
    sku: variant?.sku || node.id,
    name: node.title,
    description: node.description,
    url: `/products/${node.handle}`,
    image: images,
    brand: node.vendor ? { name: node.vendor } : undefined,
    category: node.productType || undefined,
    offers,
  };
}

const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id handle title description vendor productType
    images(first: 5) { edges { node { url altText width height } } }
    variants(first: 1) { edges { node { id sku availableForSale price { amount currencyCode } compareAtPrice { amount currencyCode } } } }
  }
`;

export function createShopifyAdapter(config: ShopifyConfig): CommerceAdapter {
  return {
    platform: "shopify",

    async getProduct(slug): Promise<ProductDetailsPage | null> {
      const data = await storefront(config, `
        ${PRODUCT_FRAGMENT}
        query ($handle: String!) { product(handle: $handle) { ...ProductFields } }
      `, { handle: slug });

      if (!data.product) return null;
      return {
        "@type": "ProductDetailsPage",
        breadcrumbList: { items: [{ name: data.product.title, url: `/products/${slug}`, position: 1 }] },
        product: mapProduct(data.product),
      };
    },

    async searchProducts(params): Promise<ProductListingPage> {
      const limit = params.limit || 20;
      const query = params.query || "";
      const sortKey = params.sort || "RELEVANCE";

      const data = await storefront(config, `
        ${PRODUCT_FRAGMENT}
        query ($query: String!, $first: Int!, $sortKey: ProductSortKeys) {
          search(query: $query, first: $first, types: PRODUCT, sortKey: $sortKey) {
            edges { node { ... on Product { ...ProductFields } } }
            totalCount
          }
        }
      `, { query, first: limit, sortKey });

      const products = (data.search?.edges || []).map((e: any) => mapProduct(e.node));

      return {
        "@type": "ProductListingPage",
        breadcrumb: { items: [] },
        filters: [],
        products,
        pageInfo: { currentPage: params.page || 1, records: data.search?.totalCount || 0, recordsPerPage: limit },
        sortOptions: [
          { label: "Relevância", value: "RELEVANCE" },
          { label: "Menor preço", value: "PRICE" },
          { label: "Mais recentes", value: "CREATED_AT" },
          { label: "Mais vendidos", value: "BEST_SELLING" },
        ],
      };
    },

    async getProductList(params): Promise<Product[]> {
      const ids = params.ids || [];
      if (ids.length === 0) return [];
      const gqlIds = ids.map((id) => id.includes("gid://") ? id : `gid://shopify/Product/${id}`);
      const data = await storefront(config, `
        ${PRODUCT_FRAGMENT}
        query ($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { ...ProductFields } } }
      `, { ids: gqlIds });
      return (data.nodes || []).filter(Boolean).map(mapProduct);
    },

    async getCart(cartId): Promise<Cart | null> {
      if (!cartId) return null;
      const data = await storefront(config, `
        query ($id: ID!) {
          cart(id: $id) {
            lines(first: 50) { edges { node { id quantity merchandise { ... on ProductVariant { id sku title price { amount currencyCode } image { url } product { title handle } } } } } }
            cost { totalAmount { amount currencyCode } subtotalAmount { amount } }
          }
        }
      `, { id: cartId });

      if (!data.cart) return null;
      return {
        items: (data.cart.lines?.edges || []).map((e: any) => ({
          productID: e.node.merchandise.product?.handle || "",
          sku: e.node.merchandise.sku || e.node.merchandise.id,
          name: e.node.merchandise.product?.title || e.node.merchandise.title,
          image: e.node.merchandise.image?.url,
          price: Number(e.node.merchandise.price.amount),
          quantity: e.node.quantity,
        })),
        total: Number(data.cart.cost.totalAmount.amount),
        subtotal: Number(data.cart.cost.subtotalAmount.amount),
        currency: data.cart.cost.totalAmount.currencyCode || "BRL",
      };
    },

    async addToCart(cartId, items): Promise<Cart> {
      const lines = items.map((i) => ({ merchandiseId: i.sku, quantity: i.quantity }));
      await storefront(config, `
        mutation ($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { id } } }
      `, { cartId, lines });
      return (await this.getCart(cartId))!;
    },

    async updateCartItem(cartId, sku, quantity): Promise<Cart> {
      return this.addToCart(cartId, [{ sku, quantity }]);
    },

    async removeCartItem(cartId, sku): Promise<Cart> {
      return this.updateCartItem(cartId, sku, 0);
    },

    async getSuggestions(query): Promise<Suggestion[]> {
      const data = await storefront(config, `
        query ($query: String!) { search(query: $query, first: 5, types: PRODUCT) { edges { node { ... on Product { title handle } } } } }
      `, { query });
      return (data.search?.edges || []).map((e: any) => ({ term: e.node.title, href: `/products/${e.node.handle}` }));
    },
  };
}
