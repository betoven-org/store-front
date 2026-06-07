/**
 * Brasa CMS — Commerce Types (Schema.org compatible)
 *
 * Abstract types that all e-commerce adapters conform to.
 * Inspired by deco-cx/apps/commerce/types.ts
 */

export interface ImageObject {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface Brand {
  name: string;
  logo?: string;
  url?: string;
}

export interface UnitPriceSpecification {
  price: number;
  listPrice?: number;
  currency: string;
  availability: "InStock" | "OutOfStock" | "PreOrder";
  inventoryLevel?: number;
  priceValidUntil?: string;
}

export interface Offer {
  seller: string;
  price: number;
  listPrice?: number;
  currency: string;
  availability: "InStock" | "OutOfStock" | "PreOrder";
  installments?: { billingDuration: number; billingIncrement: number }[];
}

export interface AggregateOffer {
  lowPrice: number;
  highPrice: number;
  offerCount: number;
  offers: Offer[];
}

export interface PropertyValue {
  name: string;
  value: string;
  propertyID?: string;
}

export interface Review {
  author: string;
  datePublished: string;
  reviewRating: { ratingValue: number; bestRating?: number };
  reviewBody?: string;
}

export interface AggregateRating {
  ratingValue: number;
  ratingCount: number;
  reviewCount?: number;
}

export interface ProductVariant {
  productID: string;
  sku: string;
  name: string;
  url: string;
  image?: ImageObject[];
  offers?: AggregateOffer;
  additionalProperty?: PropertyValue[];
}

export interface Product {
  "@type": "Product";
  productID: string;
  sku: string;
  name: string;
  description?: string;
  url: string;
  image?: ImageObject[];
  brand?: Brand;
  category?: string;
  gtin?: string;
  offers?: AggregateOffer;
  additionalProperty?: PropertyValue[];
  aggregateRating?: AggregateRating;
  review?: Review[];
  isVariantOf?: {
    productGroupID: string;
    name: string;
    hasVariant: ProductVariant[];
    additionalProperty?: PropertyValue[];
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
  position: number;
}

export interface BreadcrumbList {
  items: BreadcrumbItem[];
}

export interface Filter {
  label: string;
  key: string;
  values: FilterValue[];
}

export interface FilterValue {
  label: string;
  value: string;
  quantity: number;
  selected: boolean;
  url?: string;
}

export interface SortOption {
  label: string;
  value: string;
}

export interface PageInfo {
  currentPage: number;
  nextPage?: string;
  previousPage?: string;
  totalPages?: number;
  records?: number;
  recordsPerPage?: number;
}

export interface ProductListingPage {
  "@type": "ProductListingPage";
  breadcrumb: BreadcrumbList;
  filters: Filter[];
  products: Product[];
  pageInfo: PageInfo;
  sortOptions: SortOption[];
  seo?: { title: string; description: string; canonical?: string };
}

export interface ProductDetailsPage {
  "@type": "ProductDetailsPage";
  breadcrumbList: BreadcrumbList;
  product: Product;
  seo?: { title: string; description: string; canonical?: string };
}

export interface CartItem {
  productID: string;
  sku: string;
  name: string;
  image?: string;
  price: number;
  listPrice?: number;
  quantity: number;
  url?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  subtotal: number;
  discounts?: number;
  coupon?: string;
  currency: string;
}

export interface Suggestion {
  term: string;
  href?: string;
  hits?: number;
}

/**
 * Commerce adapter interface — all platforms implement this.
 */
export interface CommerceAdapter {
  platform: string;

  // Products
  getProduct(slug: string): Promise<ProductDetailsPage | null>;
  searchProducts(params: {
    query?: string;
    category?: string;
    page?: number;
    limit?: number;
    sort?: string;
    filters?: Record<string, string[]>;
  }): Promise<ProductListingPage>;
  getProductList(params: { ids?: string[]; skus?: string[]; limit?: number }): Promise<Product[]>;

  // Cart
  getCart(cartId?: string): Promise<Cart | null>;
  addToCart(cartId: string, items: { sku: string; quantity: number }[]): Promise<Cart>;
  updateCartItem(cartId: string, sku: string, quantity: number): Promise<Cart>;
  removeCartItem(cartId: string, sku: string): Promise<Cart>;

  // Search
  getSuggestions(query: string): Promise<Suggestion[]>;
}
