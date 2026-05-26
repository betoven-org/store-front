"use client";

import { useState, useEffect, useCallback } from "react";

type EnvVar = {
  id: string;
  key: string;
  value: string;
  target: string[];
  type: string;
  sensitive: boolean;
};

export default function EnvVarsView() {
  const [envs, setEnvs] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const fetchEnvs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/env-vars");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEnvs(data.envs || []);
    } catch {
      setError("Erro ao carregar variaveis de ambiente");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvs();
  }, [fetchEnvs]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSave = async (env: EnvVar) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/env-vars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: env.id, key: env.key, value: editValue, target: env.target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      setMessage({ text: `${env.key} atualizada com sucesso`, type: "success" });
      setEditingId(null);
      fetchEnvs();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newKey || !newValue) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/env-vars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey, value: newValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar");
      setMessage({ text: `${newKey} criada com sucesso`, type: "success" });
      setShowAdd(false);
      setNewKey("");
      setNewValue("");
      fetchEnvs();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (env: EnvVar) => {
    if (!confirm(`Tem certeza que deseja remover ${env.key}?`)) return;
    try {
      const res = await fetch("/api/admin/env-vars", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: env.id, key: env.key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao remover");
      setMessage({ text: `${env.key} removida`, type: "success" });
      fetchEnvs();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Variaveis de Ambiente</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
            Gerencie as variaveis de ambiente do projeto na Vercel
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: "var(--primary)",
            color: "var(--card)",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          + Adicionar
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
            fontWeight: 500,
            background: message.type === "success" ? "#dcfce7" : "#fef2f2",
            color: message.type === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {showAdd && (
        <div
          style={{
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            marginBottom: 16,
            background: "#f9fafb",
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              CHAVE
            </label>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              placeholder="MINHA_VARIAVEL"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                fontFamily: "monospace",
              }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              VALOR
            </label>
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="valor"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                fontFamily: "monospace",
              }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !newKey || !newValue}
            style={{
              background: "var(--primary)",
              color: "var(--card)",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={() => { setShowAdd(false); setNewKey(""); setNewValue(""); }}
            style={{
              background: "transparent",
              color: "#6b7280",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Carregando...</p>
      ) : error ? (
        <p style={{ color: "#ef4444", textAlign: "center", padding: 40 }}>{error}</p>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Chave</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Valor</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", width: 100 }}>Target</th>
                <th style={{ width: 120, padding: "10px 16px" }} />
              </tr>
            </thead>
            <tbody>
              {envs.map((env) => (
                <tr key={env.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 500 }}>
                    {env.key}
                    {env.sensitive && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          padding: "2px 6px",
                          background: "#fef3c7",
                          color: "#92400e",
                          borderRadius: 4,
                          fontFamily: "sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        PROTEGIDA
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#6b7280" }}>
                    {editingId === env.id ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        aria-label="Editar valor da variável"
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          border: "1px solid var(--primary)",
                          borderRadius: 4,
                          fontSize: 13,
                          fontFamily: "monospace",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <span style={{ wordBreak: "break-all" }}>{env.value}</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af" }}>
                    {env.target?.join(", ")}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {env.sensitive ? null : editingId === env.id ? (
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => handleSave(env)}
                          disabled={saving}
                          style={{
                            background: "var(--primary)",
                            color: "var(--card)",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          {saving ? "..." : "Salvar"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            background: "transparent",
                            color: "#6b7280",
                            border: "1px solid var(--border)",
                            borderRadius: 4,
                            padding: "4px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => { setEditingId(env.id); setEditValue(env.value); }}
                          style={{
                            background: "transparent",
                            color: "var(--primary)",
                            border: "1px solid var(--border)",
                            borderRadius: 4,
                            padding: "4px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(env)}
                          style={{
                            background: "transparent",
                            color: "#ef4444",
                            border: "1px solid #fecaca",
                            borderRadius: 4,
                            padding: "4px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: "#9ca3af" }}>
        Variáveis protegidas não podem ser editadas por aqui. Alterações entram em vigor no próximo deploy.
      </p>
    </div>
  );
}
