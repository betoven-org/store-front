"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
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

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);

    try {
      await authClient.resetPassword({
        newPassword: password,
        token,
      });
      setSuccess(true);
    } catch {
      setError("Token inválido ou expirado. Solicite um novo link.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-6">
        <div className="text-center max-w-[380px]">
          <h1 className="text-[24px] font-bold text-[#1a1a1a] mb-3">Link inválido</h1>
          <p className="text-[14px] text-[#666] mb-6">
            Este link de redefinição de senha é inválido ou expirou.
          </p>
          <Link
            href="/admin/recuperar-senha"
            className="text-[14px] text-[#F97316] font-medium hover:underline"
          >
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
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
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <h1 className="text-[24px] font-bold text-[#1a1a1a] mb-2">
              Senha redefinida!
            </h1>
            <p className="text-[14px] text-[#666] mb-8">
              Sua senha foi alterada com sucesso. Agora você pode entrar.
            </p>
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-2 h-[48px] px-8 rounded-xl text-white text-[15px] font-semibold transition-all hover:brightness-110"
              style={{ backgroundColor: "#F97316" }}
            >
              Entrar
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-[28px] font-bold tracking-tight text-[#1a1a1a]">
                Redefinir senha
              </h1>
              <p className="mt-2 text-[14px] text-[#666]">
                Digite sua nova senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-[13px] font-semibold text-[#1a1a1a]">
                  Nova senha
                </label>
                <div className="flex items-center gap-3 h-[48px] px-4 bg-white border border-[#e0e0e0] rounded-xl transition-colors focus-within:border-[#F97316]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[#999] shrink-0">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 border-0 outline-0 bg-transparent text-[#1a1a1a] text-[14px] min-w-0 placeholder:text-[#bbb]"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="confirm" className="text-[13px] font-semibold text-[#1a1a1a]">
                  Confirmar senha
                </label>
                <div className="flex items-center gap-3 h-[48px] px-4 bg-white border border-[#e0e0e0] rounded-xl transition-colors focus-within:border-[#F97316]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[#999] shrink-0">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex-1 border-0 outline-0 bg-transparent text-[#1a1a1a] text-[14px] min-w-0 placeholder:text-[#bbb]"
                    placeholder="Repita a senha"
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
                  "Redefinir senha"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
