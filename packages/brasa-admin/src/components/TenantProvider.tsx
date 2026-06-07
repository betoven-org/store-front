"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type TenantInfo = {
  id: number;
  slug: string;
  name: string;
  domain: string | null;
  frontendUrl: string | null;
  previewUrl: string | null;
  revalidateSecret: string | null;
};

type TenantCtxValue = {
  tenant: TenantInfo | null;
  refetch: () => void;
};

const TenantCtx = createContext<TenantCtxValue>({ tenant: null, refetch: () => {} });

export function useTenant() {
  const ctx = useContext(TenantCtx);
  return ctx.tenant;
}

export function useTenantRefetch() {
  return useContext(TenantCtx).refetch;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);

  const refetch = useCallback(() => {
    fetch("/api/admin/tenant-info")
      .then((r) => (r.ok ? r.json() : null))
      .then(setTenant)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return <TenantCtx.Provider value={{ tenant, refetch }}>{children}</TenantCtx.Provider>;
}
