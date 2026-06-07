"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Step = "welcome" | "site-name" | "logo" | "first-page" | "done";

const STEPS: { key: Step; title: string; description: string }[] = [
  { key: "welcome", title: "Bem-vindo ao Brasa CMS", description: "Vamos configurar seu site em poucos passos." },
  { key: "site-name", title: "Nome do site", description: "Como seu site vai se chamar?" },
  { key: "logo", title: "Logo", description: "Faca upload da logo (pode pular e fazer depois)." },
  { key: "first-page", title: "Primeira pagina", description: "Escolha um template pra comecar." },
  { key: "done", title: "Pronto!", description: "Seu site esta configurado. Hora de criar conteudo." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [siteName, setSiteName] = useState("");
  const [saving, setSaving] = useState(false);

  const step = STEPS[currentStep];
  const progress = ((currentStep) / (STEPS.length - 1)) * 100;

  async function handleSaveName() {
    if (!siteName.trim()) return toast.error("Digite o nome do site");
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName }),
      });
      setCurrentStep((s) => s + 1);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleFinish() {
    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-right">
            {currentStep + 1} de {STEPS.length}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-xl font-bold text-foreground">{step.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>

          <div className="mt-6">
            {step.key === "welcome" && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-full rounded-md bg-foreground text-background py-2.5 text-sm font-medium hover:brightness-[0.97]"
              >
                Comecar
              </button>
            )}

            {step.key === "site-name" && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Minha Loja"
                  autoFocus
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={saving}
                  className="w-full rounded-md bg-foreground text-background py-2.5 text-sm font-medium hover:brightness-[0.97] disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Continuar"}
                </button>
              </div>
            )}

            {step.key === "logo" && (
              <div className="space-y-4">
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    Arraste a logo ou clique pra fazer upload
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    Pular
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => s + 1)}
                    className="flex-1 rounded-md bg-foreground text-background py-2.5 text-sm font-medium hover:brightness-[0.97]"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {step.key === "first-page" && (
              <div className="space-y-3">
                {["Landing Page", "Blog", "Institucional"].map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setCurrentStep((s) => s + 1)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-primary hover:bg-primary/5"
                  >
                    <div className="h-8 w-12 rounded bg-muted" />
                    <span className="text-sm font-medium text-foreground">{template}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full text-center text-xs text-muted-foreground hover:underline mt-2"
                >
                  Comecar do zero
                </button>
              </div>
            )}

            {step.key === "done" && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-bg">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full rounded-md bg-foreground text-background py-2.5 text-sm font-medium hover:brightness-[0.97]"
                >
                  Ir para o painel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
