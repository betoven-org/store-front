"use client";

import { useState, useEffect, useCallback } from "react";

type Domain = {
  name: string;
  verified: boolean;
  configured: boolean;
  redirect?: string | null;
  redirectStatusCode?: number | null;
};

export default function DomainsView() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/domains");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDomains(data.domains || []);
    } catch {
      setError("Erro ao carregar dominios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleAdd = async () => {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao adicionar");
      setMessage({ text: `${newDomain} adicionado com sucesso`, type: "success" });
      setNewDomain("");
      fetchDomains();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (domain: string) => {
    if (!confirm(`Remover ${domain}?`)) return;
    try {
      const res = await fetch("/api/admin/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao remover");
      setMessage({ text: `${domain} removido`, type: "success" });
      fetchDomains();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Dominios</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4, marginBottom: 24 }}>
        Gerencie os dominios apontados para o projeto na Vercel
      </p>

      {message && (
        <div style={{
          padding: "12px 16px", borderRadius: 6, marginBottom: 16, fontSize: 14, fontWeight: 500,
          background: message.type === "success" ? "#dcfce7" : "#fef2f2",
          color: message.type === "success" ? "#166534" : "#991b1b",
          border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="meusite.com.br"
          aria-label="Novo domínio"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{
            flex: 1, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 6,
            fontSize: 14, fontFamily: "monospace",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newDomain.trim()}
          style={{
            background: "var(--primary)", color: "var(--card)", border: "none", borderRadius: 6,
            padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer",
            opacity: adding ? 0.6 : 1, whiteSpace: "nowrap",
          }}
        >
          {adding ? "Adicionando..." : "Adicionar dominio"}
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Carregando...</p>
      ) : error ? (
        <p style={{ color: "#ef4444", textAlign: "center", padding: 40 }}>{error}</p>
      ) : domains.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Nenhum dominio configurado</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {domains.map((d) => (
            <div key={d.name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", border: "1px solid #e5e7eb", borderRadius: 8, background: "var(--card)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 600 }}>{d.name}</span>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                    background: d.verified && d.configured ? "#dcfce7" : "#fef3c7",
                    color: d.verified && d.configured ? "#166534" : "#92400e",
                  }}>
                    {d.verified && d.configured ? "ATIVO" : d.verified ? "VERIFICADO" : "PENDENTE"}
                  </span>
                </div>
                {!d.configured && (
                  <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                    Aponte o DNS (CNAME) para <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 2 }}>cname.vercel-dns.com</code>
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemove(d.name)}
                style={{
                  background: "transparent", color: "#ef4444", border: "1px solid #fecaca",
                  borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer",
                }}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 16, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>Como configurar</p>
        <ol style={{ fontSize: 12, color: "#6b7280", margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Adicione o dominio acima</li>
          <li>No painel DNS do seu provedor, crie um registro CNAME apontando para <code style={{ background: "var(--card)", padding: "1px 4px", borderRadius: 2 }}>cname.vercel-dns.com</code></li>
          <li>Para dominio raiz (sem www), use um registro A apontando para <code style={{ background: "var(--card)", padding: "1px 4px", borderRadius: 2 }}>76.76.21.21</code></li>
          <li>Aguarde a propagacao do DNS (ate 48h, geralmente minutos)</li>
        </ol>
      </div>
    </div>
  );
}
