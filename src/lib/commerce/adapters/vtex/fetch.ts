/**
 * Fetch utilities for VTEX adapter
 */

export const STALE = {
  next: { revalidate: 60 },
} as const;

export async function fetchSafe<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`VTEX fetch failed: ${res.status} ${url}`);
  }

  return res.json();
}

export async function fetchAPI<T>(
  account: string,
  path: string,
  init?: RequestInit,
  env = "vtexcommercestable.com.br",
): Promise<T> {
  return fetchSafe<T>(`https://${account}.${env}${path}`, init);
}
