"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Trash2 } from "lucide-react";
import { AdminShell, DeleteConfirm } from "@brasa/admin";

type FormField = {
  name: string;
  label: string;
  type: "text" | "email" | "textarea" | "select" | "phone" | "number";
  required?: boolean;
  options?: string[];
};

type Form = {
  id: number;
  name: string;
  slug: string;
  fields: FormField[];
  successMessage: string | null;
  notifyEmail: string | null;
  active: boolean;
  createdAt: string;
};

export default function FormulariosPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Form | null>(null);

  useEffect(() => {
    fetch("/api/admin/forms")
      .then((res) => res.json())
      .then(setForms)
      .catch(() => toast.error("Erro ao carregar formulários"))
      .finally(() => setLoading(false));
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    );
  }

  async function handleCreate() {
    if (!name || !slug) return toast.error("Preencha nome e slug");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          fields: [
            { name: "name", label: "Nome", type: "text", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "message", label: "Mensagem", type: "textarea", required: false },
          ],
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      const row = await res.json();
      setShowCreate(false);
      setName("");
      setSlug("");
      toast.success("Formulário criado");
      router.push(`/admin/formularios/${row.id}`);
    } catch {
      toast.error("Erro ao criar formulário");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(form: Form) {
    try {
      const res = await fetch(`/api/admin/forms/${form.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao excluir");
      }
      setForms((prev) => prev.filter((f) => f.id !== form.id));
      toast.success("Formulário excluído");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir formulário");
    }
  }

  return (
    <AdminShell title="Formulários">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Formulários</h1>
            <p className="text-sm text-muted-foreground">
              Crie formulários de contato e lead capture. O frontend consome via API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-4 hover:brightness-[0.97]"
          >
            Criar formulário
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Novo formulário</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Contato"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="contato"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Campos padrão: Nome, Email e Mensagem. Você pode editar depois.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-md bg-foreground text-background px-4 py-1.5 text-sm font-medium hover:brightness-[0.97] disabled:opacity-50"
              >
                {creating ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
        ) : forms.length === 0 && !showCreate ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum formulário criado. Crie um para capturar leads no frontend.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {forms.map((form) => (
              <div
                key={form.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/admin/formularios/${form.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/admin/formularios/${form.id}`);
                  }
                }}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-accent/30"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{form.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    /api/v1/forms/{form.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {(form.fields as FormField[]).length} campos
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      form.active
                        ? "bg-success-bg text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {form.active ? "Ativo" : "Inativo"}
                  </span>

                  {/* Kebab menu */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(menuOpen === form.id ? null : form.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label={`Ações de ${form.name}`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen === form.id}
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {menuOpen === form.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border border-border bg-card py-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(null);
                              setDeleteTarget(form);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                            Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        title={deleteTarget ? `Excluir "${deleteTarget.name}"?` : "Excluir formulário?"}
        description="Esta ação não pode ser desfeita. O formulário e todas as respostas serão permanentemente removidos."
      />
    </AdminShell>
  );
}
