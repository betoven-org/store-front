"use client";

import { useState } from "react";

function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-16 w-16 text-warning"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <img
      src="/brasa-logo.png"
      alt="brasa"
      className="h-10 w-auto"
      aria-hidden="true"
    />
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
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

export default function PagamentoPendentePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stripe/checkout", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao iniciar checkout.");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("URL de checkout nao retornada.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao processar pagamento.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex items-center gap-3">
        <LogoIcon />
        <span className="text-2xl font-bold text-primary">
          Medicinal na Web
        </span>
      </div>

      <div className="w-full max-w-lg rounded-2xl bg-card p-10 text-center shadow-lg">
        <div className="mb-6 flex justify-center">
          <WarningIcon />
        </div>

        <h1 className="mb-3 text-2xl font-bold text-foreground">
          Servico temporariamente suspenso
        </h1>

        <p className="mb-2 text-lg text-muted-foreground">
          Existe uma pendencia financeira na sua assinatura.
        </p>

        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Para reativar automaticamente, regularize o pagamento. Assim que o
          pagamento for confirmado, o acesso sera restaurado em segundos.
        </p>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 h-10 text-sm"
        >
          {loading && <SpinnerIcon />}
          {loading ? "Redirecionando..." : "Regularizar pagamento"}
        </button>

        {error && (
          <p className="mt-4 text-sm font-medium text-destructive">{error}</p>
        )}

        <p className="mt-6 text-sm text-muted-foreground">
          Precisa de ajuda? Entre em contato:{" "}
          <a
            href="mailto:contato@medicinalweb.com"
            className="text-primary underline hover:text-[#0a4f8c]"
          >
            contato@medicinalweb.com
          </a>
        </p>
      </div>
    </div>
  );
}
