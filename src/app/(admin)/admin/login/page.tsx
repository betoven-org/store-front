"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function BrandLogo({ height = 24 }: { height?: number }) {
  return (
    <img
      src="/brasa-logo.png"
      alt="brasa"
      style={{ height, width: "auto", flexShrink: 0 }}
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col px-10 py-10 lg:px-16 bg-[#fafafa]">
        <div className="flex items-center gap-2">
          <BrandLogo height={32} />
        </div>

        <div className="flex flex-1 flex-col justify-center max-w-[420px] w-full">
          <div className="mb-10">
            <h1 className="text-[36px] font-bold tracking-tight leading-[1.1] text-[#1a1a1a]">
              Bem-vindo{" "}
              <span style={{ color: "#F97316" }}>de volta.</span>
            </h1>
            <p className="mt-3 text-[15px] text-[#666] leading-relaxed">
              Entre com seu email para acessar o painel<br />de administração.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[13px] font-semibold text-[#1a1a1a]">
                Email
              </label>
              <div className="flex items-center gap-3 h-[48px] px-4 bg-white border border-[#e0e0e0] rounded-xl transition-colors focus-within:border-[#F97316]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[#999] shrink-0">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 border-0 outline-0 bg-transparent text-[#1a1a1a] text-[14px] min-w-0 placeholder:text-[#bbb]"
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-[13px] font-semibold text-[#1a1a1a]">
                Senha
              </label>
              <div className="flex items-center gap-3 h-[48px] px-4 bg-white border border-[#e0e0e0] rounded-xl transition-colors focus-within:border-[#F97316]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[#999] shrink-0">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 border-0 outline-0 bg-transparent text-[#1a1a1a] text-[14px] min-w-0 placeholder:text-[#bbb]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={remember}
                  onClick={() => setRemember(!remember)}
                  className="w-[18px] h-[18px] rounded flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: remember ? "#F97316" : "transparent",
                    border: remember ? "none" : "2px solid #ccc",
                  }}
                >
                  {remember && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  )}
                </button>
                <span className="text-[13px] text-[#555]">Lembrar de mim</span>
              </label>
              <button type="button" className="text-[13px] text-[#F97316] font-medium hover:underline">
                Esqueceu sua senha?
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-[13px] border border-red-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 h-[48px] rounded-xl text-white text-[15px] font-semibold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: "#F97316" }}
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  Entrar
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 mt-1 text-[12px] text-[#999]">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>
              </svg>
              Conexão protegida com TLS
            </div>
          </form>
        </div>

        <div className="font-mono text-[11px] text-[#aaa]">
          v1.0.0 · brasa cms
        </div>
      </div>

      {/* Right: brand panel */}
      <div
        className="relative overflow-hidden hidden lg:flex flex-col p-10"
        style={{
          background: "linear-gradient(160deg, oklch(0.30 0.08 40) 0%, oklch(0.22 0.06 35) 40%, oklch(0.14 0.05 30) 100%)",
          color: "white",
        }}
      >
        {/* Ember glow top-right */}
        <div className="absolute pointer-events-none" style={{
          right: "-10%", top: "-10%",
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.60 0.22 45 / 0.45) 0%, oklch(0.45 0.18 35 / 0.15) 40%, transparent 65%)",
          filter: "blur(30px)",
        }} />
        {/* Ember glow bottom-left */}
        <div className="absolute pointer-events-none" style={{
          left: "-15%", bottom: "-20%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.50 0.16 30 / 0.30) 0%, transparent 55%)",
          filter: "blur(50px)",
        }} />
        {/* Subtle bottom-right glow */}
        <div className="absolute pointer-events-none" style={{
          right: "5%", bottom: "10%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.65 0.20 40 / 0.20) 0%, transparent 50%)",
          filter: "blur(40px)",
        }} />

        {/* Nav links */}
        <div className="flex justify-center relative z-10">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.15em] uppercase opacity-70">
            <span>site</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
            <span>blog</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
            <span>cloud</span>
          </div>
        </div>

        {/* Center content */}
        <div className="flex flex-1 items-center justify-center relative z-10">
          <div className="text-center flex flex-col items-center">
            <BrandLogo height={72} />
            <h2 className="text-[32px] font-bold mt-8 tracking-tight leading-[1.25]">
              Gerencie{" "}
              <span style={{ color: "#F97316" }}>conteúdo,</span>
              <br />
              construa{" "}
              <span style={{ color: "#F97316" }}>páginas,</span>
              <br />
              publique em{" "}
              <span style={{ color: "#F97316" }}>segundos.</span>
            </h2>
            <p className="mt-5 text-[14px] opacity-55 max-w-[340px] mx-auto leading-relaxed">
              Um CMS cloud projetado para equipes que precisam de velocidade e controle. API-first, sem limites.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end relative z-10 font-mono text-[11px] opacity-40">
          <span>brasa.tech</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
