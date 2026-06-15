/**
 * JSON-LD Structured Data generator for SEO.
 * Generates schema.org JSON-LD for common content types.
 * Inspired by deco apps/website/components/Seo.tsx (Apache-2.0).
 *
 * Usage:
 *   import { generateJsonLd } from "@/lib/json-ld";
 *   const ld = generateJsonLd.article({ title, author, publishedAt, ... });
 *   // Inject in <head>: <script type="application/ld+json">{JSON.stringify(ld)}</script>
 */

type ArticleInput = {
  title: string;
  description?: string;
  url: string;
  image?: string;
  authorName?: string;
  authorUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  siteName?: string;
  siteUrl?: string;
};

type ProductInput = {
  name: string;
  description?: string;
  url: string;
  image?: string;
  price?: number;
  currency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  brand?: string;
  sku?: string;
  ratingValue?: number;
  reviewCount?: number;
};

type BreadcrumbItem = {
  name: string;
  url: string;
};

type FAQItem = {
  question: string;
  answer: string;
};

type OrganizationInput = {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
};

type WebSiteInput = {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
};

export const generateJsonLd = {
  article(input: ArticleInput) {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: input.title,
      description: input.description,
      url: input.url,
      image: input.image,
      datePublished: input.publishedAt,
      dateModified: input.updatedAt || input.publishedAt,
      author: input.authorName
        ? {
            "@type": "Person",
            name: input.authorName,
            url: input.authorUrl,
          }
        : undefined,
      publisher: input.siteName
        ? {
            "@type": "Organization",
            name: input.siteName,
            url: input.siteUrl,
          }
        : undefined,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": input.url,
      },
    };
  },

  product(input: ProductInput) {
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: input.name,
      description: input.description,
      url: input.url,
      image: input.image,
      sku: input.sku,
      brand: input.brand
        ? { "@type": "Brand", name: input.brand }
        : undefined,
    };

    if (input.price !== undefined) {
      ld.offers = {
        "@type": "Offer",
        price: input.price,
        priceCurrency: input.currency || "BRL",
        availability: `https://schema.org/${input.availability || "InStock"}`,
        url: input.url,
      };
    }

    if (input.ratingValue && input.reviewCount) {
      ld.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: input.ratingValue,
        reviewCount: input.reviewCount,
      };
    }

    return ld;
  },

  breadcrumb(items: BreadcrumbItem[]) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    };
  },

  faq(items: FAQItem[]) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    };
  },

  organization(input: OrganizationInput) {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: input.name,
      url: input.url,
      logo: input.logo,
      description: input.description,
      sameAs: input.sameAs,
    };
  },

  website(input: WebSiteInput) {
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: input.name,
      url: input.url,
      description: input.description,
    };

    if (input.searchUrl) {
      ld.potentialAction = {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: input.searchUrl,
        },
        "query-input": "required name=search_term_string",
      };
    }

    return ld;
  },

  /** Generate multiple JSON-LD blocks as a single script tag content */
  toScript(...schemas: Record<string, unknown>[]): string {
    if (schemas.length === 1) return JSON.stringify(schemas[0]);
    return JSON.stringify(schemas);
  },
};
