"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AdminShell, BrasaLoader } from "@brasa/admin";

type Integration = {
  key: string;
  name: string;
  description: string;
  category: string;
  envVars: string[];
  docsUrl?: string;
};

const INTEGRATIONS: Integration[] = [
  {
    key: "openai",
    name: "OpenAI (AI Assistant)",
    description: "Geração de texto, meta descriptions, resumos e reescrita automática com IA.",
    category: "AI",
    envVars: ["OPENAI_API_KEY"],
  },
  {
    key: "unsplash",
    name: "Unsplash",
    description: "Banco de imagens stock gratuito. Busque e use imagens direto na media library.",
    category: "Media",
    envVars: ["UNSPLASH_ACCESS_KEY"],
  },
  {
    key: "resend",
    name: "Resend",
    description: "Emails transacionais — welcome, avisos de pagamento, notificações.",
    category: "Email",
    envVars: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  },
  {
    key: "slack",
    name: "Slack",
    description: "Notificações no Slack quando publica páginas, novos leads ou erros.",
    category: "Comunicação",
    envVars: ["SLACK_WEBHOOK_URL"],
  },
  {
    key: "algolia",
    name: "Algolia",
    description: "Search profissional com autocomplete, facets e relevância customizada.",
    category: "Search",
    envVars: ["ALGOLIA_APP_ID", "ALGOLIA_API_KEY", "ALGOLIA_INDEX"],
  },
  {
    key: "typesense",
    name: "Typesense",
    description: "Search open source ultrarrápido. Alternativa gratuita ao Algolia.",
    category: "Search",
    envVars: ["TYPESENSE_HOST", "TYPESENSE_API_KEY", "TYPESENSE_COLLECTION"],
  },
  {
    key: "posthog",
    name: "PostHog",
    description: "Analytics, session replay, funnels e feature flags. Alternativa ao GA4.",
    category: "Analytics",
    envVars: ["POSTHOG_API_KEY", "POSTHOG_HOST"],
  },
  {
    key: "stripe",
    name: "Stripe",
    description: "Billing e assinaturas. Já integrado no sistema de cobrança do CMS.",
    category: "Pagamentos",
    envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  },
];

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
      configured ? "bg-success-bg text-success" : "bg-muted text-muted-foreground"
    }`}>
      {configured ? "Configurado" : "Não configurado"}
    </span>
  );
}

export default function IntegracoesPage() {
  const [testing, setTesting] = useState<string | null>(null);

  async function testIntegration(key: string) {
    setTesting(key);
    try {
      let res: Response;
      switch (key) {
        case "openai":
          res = await fetch("/api/admin/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "Diga apenas: OK", mode: "write" }),
          });
          break;
        case "unsplash":
          res = await fetch("/api/admin/integrations/unsplash?q=test&per_page=1");
          break;
        case "slack":
          res = await fetch("/api/admin/integrations/slack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "Teste de conexão — Brasa CMS" }),
          });
          break;
        case "algolia":
        case "typesense":
          res = await fetch("/api/admin/integrations/search", { method: "POST" });
          break;
        default:
          toast.error("Teste não disponível para esta integração");
          return;
      }

      if (res.ok) {
        toast.success(`${key} funcionando`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Erro ${res.status}`);
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setTesting(null);
    }
  }

  // Group by category
  const grouped = new Map<string, Integration[]>();
  for (const int of INTEGRATIONS) {
    if (!grouped.has(int.category)) grouped.set(int.category, []);
    grouped.get(int.category)!.push(int);
  }

  return (
    <AdminShell title="Integrações">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Conecte serviços externos ao CMS. Configure as env vars na Vercel e teste aqui.
          </p>
        </div>

        {Array.from(grouped.entries()).map(([category, integrations]) => (
          <section key={category}>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {category}
            </h2>
            <div className="space-y-2">
              {integrations.map((int) => (
                <div
                  key={int.key}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{int.name}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{int.description}</p>
                    <p className="mt-1 text-[10px] font-mono text-muted-foreground/60">
                      {int.envVars.join(" + ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => testIntegration(int.key)}
                      disabled={testing === int.key}
                      className="rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                      {testing === int.key ? <BrasaLoader size="sm" /> : "Testar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
