"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

function BrandLogo({ height = 24 }: { height?: number }) {
  return (
    <img
      src="/brasa-logo.png"
      alt="brasa"
      style={{ height, width: "auto", flexShrink: 0 }}
    />
  );
}

export default function CriarContaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [siteName, setSiteName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Create tenant + user in our DB
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, siteName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar conta");
      }

      // 2. Create account in Neon Auth
      await authClient.signUp.email({
        name,
        email,
        password,
      });

      // 3. Sign in
      await authClient.signIn.email({ email, password });

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col px-10 py-10 lg:px-16 bg-[#fafafa]">
        <div className="flex items-center gap-2 -ml-6">
          <BrandLogo height={112} />
        </div>

        <div className="flex flex-1 flex-col justify-center max-w-[420px] w-full">
          <div className="mb-8">
            <h1 className="text-[32px] font-bold tracking-tight leading-[1.1] text-[#1a1a1a]">
              Crie sua{" "}
              <span style={{ color: "#F97316" }}>conta.</span>
            </h1>
            <p className="mt-3 text-[15px] text-[#666] leading-relaxed">
              Configure seu CMS em segundos.<br />30 dias gratis pra testar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="siteName" className="text-[13px] font-semibold text-[#1a1a1a]">
                Nome do site
              </label>
              <div className="flex items-center gap-3 h-[48px] px-4 bg-white border border-[#e0e0e0] rounded-xl transition-colors focus-within:border-[#F97316]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[#999] shrink-0">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <input
                  id="siteName"
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="flex-1 border-0 outline-0 bg-transparent text-[#1a1a1a] text-[14px] min-w-0 placeholder:text-[#bbb]"
                  placeholder="Minha Loja"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-[13px] font-semibold text-[#1a1a1a]">
                Seu nome
              </label>
              <div className="flex items-center gap-3 h-[48px] px-4 bg-white border border-[#e0e0e0] rounded-xl transition-colors focus-within:border-[#F97316]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[#999] shrink-0">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 border-0 outline-0 bg-transparent text-[#1a1a1a] text-[14px] min-w-0 placeholder:text-[#bbb]"
                  placeholder="Joao Silva"
                />
              </div>
            </div>

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
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 border-0 outline-0 bg-transparent text-[#1a1a1a] text-[14px] min-w-0 placeholder:text-[#bbb]"
                  placeholder="Min. 6 caracteres"
                />
              </div>
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
              className="flex w-full items-center justify-center gap-2 h-[48px] rounded-xl text-white text-[15px] font-semibold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
              style={{ backgroundColor: "#F97316" }}
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                "Criar conta gratis"
              )}
            </button>

            <p className="text-center text-[13px] text-[#666] mt-2">
              Ja tem uma conta?{" "}
              <Link href="/admin/login" className="text-[#F97316] font-medium hover:underline">
                Entrar
              </Link>
            </p>
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
        <div className="absolute pointer-events-none" style={{
          right: "-10%", top: "-10%",
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.60 0.22 45 / 0.45) 0%, oklch(0.45 0.18 35 / 0.15) 40%, transparent 65%)",
          filter: "blur(30px)",
        }} />
        <div className="absolute pointer-events-none" style={{
          left: "-15%", bottom: "-20%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.50 0.16 30 / 0.30) 0%, transparent 55%)",
          filter: "blur(50px)",
        }} />

        <div className="flex justify-center relative z-10">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.15em] uppercase opacity-70">
            <span>site</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
            <span>blog</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
            <span>cloud</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center relative z-10">
          <div className="text-center flex flex-col items-center">
            <h2 className="text-[32px] font-bold mt-8 tracking-tight leading-[1.25]">
              Comece{" "}
              <span style={{ color: "#F97316" }}>gratis,</span>
              <br />
              escale quando{" "}
              <span style={{ color: "#F97316" }}>quiser.</span>
            </h2>
            <p className="mt-5 text-[14px] opacity-55 max-w-[340px] mx-auto leading-relaxed">
              30 dias gratuitos. Sem cartao de credito. Cancele quando quiser.
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
