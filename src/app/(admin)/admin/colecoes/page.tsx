"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Database, Cloud, FolderOpen, MoreVertical, Settings, Trash2 } from "lucide-react";
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

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao criar collection");
      }
      const created = await res.json();
      toast.success("Collection criada");
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
      router.push(`/admin/colecoes/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar collection");
    } finally {
      setCreating(false);
    }
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
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itens</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {collections.map((col) => (
                <tr
                  key={col.id}
                  onClick={() => router.push(`/admin/colecoes/${col.id}`)}
                  className="border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-accent/30"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{col.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">/{col.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={col.source === "synced" ? "brand" : "secondary"}>
                      {col.source === "synced" ? (
                        <><Cloud className="size-3" /> Sync</>
                      ) : (
                        <><Database className="size-3" /> Local</>
                      )}
                    </Badge>
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
                        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-card py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => { setMenuOpen(null); router.push(`/admin/colecoes/${col.id}/configurar`); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                          >
                            <Settings className="size-3.5" /> Configurar
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Nova Collection</DialogTitle>
              <DialogDescription>
                Crie uma collection para organizar conteudo estruturado.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
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
              <Button type="submit" disabled={creating || !newName.trim()}>
                {creating ? "Criando..." : "Criar Collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
