"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Database, Cloud, FolderOpen } from "lucide-react";
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => router.push(`/admin/colecoes/${col.id}`)}
              className="group rounded-lg border border-border bg-card p-5 text-left transition-all hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">
                    {col.icon || "📁"}
                  </span>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {col.name}
                  </h3>
                </div>
                <Badge variant={col.source === "synced" ? "brand" : "secondary"}>
                  {col.source === "synced" ? (
                    <>
                      <Cloud className="size-3" />
                      Sync
                    </>
                  ) : (
                    <>
                      <Database className="size-3" />
                      Local
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">/{col.slug}</p>
              {col.itemCount !== undefined && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {col.itemCount} {col.itemCount === 1 ? "item" : "itens"}
                </p>
              )}
            </button>
          ))}
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
