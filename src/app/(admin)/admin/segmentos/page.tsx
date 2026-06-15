"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminShell, BrasaLoader } from "@brasa/admin";

type Matcher = {
  id: number;
  name: string;
  type: string;
  config: Record<string, unknown>;
  createdAt: string;
};

const MATCHER_TYPES = [
  { value: "device", label: "Device", hint: "mobile, tablet ou desktop" },
  { value: "random", label: "Random %", hint: "Porcentagem do trafego" },
  { value: "date", label: "Data", hint: "Range de datas" },
  { value: "pathname", label: "Pathname", hint: "Pattern de URL" },
  { value: "cookie", label: "Cookie", hint: "Nome e valor de cookie" },
  { value: "queryString", label: "Query String", hint: "Parametro de URL" },
  { value: "host", label: "Host", hint: "Dominio especifico" },
  { value: "userAgent", label: "User Agent", hint: "Regex no UA" },
  { value: "location", label: "Localizacao", hint: "Pais, regiao ou cidade" },
  { value: "multi", label: "Composto (AND/OR)", hint: "Combina matchers" },
  { value: "negate", label: "Negar", hint: "Inverte outro matcher" },
];

function ConfigEditor({
  type,
  config,
  onChange,
}: {
  type: string;
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });
  const inputCls = "rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring";

  switch (type) {
    case "device":
      return (
        <select value={(config.device as string) || "mobile"} onChange={(e) => set("device", e.target.value)} className={inputCls}>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
          <option value="desktop">Desktop</option>
        </select>
      );
    case "random":
      return (
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={100} value={(config.percentage as number) ?? 50} onChange={(e) => set("percentage", Number(e.target.value))} className={`${inputCls} w-20`} />
          <span className="text-xs text-muted-foreground">% do trafego</span>
        </div>
      );
    case "date":
      return (
        <div className="flex gap-2">
          <input type="datetime-local" value={(config.start as string) || ""} onChange={(e) => set("start", e.target.value)} className={inputCls} placeholder="Inicio" />
          <input type="datetime-local" value={(config.end as string) || ""} onChange={(e) => set("end", e.target.value)} className={inputCls} placeholder="Fim" />
        </div>
      );
    case "pathname":
      return <input type="text" value={(config.pattern as string) || ""} onChange={(e) => set("pattern", e.target.value)} className={`${inputCls} w-full`} placeholder="/blog/**" />;
    case "cookie":
      return (
        <div className="flex gap-2">
          <input type="text" value={(config.name as string) || ""} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Nome do cookie" />
          <input type="text" value={(config.value as string) || ""} onChange={(e) => set("value", e.target.value)} className={inputCls} placeholder="Valor (opcional)" />
        </div>
      );
    case "queryString":
      return (
        <div className="flex gap-2">
          <input type="text" value={(config.key as string) || ""} onChange={(e) => set("key", e.target.value)} className={inputCls} placeholder="Parametro" />
          <input type="text" value={(config.value as string) || ""} onChange={(e) => set("value", e.target.value)} className={inputCls} placeholder="Valor (opcional)" />
        </div>
      );
    case "host":
      return <input type="text" value={(config.hostname as string) || ""} onChange={(e) => set("hostname", e.target.value)} className={`${inputCls} w-full`} placeholder="example.com" />;
    case "userAgent":
      return <input type="text" value={(config.pattern as string) || ""} onChange={(e) => set("pattern", e.target.value)} className={`${inputCls} w-full`} placeholder="Regex (ex: googlebot|bingbot)" />;
    case "location":
      return (
        <div className="flex gap-2">
          <input type="text" value={(config.country as string) || ""} onChange={(e) => set("country", e.target.value)} className={inputCls} placeholder="Pais (BR)" />
          <input type="text" value={(config.region as string) || ""} onChange={(e) => set("region", e.target.value)} className={inputCls} placeholder="Estado" />
          <input type="text" value={(config.city as string) || ""} onChange={(e) => set("city", e.target.value)} className={inputCls} placeholder="Cidade" />
        </div>
      );
    default:
      return <p className="text-xs text-muted-foreground">Configure via JSON</p>;
  }
}

export default function SegmentosPage() {
  const [matchers, setMatchers] = useState<Matcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [type, setType] = useState("device");
  const [config, setConfig] = useState<Record<string, unknown>>({});

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/admin/matchers")
      .then((r) => r.json())
      .then(setMatchers)
      .catch(() => toast.error("Erro ao carregar matchers"))
      .finally(() => setLoading(false));
  }

  async function handleAdd() {
    if (!name.trim()) return toast.error("Nome e obrigatorio");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/matchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, config }),
      });
      if (!res.ok) throw new Error();
      const row = await res.json();
      setMatchers((prev) => [row, ...prev]);
      setName("");
      setType("device");
      setConfig({});
      setShowForm(false);
      toast.success("Matcher criado");
    } catch {
      toast.error("Erro ao criar matcher");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch("/api/admin/matchers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMatchers((prev) => prev.filter((m) => m.id !== id));
      toast.success("Removido");
    } catch {
      toast.error("Erro ao remover");
    }
  }

  return (
    <AdminShell title="Segmentos">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Matchers</h1>
            <p className="text-sm text-muted-foreground">
              Condicoes de segmentacao para feature flags e A/B tests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 h-8 text-[12px] font-medium hover:brightness-[0.97]"
          >
            {showForm ? "Cancelar" : "+ Novo Matcher"}
          </button>
        </div>

        {showForm && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mobile BR" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
                <select value={type} onChange={(e) => { setType(e.target.value); setConfig({}); }} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  {MATCHER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Configuracao</label>
              <ConfigEditor type={type} config={config} onChange={setConfig} />
            </div>
            <button type="button" onClick={handleAdd} disabled={adding} className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-4 h-8 text-[13px] font-medium hover:brightness-[0.97] disabled:opacity-50">
              {adding ? <BrasaLoader size="sm" /> : null}
              {adding ? "Criando..." : "Criar Matcher"}
            </button>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : matchers.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum matcher criado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Config</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {matchers.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">{m.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">{m.type}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                      {JSON.stringify(m.config)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => handleDelete(m.id)} className="text-xs text-muted-foreground hover:text-destructive">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
