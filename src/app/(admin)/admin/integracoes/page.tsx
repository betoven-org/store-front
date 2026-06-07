"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminShell, BrasaLoader } from "@brasa/admin";

type IntegrationType = "included" | "client-key" | "commerce";

type Integration = {
  key: string;
  name: string;
  description: string;
  category: string;
  type: IntegrationType;
  pricing?: string;
  limit?: string;
  fields?: { key: string; label: string; placeholder: string; secret?: boolean }[];
};

const INTEGRATIONS: Integration[] = [
  // Included (global — gerenciado pelo CMS, sem config do tenant)
  {
    key: "ai",
    name: "AI Assistant",
    description: "Gere textos, meta descriptions, resumos e reescrita com inteligência artificial.",
    category: "Incluído no plano",
    type: "included",
    pricing: "50 créditos grátis",
    limit: "1 crédito por geração · Compre mais em Assinaturas",
  },
  {
    key: "unsplash",
    name: "Imagens Stock",
    description: "Banco de imagens gratuito integrado na biblioteca de mídias.",
    category: "Incluído no plano",
    type: "included",
    pricing: "Gratuito",
    limit: "Ilimitado",
  },
  {
    key: "search",
    name: "Busca inteligente",
    description: "Busca fulltext em posts e produtos com autocomplete.",
    category: "Incluído no plano",
    type: "included",
    pricing: "Gratuito",
    limit: "Ilimitado",
  },
  {
    key: "email",
    name: "Emails transacionais",
    description: "Welcome, avisos de pagamento e notificações enviados automaticamente.",
    category: "Incluído no plano",
    type: "included",
    pricing: "Gratuito",
    limit: "100 emails/dia",
  },
  {
    key: "analytics",
    name: "Analytics",
    description: "Métricas de requisições, pageviews e performance integradas ao painel.",
    category: "Incluído no plano",
    type: "included",
    pricing: "Gratuito",
    limit: "Ilimitado",
  },

  // Client-key (tenant configura sua conta)
  {
    key: "slack",
    name: "Slack",
    description: "Receba notificações no Slack quando publicar, receber leads ou erros.",
    category: "Comunicação",
    type: "client-key",
    pricing: "Gratuito",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." },
    ],
  },
  {
    key: "posthog",
    name: "PostHog",
    description: "Analytics avançado com session replay, funnels e feature flags. Complementa o analytics interno.",
    category: "Analytics avançado",
    type: "client-key",
    pricing: "Plano free: 1M eventos/mês",
    fields: [
      { key: "apiKey", label: "Project API Key", placeholder: "phc_...", secret: true },
      { key: "host", label: "Host", placeholder: "https://app.posthog.com" },
    ],
  },

  // Commerce (tenant configura sua plataforma)
  {
    key: "vtex",
    name: "VTEX",
    description: "Conecte seu catálogo VTEX — produtos, preços, estoque e carrinho.",
    category: "E-commerce",
    type: "commerce",
    fields: [
      { key: "account", label: "Account name", placeholder: "minhaloja" },
      { key: "environment", label: "Environment", placeholder: "vtexcommercestable.com.br" },
      { key: "salesChannel", label: "Sales Channel", placeholder: "1" },
    ],
  },
  {
    key: "shopify",
    name: "Shopify",
    description: "Conecte sua loja Shopify — produtos, variantes e carrinho via Storefront API.",
    category: "E-commerce",
    type: "commerce",
    fields: [
      { key: "store", label: "Store handle", placeholder: "minha-loja" },
      { key: "storefrontToken", label: "Storefront Access Token", placeholder: "shpat_...", secret: true },
    ],
  },
  {
    key: "nuvemshop",
    name: "Nuvemshop",
    description: "Conecte sua Nuvemshop — produtos, categorias e estoque.",
    category: "E-commerce",
    type: "commerce",
    fields: [
      { key: "storeId", label: "Store ID", placeholder: "1234567" },
      { key: "accessToken", label: "Access Token", placeholder: "...", secret: true },
    ],
  },
  {
    key: "wake",
    name: "Wake",
    description: "Conecte sua loja Wake (Tray Commerce) — catálogo e busca via GraphQL.",
    category: "E-commerce",
    type: "commerce",
    fields: [
      { key: "storeUrl", label: "Store URL", placeholder: "https://minhaloja.wake.store" },
      { key: "token", label: "API Token", placeholder: "...", secret: true },
    ],
  },
  {
    key: "vnda",
    name: "VNDA",
    description: "Conecte sua loja VNDA — produtos, busca e catálogo.",
    category: "E-commerce",
    type: "commerce",
    fields: [
      { key: "domain", label: "Domínio", placeholder: "minhaloja.vnda.com.br" },
      { key: "token", label: "API Token", placeholder: "...", secret: true },
    ],
  },
  {
    key: "linx",
    name: "Linx Commerce",
    description: "Conecte sua loja Linx — catálogo, busca e produtos.",
    category: "E-commerce",
    type: "commerce",
    fields: [
      { key: "storeId", label: "Store ID", placeholder: "..." },
      { key: "apiKey", label: "API Key", placeholder: "...", secret: true },
    ],
  },
];

export default function IntegracoesPage() {
  const [configs, setConfigs] = useState<Record<string, { enabled: boolean; config: Record<string, string> }>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/integrations/config")
      .then((res) => res.json())
      .then(setConfigs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openConfig(int: Integration) {
    const existing = configs[int.key]?.config || {};
    setFormValues(existing);
    setEditing(int.key);
  }

  async function saveConfig(int: Integration) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/integrations/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: int.key, config: formValues, enabled: true }),
      });
      if (!res.ok) throw new Error();
      setConfigs((prev) => ({ ...prev, [int.key]: { enabled: true, config: formValues } }));
      setEditing(null);
      toast.success(`${int.name} habilitado`);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function disableIntegration(key: string) {
    try {
      await fetch("/api/admin/integrations/config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: key }),
      });
      setConfigs((prev) => { const n = { ...prev }; delete n[key]; return n; });
      toast.success("Desabilitado");
    } catch {
      toast.error("Erro");
    }
  }

  if (loading) {
    return <AdminShell title="Integrações"><div className="flex justify-center py-16"><BrasaLoader text="Carregando..." /></div></AdminShell>;
  }

  // Group
  const groups = new Map<string, Integration[]>();
  for (const int of INTEGRATIONS) {
    const cat = int.category;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(int);
  }

  return (
    <AdminShell title="Integrações">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Marketplace de Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Habilite serviços extras para potencializar seu site. Integrações inclusas no plano funcionam sem configuração.
          </p>
        </div>

        {Array.from(groups.entries()).map(([category, integrations]) => (
          <section key={category}>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {category}
            </h2>
            <div className="space-y-2">
              {integrations.map((int) => {
                const isEnabled = int.type === "included" || !!configs[int.key]?.enabled;
                const isEditing = editing === int.key;

                return (
                  <div key={int.key} className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{int.name}</p>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isEnabled ? "bg-success-bg text-success" : "bg-muted text-muted-foreground"
                          }`}>
                            {isEnabled ? "Habilitado" : "Desabilitado"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{int.description}</p>
                        {int.pricing && (
                          <p className="mt-1 text-[10px] text-muted-foreground/70">
                            {int.pricing}{int.limit ? ` · ${int.limit}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {int.type === "included" ? (
                          <span className="text-[11px] font-medium text-success">Ativo</span>
                        ) : isEnabled ? (
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => openConfig(int)} className="rounded-md border border-border px-3 py-1.5 text-[11px] font-medium hover:bg-muted transition-colors">
                              Configurar
                            </button>
                            <button type="button" onClick={() => disableIntegration(int.key)} className="rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-destructive hover:bg-danger-bg transition-colors">
                              Desabilitar
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => openConfig(int)} className="rounded-md bg-foreground text-background px-3 py-1.5 text-[11px] font-medium hover:brightness-[0.97] transition-colors">
                            Habilitar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Config form */}
                    {isEditing && int.fields && (
                      <div className="border-t border-border bg-muted/30 px-4 py-4 space-y-3">
                        {int.fields.map((field) => (
                          <div key={field.key}>
                            <label className="block text-[11px] font-medium text-foreground mb-1">{field.label}</label>
                            <input
                              type={field.secret ? "password" : "text"}
                              value={formValues[field.key] || ""}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => saveConfig(int)}
                            disabled={saving}
                            className="rounded-md bg-foreground text-background px-4 py-1.5 text-xs font-medium hover:brightness-[0.97] disabled:opacity-50"
                          >
                            {saving ? <BrasaLoader size="sm" /> : "Salvar e habilitar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
