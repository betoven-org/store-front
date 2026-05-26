import { Suspense } from "react";
import { Toaster } from "sonner";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AuthProviderWrapper } from "./AuthProviderWrapper";
import { TenantProvider } from "@brasa/admin";

export const dynamic = "force-dynamic";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} antialiased dark`} style={{ colorScheme: "dark" }}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-background font-sans text-foreground">
        <AuthProviderWrapper>
          <TenantProvider>
            <Suspense fallback={null}>{children}</Suspense>
            <Toaster position="bottom-right" richColors closeButton />
          </TenantProvider>
        </AuthProviderWrapper>
      </body>
    </html>
  );
}
