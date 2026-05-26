import { useState, useEffect } from "react";

export type MediaRelation = {
  id: number;
  url: string;
} | null;

export type Settings = {
  id?: number;
  siteName: string;
  siteDescription: string;
  logoId: number | null;
  faviconId: number | null;
  logo?: MediaRelation;
  favicon?: MediaRelation;
  whatsapp: string;
  facebook: string;
  instagram: string;
  youtube: string;
  footerText: string;
  copyrightText: string;
  newsletterTitle: string;
  newsletterDescription: string;
  newsletterConsent: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  privacyPolicy: string;
  robotsTxt: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseSyncEnabled: boolean;
};

const EMPTY_SETTINGS: Settings = {
  siteName: "",
  siteDescription: "",
  logoId: null,
  faviconId: null,
  whatsapp: "",
  facebook: "",
  instagram: "",
  youtube: "",
  footerText: "",
  copyrightText: "",
  newsletterTitle: "",
  newsletterDescription: "",
  newsletterConsent: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  privacyPolicy: "",
  robotsTxt: "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api",
  supabaseUrl: "",
  supabaseAnonKey: "",
  supabaseServiceRoleKey: "",
  supabaseSyncEnabled: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? "Erro ao carregar configurações");
        }
        const data: Settings | null = await res.json();
        if (data) {
          setSettings(data);
          if (data.logo?.url) setLogoPreview(data.logo.url);
          if (data.favicon?.url) setFaviconPreview(data.favicon.url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const target = e.target;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;

    setSettings((prev) => ({ ...prev, [target.name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Erro ao salvar configurações");
      }
      const updated: Settings = await res.json();
      setSettings(updated);
      if (updated.logo?.url) setLogoPreview(updated.logo.url);
      if (updated.favicon?.url) setFaviconPreview(updated.favicon.url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  function onLogoChange(id: number | null, url: string | null) {
    setSettings((prev) => ({ ...prev, logoId: id }));
    setLogoPreview(url);
  }

  function onFaviconChange(id: number | null, url: string | null) {
    setSettings((prev) => ({ ...prev, faviconId: id }));
    setFaviconPreview(url);
  }

  return {
    settings,
    setSettings,
    loading,
    saving,
    error,
    success,
    logoPreview,
    faviconPreview,
    handleChange,
    handleSave,
    onLogoChange,
    onFaviconChange,
  };
}
