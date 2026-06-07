/**
 * VTEX API Client
 *
 * Central configuration and HTTP client for VTEX APIs.
 */

import { fetchAPI } from "./fetch";

export interface VtexClientConfig {
  account: string;
  environment?: string;
  salesChannel?: string;
  locale?: string;
  appKey?: string;
  appToken?: string;
}

export class VtexClient {
  private config: VtexClientConfig;
  private env: string;

  constructor(config: VtexClientConfig) {
    this.config = config;
    this.env = config.environment || "vtexcommercestable.com.br";
  }

  get account() { return this.config.account; }
  get salesChannel() { return this.config.salesChannel || "1"; }
  get locale() { return this.config.locale || "pt-BR"; }

  private authHeaders(): Record<string, string> {
    if (this.config.appKey && this.config.appToken) {
      return {
        "X-VTEX-API-AppKey": this.config.appKey,
        "X-VTEX-API-AppToken": this.config.appToken,
      };
    }
    return {};
  }

  // Intelligent Search
  async searchProducts(params: URLSearchParams): Promise<{ products: any[]; total: number; pagination: any }> {
    const url = `https://${this.account}.${this.env}/api/io/_v/api/intelligent-search/product_search/?${params}`;
    const res = await fetch(url, { headers: { Accept: "application/json", ...this.authHeaders() } });
    if (!res.ok) throw new Error(`VTEX IS ${res.status}`);
    return res.json();
  }

  // Catalog System (legacy)
  async catalogSearch(path: string, params?: URLSearchParams): Promise<any[]> {
    const url = `https://${this.account}.${this.env}/api/catalog_system/pub/products/search${path}${params ? `?${params}` : ""}`;
    const res = await fetch(url, { headers: { Accept: "application/json", ...this.authHeaders() } });
    if (!res.ok) return [];
    return res.json();
  }

  // Checkout (OrderForm)
  async getOrderForm(orderFormId: string): Promise<any> {
    return fetchAPI(this.account, `/api/checkout/pub/orderForm/${orderFormId}`, undefined, this.env);
  }

  async addToCart(orderFormId: string, items: { id: string; quantity: number; seller: string }[]): Promise<any> {
    return fetchAPI(this.account, `/api/checkout/pub/orderForm/${orderFormId}/items`, {
      method: "PATCH",
      body: JSON.stringify({ orderItems: items }),
    }, this.env);
  }

  async updateItems(orderFormId: string, items: { index: number; quantity: number }[]): Promise<any> {
    return fetchAPI(this.account, `/api/checkout/pub/orderForm/${orderFormId}/items/update`, {
      method: "POST",
      body: JSON.stringify({ orderItems: items }),
    }, this.env);
  }

  async removeItems(orderFormId: string, indexes: number[]): Promise<any> {
    const items = indexes.map((index) => ({ index, quantity: 0 }));
    return this.updateItems(orderFormId, items);
  }

  async setCoupon(orderFormId: string, coupon: string): Promise<any> {
    return fetchAPI(this.account, `/api/checkout/pub/orderForm/${orderFormId}/coupons`, {
      method: "POST",
      body: JSON.stringify({ text: coupon }),
    }, this.env);
  }

  async simulation(items: { id: string; quantity: number; seller: string }[], postalCode?: string, country = "BRA"): Promise<any> {
    return fetchAPI(this.account, `/api/checkout/pub/orderForms/simulation`, {
      method: "POST",
      body: JSON.stringify({
        items,
        ...(postalCode ? { postalCode, country } : {}),
      }),
    }, this.env);
  }

  // Suggestions / Autocomplete
  async suggestions(query: string): Promise<any> {
    const url = `https://${this.account}.${this.env}/api/io/_v/api/intelligent-search/search_suggestions?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { searches: [] };
    return res.json();
  }

  // Top searches
  async topSearches(): Promise<any> {
    const url = `https://${this.account}.${this.env}/api/io/_v/api/intelligent-search/top_searches`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { searches: [] };
    return res.json();
  }
}
