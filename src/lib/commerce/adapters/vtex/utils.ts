/**
 * VTEX adapter utilities
 */

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const DEFAULT_IMAGE = "https://placehold.co/600x600/e5e7eb/9ca3af?text=Sem+imagem";

export function formatRange(min: number, max: number, currency = "BRL"): string {
  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency });
  return `${fmt.format(min)} - ${fmt.format(max)}`;
}
