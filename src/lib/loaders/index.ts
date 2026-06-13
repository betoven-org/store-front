import type { LoaderFn } from "./types";
import { loadPosts } from "./loadPosts";
import { loadCategories } from "./loadCategories";
import { loadProducts } from "./loadProducts";
import { loadCollectionItems } from "./loadCollectionItems";

export type { LoaderFn, LoaderContext, LoaderResult } from "./types";

export const loaderRegistry: Record<string, LoaderFn> = {
  loadPosts,
  loadCategories,
  loadProducts,
  loadCollectionItems,
};
