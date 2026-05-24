"use client";

import { createContext, useContext, useState, useEffect } from "react";

type TenantInfo = {
  id: number;
  slug: string;
  name: string;
  domain: string | null;
  frontendUrl: string | null;
  revalidateSecret: string | null;
};

const TenantCtx = createContext<TenantInfo | null>(null);

export function useTenant() {
  return useContext(TenantCtx);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);

  useEffect(() => {
    fetch("/api/admin/tenant-info")
      .then((r) => (r.ok ? r.json() : null))
      .then(setTenant)
      .catch(() => {});
  }, []);

  return <TenantCtx.Provider value={tenant}>{children}</TenantCtx.Provider>;
}
