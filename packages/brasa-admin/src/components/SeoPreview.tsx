"use client";

import { useState } from "react";

type SeoData = {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  url?: string;
  siteName?: string;
};

type Tab = "google" | "facebook" | "twitter" | "linkedin" | "whatsapp";

const tabs: { key: Tab; label: string }[] = [
  { key: "google", label: "Google" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "Twitter" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "whatsapp", label: "WhatsApp" },
];

function CharCount({ current, max }: { current: number; max: number }) {
  const over = current > max;
  return (
    <span className={`text-[10px] tabular-nums ${over ? "text-destructive font-medium" : "text-muted-foreground"}`}>
      {current}/{max}
    </span>
  );
}

function GooglePreview({ data }: { data: SeoData }) {
  const title = data.metaTitle || data.title || "Titulo da pagina";
  const desc = data.metaDescription || "Adicione uma meta description para melhorar o SEO.";
  const url = data.url || "exemplo.com.br";

  return (
    <div className="space-y-1">
      {/* Favicon + breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="w-[26px] h-[26px] rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] text-foreground truncate leading-tight">{data.siteName || "Meu Site"}</p>
          <p className="text-[11px] text-muted-foreground truncate leading-tight">{url}</p>
        </div>
      </div>
      {/* Title */}
      <p className="text-[18px] leading-snug font-normal text-[#1a0dab] hover:underline cursor-pointer line-clamp-2">
        {title}
      </p>
      {/* Description */}
      <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
        {desc}
      </p>
      {/* Char counts */}
      <div className="flex gap-3 pt-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Titulo:</span>
          <CharCount current={(data.metaTitle || "").length} max={60} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Descricao:</span>
          <CharCount current={(data.metaDescription || "").length} max={160} />
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({ data }: { data: SeoData }) {
  const title = data.ogTitle || data.metaTitle || data.title || "Titulo da pagina";
  const desc = data.ogDescription || data.metaDescription || "Adicione uma descricao para redes sociais.";
  const url = data.url || "exemplo.com.br";
  const image = data.ogImage;

  return (
    <div className="rounded-md border border-border overflow-hidden bg-[#f0f2f5]">
      {/* Image */}
      {image ? (
        <div className="w-full aspect-[1.91/1] bg-muted relative">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[1.91/1] bg-muted flex items-center justify-center">
          <div className="text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40 mx-auto" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <p className="text-[10px] text-muted-foreground/40 mt-1">OG Image (1200x630)</p>
          </div>
        </div>
      )}
      {/* Content */}
      <div className="px-3 py-2.5 space-y-0.5 bg-[#f0f2f5]">
        <p className="text-[11px] text-[#606770] uppercase tracking-wide truncate">{url}</p>
        <p className="text-[15px] font-semibold text-[#1d2129] leading-snug line-clamp-2">{title}</p>
        <p className="text-[13px] text-[#606770] line-clamp-2 leading-snug">{desc}</p>
      </div>
    </div>
  );
}

function TwitterPreview({ data }: { data: SeoData }) {
  const title = data.ogTitle || data.metaTitle || data.title || "Titulo da pagina";
  const desc = data.ogDescription || data.metaDescription || "Adicione uma descricao para redes sociais.";
  const url = data.url || "exemplo.com.br";
  const image = data.ogImage;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Image */}
      {image ? (
        <div className="w-full aspect-[2/1] bg-muted relative">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[2/1] bg-muted flex items-center justify-center">
          <div className="text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40 mx-auto" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <p className="text-[10px] text-muted-foreground/40 mt-1">OG Image (1200x600)</p>
          </div>
        </div>
      )}
      {/* Content */}
      <div className="px-3 py-2.5 space-y-0.5 border-t border-border">
        <p className="text-[15px] font-bold text-foreground leading-snug line-clamp-1">{title}</p>
        <p className="text-[13px] text-muted-foreground line-clamp-2 leading-snug">{desc}</p>
        <p className="text-[12px] text-muted-foreground/70 truncate flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {url}
        </p>
      </div>
    </div>
  );
}

function LinkedInPreview({ data }: { data: SeoData }) {
  const title = data.ogTitle || data.metaTitle || data.title || "Titulo da pagina";
  const desc = data.ogDescription || data.metaDescription || "";
  const url = data.url || "exemplo.com.br";
  const image = data.ogImage;

  return (
    <div className="rounded-md border border-border overflow-hidden">
      {/* Image */}
      {image ? (
        <div className="w-full aspect-[1.91/1] bg-muted relative">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[1.91/1] bg-muted flex items-center justify-center">
          <div className="text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40 mx-auto" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <p className="text-[10px] text-muted-foreground/40 mt-1">OG Image (1200x627)</p>
          </div>
        </div>
      )}
      {/* Content */}
      <div className="px-3 py-2.5 space-y-0.5 bg-[#f3f2ef] border-t border-border">
        <p className="text-[14px] font-semibold text-foreground leading-snug line-clamp-2">{title}</p>
        {desc && <p className="text-[12px] text-muted-foreground line-clamp-2 leading-snug">{desc}</p>}
        <p className="text-[11px] text-muted-foreground/70 truncate">{url}</p>
      </div>
    </div>
  );
}

function WhatsAppPreview({ data }: { data: SeoData }) {
  const title = data.ogTitle || data.metaTitle || data.title || "Titulo da pagina";
  const desc = data.ogDescription || data.metaDescription || "";
  const url = data.url || "exemplo.com.br";
  const image = data.ogImage;

  return (
    <div className="max-w-[280px]">
      {/* Chat bubble */}
      <div className="rounded-lg overflow-hidden border border-border bg-[#dcf8c6] shadow-sm">
        {/* Link preview card */}
        <div className="mx-1 mt-1 rounded-md overflow-hidden bg-[#d5edcd]">
          {image ? (
            <div className="w-full aspect-[1.91/1] bg-muted relative">
              <img src={image} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full h-16 bg-muted/50 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/30" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          )}
          <div className="px-2 py-1.5 space-y-0.5">
            <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">{title}</p>
            {desc && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{desc}</p>}
            <p className="text-[10px] text-muted-foreground/60 truncate">{url}</p>
          </div>
        </div>
        {/* URL message */}
        <div className="px-2 py-1 flex items-end justify-between gap-2">
          <p className="text-[13px] text-[#039be5] truncate flex-1">{url}</p>
          <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">12:00</span>
        </div>
      </div>
    </div>
  );
}

const previewComponents: Record<Tab, React.FC<{ data: SeoData }>> = {
  google: GooglePreview,
  facebook: FacebookPreview,
  twitter: TwitterPreview,
  linkedin: LinkedInPreview,
  whatsapp: WhatsAppPreview,
};

export default function SeoPreview({ data }: { data: SeoData }) {
  const [activeTab, setActiveTab] = useState<Tab>("google");
  const Preview = previewComponents[activeTab];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 rounded-md bg-muted/50 p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <Preview data={data} />
    </div>
  );
}
