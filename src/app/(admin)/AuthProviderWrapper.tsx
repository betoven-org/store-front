"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      onSessionChange={router.refresh}
      Link={Link}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
