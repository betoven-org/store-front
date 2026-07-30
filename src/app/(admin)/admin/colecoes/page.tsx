"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, FolderOpen, MoreVertical, Settings, Trash2, Power } from "lucide-react";
import { AdminShell, BrasaPageLoader, FormField } from "@brasa/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Collection = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  enabled: boolean;
  source: "local" | "synced";
  itemCount?: number;
  createdAt: string;
};

export default function ColecoesPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [createMode, setCreateMode] = useState<"local" | "supabase">("local");
  const [sbTables, setSbTables] = useState<{ name: string; columnCount: number }[]>([]);
  const [sbLoading, setSbLoading] = useState(false);
  const [sbSelected, setSbSelected] = useState("");
  const [sbColumns, setSbColumns] = useState<{ name: string; fieldType: string; required: boolean }[]>([]);
  const [sbColumnsLoading, setSbColumnsLoading] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  async function fetchCollections() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/collections");
      if (!res.ok) throw new Error("Erro ao carregar collections");
      const data = await res.json();
      setCollections(data.docs ?? data);
    } catch {
      toast.error("Erro ao carregar collections");
    } finally {
      setLoading(false);
    }
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const name = e.target.value;
    setNewName(name);
    setNewSlug(
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    );
  }

  async function handleDelete(col: Collection) {
    if (!confirm(`Excluir "${col.name}"? Todos os itens e campos serao removidos permanentemente.`)) return;
    setDeleting(col.id);
    try {
      const res = await fetch(`/api/admin/collections/${col.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success(`"${col.name}" excluida`);
      setCollections((prev) => prev.filter((c) => c.id !== col.id));
    } catch {
      toast.error("Erro ao excluir collection");
    } finally {
      setDeleting(null);
      setMenuOpen(null);
    }
  }

  async function handleToggleEnabled(col: Collection, e: React.MouseEvent) {
    e.stopPropagation();
    const newEnabled = !col.enabled;
    // Optimistic update
    setCollections((prev) =>
      prev.map((c) => (c.id === col.id ? { ...c, enabled: newEnabled } : c))
    );
    try {
      const res = await fetch(`/api/admin/collections/${col.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      toast.success(`"${col.name}" ${newEnabled ? "ativada" : "desativada"}`);
    } catch {
      // Revert
      setCollections((prev) =>
        prev.map((c) => (c.id === col.id ? { ...c, enabled: col.enabled } : c))
      );
      toast.error("Erro ao atualizar collection");
    }
  }

  async function loadSupabaseTables() {
    setSbLoading(true);
    try {
      const res = await fetch("/api/admin/supabase-tables");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao carregar tabelas");
      }
      const data = await res.json();
      setSbTables(data.tables || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar tabelas Supabase");
    } finally {
      setSbLoading(false);
    }
  }

  async function loadTableColumns(table: string) {
    setSbSelected(table);
    setSbColumnsLoading(true);
    // Auto-fill name/slug from table name
    const prettyName = table.charAt(0).toUpperCase() + table.slice(1).replace(/_/g, " ");
    setNewName(prettyName);
    setNewSlug(table.replace(/_/g, "-"));
    try {
      const res = await fetch(`/api/admin/supabase-tables?table=${encodeURIComponent(table)}`);
      if (!res.ok) throw new Error("Erro ao carregar colunas");
      const data = await res.json();
      setSbColumns(data.columns || []);
    } catch {
      toast.error("Erro ao carregar colunas da tabela");
    } finally {
      setSbColumnsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: newName.trim(),
        slug: newSlug.trim(),
        source: createMode === "supabase" ? "synced" : "local",
      };

      if (createMode === "supabase" && sbSelected) {
        // Build syncConfig and fields from selected table columns
        const fieldMap: Record<string, string> = {};
        const fields = sbColumns
          .filter((c) => !["id", "created_at", "updated_at"].includes(c.name))
          .map((c, i) => {
            fieldMap[c.name.replace(/_/g, "_")] = c.name;
            return {
              slug: c.name.replace(/_/g, "_"),
              name: c.name.charAt(0).toUpperCase() + c.name.slice(1).replace(/_/g, " "),
              type: c.fieldType,
              required: c.required,
              sortOrder: i,
            };
          });
        body.syncConfig = {
          supabaseTable: sbSelected,
          matchColumn: "id",
          fieldMap,
        };
        body.fields = fields;
      }

      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao criar collection");
      }
      const created = await res.json();
      toast.success("Collection criada");
      resetCreateDialog();
      router.push(`/admin/colecoes/${created.id}/configurar`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar collection");
    } finally {
      setCreating(false);
    }
  }

  function resetCreateDialog() {
    setShowCreate(false);
    setNewName("");
    setNewSlug("");
    setCreateMode("local");
    setSbSelected("");
    setSbColumns([]);
    setSbTables([]);
  }

  return (
    <AdminShell title="Collections">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Gerencie suas collections de conteudo estruturado.
        </p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus />
          Nova Collection
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <BrasaPageLoader />
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FolderOpen
            className="mx-auto mb-4 size-12 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="mb-2 text-sm text-muted-foreground">
            Nenhuma collection encontrada.
          </p>
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            <Plus />
            Criar primeira collection
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fonte</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itens</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {collections.map((col, idx) => {
                const isLast = idx >= collections.length - 2;
                return (
                <tr
                  key={col.id}
                  onClick={() => router.push(`/admin/colecoes/${col.id}`)}
                  className={`border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-accent/30 ${!col.enabled ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{col.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">/{col.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={col.source === "synced" ? "brand" : "secondary"}>
                      {col.source === "synced" ? "Sync" : "Local"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => handleToggleEnabled(col, e)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        col.enabled
                          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${col.enabled ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                      {col.enabled ? "Ativa" : "Inativa"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {col.itemCount ?? "—"}
                  </td>
                  <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setMenuOpen(menuOpen === col.id ? null : col.id)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                      {menuOpen === col.id && (
                        <div className={`absolute right-0 z-20 w-44 rounded-md border border-border bg-card py-1 shadow-lg ${isLast ? "bottom-full mb-1" : "top-full mt-1"}`}>
                          <button
                            type="button"
                            onClick={() => { setMenuOpen(null); router.push(`/admin/colecoes/${col.id}/configurar`); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                          >
                            <Settings className="size-3.5" /> Configurar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { setMenuOpen(null); handleToggleEnabled(col, e); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                          >
                            <Power className="size-3.5" /> {col.enabled ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(col)}
                            disabled={deleting === col.id}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" /> {deleting === col.id ? "Excluindo..." : "Excluir"}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetCreateDialog(); else setShowCreate(true); }}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Nova Collection</DialogTitle>
              <DialogDescription>
                Crie uma collection local ou importe de uma tabela do Supabase.
              </DialogDescription>
            </DialogHeader>

            {/* Mode tabs */}
            <div className="mt-4 flex gap-1 rounded-md bg-accent p-0.5">
              <button
                type="button"
                onClick={() => setCreateMode("local")}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${createMode === "local" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                Local
              </button>
              <button
                type="button"
                onClick={() => { setCreateMode("supabase"); if (sbTables.length === 0) loadSupabaseTables(); }}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${createMode === "supabase" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                Importar do Supabase
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {createMode === "supabase" && (
                <div className="space-y-3">
                  {sbLoading ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Carregando tabelas...</p>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Tabela Supabase</label>
                      <select
                        value={sbSelected}
                        onChange={(e) => loadTableColumns(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                      >
                        <option value="">Selecione uma tabela...</option>
                        {sbTables.map((t) => (
                          <option key={t.name} value={t.name}>{t.name} ({t.columnCount} colunas)</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {sbColumnsLoading && <p className="text-xs text-muted-foreground">Carregando colunas...</p>}
                  {sbColumns.length > 0 && !sbColumnsLoading && (
                    <div className="rounded-md border border-border bg-accent/30 p-3">
                      <p className="text-xs font-medium text-foreground mb-2">{sbColumns.length} colunas encontradas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {sbColumns.map((c) => (
                          <span key={c.name} className="inline-flex items-center gap-1 rounded bg-card border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {c.name} <span className="text-[10px] opacity-60">{c.fieldType}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <FormField
                label="Nome"
                name="name"
                type="text"
                value={newName}
                onChange={handleNameChange}
                placeholder="Ex: Depoimentos"
                required
              />
              <FormField
                label="Slug"
                name="slug"
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="ex: depoimentos"
                required
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={creating || !newName.trim() || (createMode === "supabase" && !sbSelected)}>
                {creating ? "Criando..." : createMode === "supabase" ? "Importar e Criar" : "Criar Collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
