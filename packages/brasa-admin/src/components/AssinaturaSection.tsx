"use client";

import { useState, useEffect } from "react";

type SubscriptionData = {
  id: number;
  tenantId: number;
  status: "active" | "overdue" | "suspended";
  nextDueDate: string;
  graceDays: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
};

const STATUS_MAP: Record<
  SubscriptionData["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Ativa",
    className: "bg-success-bg text-success",
  },
  overdue: {
    label: "Inadimplente",
    className: "bg-warning-bg text-warning",
  },
  suspended: {
    label: "Suspensa",
    className: "bg-danger-bg text-destructive",
  },
};

function SpinnerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64ZM32,192V104H224v88Z" />
    </svg>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function AssinaturaSection() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch("/api/admin/subscription");
        if (!res.ok) {
          if (res.status === 404) {
            setSubscription(null);
            return;
          }
          throw new Error("Erro ao carregar dados da assinatura.");
        }
        const data = await res.json();
        setSubscription(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar assinatura.",
        );
      } finally {
        setLoading(false);
      }
    }
    fetchSubscription();
  }, []);

  async function handlePortal() {
    setPortalLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stripe/portal", { method: "POST" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || "Erro ao abrir portal de gerenciamento.",
        );
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("URL do portal nao retornada.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao abrir portal.",
      );
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerIcon className="h-8 w-8 text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma assinatura encontrada.
        </p>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[subscription.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCardIcon />
        <h3 className="text-lg font-semibold text-foreground">
          Detalhes da Assinatura
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Status */}
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Proxima cobranca */}
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Proxima cobranca
          </p>
          <p className="text-sm font-medium text-foreground">
            {formatDate(subscription.nextDueDate)}
          </p>
        </div>

        {/* Valor */}
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Valor
          </p>
          <p className="text-sm font-medium text-foreground">R$ 450,00/mes</p>
        </div>

        {/* Periodo de carencia */}
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Carencia
          </p>
          <p className="text-sm font-medium text-foreground">
            {subscription.graceDays} dias
          </p>
        </div>
      </div>

      {/* Gerenciar assinatura */}
      {subscription.stripeCustomerId && (
        <div className="border-t border-border pt-6">
          <button
            type="button"
            onClick={handlePortal}
            disabled={portalLoading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          >
            {portalLoading && <SpinnerIcon className="h-4 w-4" />}
            {portalLoading ? "Redirecionando..." : "Gerenciar assinatura"}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Altere forma de pagamento, visualize faturas ou cancele sua
            assinatura pelo portal do Stripe.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 256 256"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
