"use client";

import { useState, type FormEvent } from "react";
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

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authClient.forgetPassword({
        email,
        redirectTo: `${window.location.origin}/admin/redefinir-senha`,
      });
      setSuccess(true);
    } catch {
      setError("Erro ao enviar email de recuperação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-6">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-10">
          <BrandLogo height={80} />
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
            <h1 className="text-[24px] font-bold text-[#1a1a1a] mb-2">
              Email enviado!
            </h1>
            <p className="text-[14px] text-[#666] leading-relaxed mb-8">
              Se existe uma conta com <strong>{email}</strong>, você receberá um link para redefinir sua senha.
            </p>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 text-[14px] text-[#F97316] font-medium hover:underline"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
              </svg>
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-[28px] font-bold tracking-tight text-[#1a1a1a]">
                Recuperar senha
              </h1>
              <p className="mt-2 text-[14px] text-[#666] leading-relaxed">
                Informe seu email e enviaremos um link para redefinir sua senha.
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
                  "Enviar link de recuperação"
                )}
              </button>

              <Link
                href="/admin/login"
                className="flex items-center justify-center gap-2 text-[13px] text-[#666] hover:text-[#1a1a1a] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
                </svg>
                Voltar para o login
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
