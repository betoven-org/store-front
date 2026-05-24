import type { Metadata } from "next";
import { getSettings } from "@/lib/cms";
import { HeadScripts, BodyScripts } from "@/components/AnalyticsScripts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: {
      default: settings.seo.title ?? settings.siteName ?? "Brasa Starter",
      template: `%s | ${settings.siteName ?? "Brasa Starter"}`,
    },
    description: settings.seo.description ?? settings.siteDescription,
    icons: settings.favicon ? { icon: settings.favicon.url } : undefined,
    alternates: {
      types: { "application/rss+xml": "/feed.xml" },
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <html lang="pt-BR">
      <head>
        <HeadScripts settings={settings} />
      </head>
      <body className="antialiased">
        <BodyScripts settings={settings} />
        {children}
      </body>
    </html>
  );
}
