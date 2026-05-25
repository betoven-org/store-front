"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function BrandGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
      <rect x="0" y="0" width="32" height="32" rx="7" fill="oklch(0.20 0.012 45)" />
      <rect x="7" y="4" width="5" height="24" rx="2" fill="oklch(0.96 0.020 65)" />
      <circle cx="17" cy="20" r="7.5" fill="oklch(0.96 0.020 65)" />
      <circle cx="17" cy="20" r="4.1" fill="oklch(0.20 0.012 45)" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Credenciais inválidas");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(420px,1fr)_1.2fr]">
      {/* Left: form */}
      <div className="flex flex-col px-8 py-10 lg:px-14">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <BrandGlyph size={28} />
          <span className="font-display text-[15px] font-medium tracking-tight text-foreground">
            brasa<span className="text-brand">.</span>
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center max-w-[380px]">
          <div className="mb-7">
            <h1 className="font-display text-[34px] font-medium tracking-tight leading-[1.05] text-foreground">
              Bem-vindo de volta.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Entre com seu email para acessar o painel de administração.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[12.5px] font-medium text-muted-foreground">
                Email
              </label>
              <div className="flex items-center gap-2 h-[34px] px-2.5 bg-card border border-border rounded-md transition-colors focus-within:border-ring">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 border-0 outline-0 bg-transparent text-foreground text-[13.5px] min-w-0"
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[12.5px] font-medium text-muted-foreground">
                Senha
              </label>
              <div className="flex items-center gap-2 h-[34px] px-2.5 bg-card border border-border rounded-md transition-colors focus-within:border-ring">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 border-0 outline-0 bg-transparent text-foreground text-[13.5px] min-w-0"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-danger-bg text-danger text-[13px] border border-danger/15">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center h-[38px] rounded-md bg-foreground text-background text-[13px] font-medium transition-[filter] hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-50 mt-1"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-current border-t-transparent animate-spin" />
              ) : (
                "Entrar"
              )}
            </button>

            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>
              </svg>
              Conexão protegida com TLS
            </div>
          </form>
        </div>

        <div className="font-mono text-[11.5px] text-muted-foreground">
          v1.0.0 · brasa cms
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="relative overflow-hidden hidden lg:flex flex-col p-10" style={{
        background: "linear-gradient(160deg, oklch(0.30 0.08 40) 0%, oklch(0.22 0.06 35) 60%, oklch(0.16 0.04 30) 100%)",
        color: "white",
      }}>
        {/* Ember glow */}
        <div className="absolute pointer-events-none" style={{
          left: "60%", top: "30%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.72 0.20 50 / 0.55) 0%, transparent 60%)",
          filter: "blur(40px)",
        }} />
        <div className="absolute pointer-events-none" style={{
          left: "-10%", bottom: "-20%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.55 0.16 22 / 0.30) 0%, transparent 60%)",
          filter: "blur(50px)",
        }} />

        {/* Grid overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
          <defs>
            <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>

        <div className="flex justify-between relative z-10">
          <span className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
            site · blog · cloud 
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center relative z-10">
          <div className="text-center flex flex-col items-center">
            <BrandGlyph size={72} />
            <h2 className="font-display text-[28px] font-medium mt-6 tracking-tight leading-tight">
              Gerencie conteúdo,<br />construa páginas,<br />publique em segundos.
            </h2>
            <p className="mt-4 text-sm opacity-60 max-w-[320px] mx-auto leading-relaxed">
              Um CMS cloud projetado para equipes que precisam de velocidade e controle. API-first, sem limites.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-end relative z-10 font-mono text-[11px] opacity-40">
          <span>brasa.tech</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
