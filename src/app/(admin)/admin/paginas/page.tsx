"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AdminShell } from "@brasa/admin";
import { createPageSchema } from "@brasa/core/validations";
import { z as z3 } from "zod/v3";
import type { z } from "zod";

// Re-define for zod/v3 compat with zodResolver
const createPageSchemaV3 = z3.object({
  title: z3.string().min(1, "Titulo e obrigatorio"),
  slug: z3.string().min(1, "Slug e obrigatorio"),
});

type CreatePageForm = z.infer<typeof createPageSchema>;

type Page = {
  id: number;
  slug: string;
  title: string;
  draft: unknown;
  scheduledAt: string | null;
  updatedAt: string;
};

function Spinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-primary"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function slugToPath(slug: string) {
  return slug === "home" ? "/" : `/${slug}`;
}

function RowMenu({ pageId, slug, title, onDuplicate, onDeleted }: { pageId: number; slug: string; title: string; onDuplicate: (pageId: number) => void; onDeleted: (pageId: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-muted-foreground"
        aria-label="Acoes"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-border bg-card py-1 shadow-lg">
          <button
            type="button"
            onClick={() => { setOpen(false); router.push(`/admin/paginas/${pageId}`); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-background"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84.84-2.872a2 2 0 0 1 .506-.854z" />
            </svg>
            Editar
          </button>
          <a
            href={slugToPath(slug)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-background"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Ver no site
          </a>
          <button
            type="button"
            onClick={() => { setOpen(false); onDuplicate(pageId); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-background"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Duplicar
          </button>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              const confirmed = window.confirm(
                `Tem certeza? A pagina "${title}" sera movida para a lixeira.`
              );
              if (!confirmed) return;
              try {
                const res = await fetch(`/api/admin/pages/${pageId}`, { method: "DELETE" });
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  throw new Error(body.error || "Erro ao excluir");
                }
                toast.success("Pagina movida para a lixeira");
                onDeleted(pageId);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erro ao excluir pagina");
              }
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-background"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

type PageTemplateItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  sectionsCount: number;
};

export default function PaginasPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<PageTemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");
  const router = useRouter();

  const form = useForm<CreatePageForm>({
    resolver: zodResolver(createPageSchemaV3),
    defaultValues: { title: "", slug: "" },
  });

  useEffect(() => {
    fetch("/api/admin/pages")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar paginas");
        return res.json();
      })
      .then((data) => setPages(data.docs ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showTemplatePicker && templates.length === 0) {
      fetch("/api/admin/page-templates")
        .then((res) => res.json())
        .then((data) => setTemplates(data.templates ?? []))
        .catch(() => {});
    }
  }, [showTemplatePicker, templates.length]);

  function handleTitleChange(val: string) {
    form.setValue("title", val);
    form.setValue("slug", val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function handleCreate(data: CreatePageForm) {
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title.trim(),
          slug: data.slug.trim(),
          templateId: selectedTemplate,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao criar pagina");
      }
      const created = await res.json();
      toast.success(`Pagina "${data.title}" criada`);
      router.push(`/admin/paginas/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pagina");
    }
  }

  async function handleDuplicate(pageId: number) {
    try {
      const res = await fetch(`/api/admin/pages/${pageId}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao duplicar pagina");
      }
      const created = await res.json();
      toast.success(`Pagina duplicada: "${created.title}"`);
      setPages((prev) => [...prev, created]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar pagina");
    }
  }

  const pendingCount = pages.filter((p) => p.draft !== null).length;

  if (loading) {
    return (
      <AdminShell title="Paginas">
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <span className="ml-3 text-sm text-muted-foreground">Carregando...</span>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Paginas">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Paginas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie as paginas estaticas do site.</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <a
              href="/admin/publicar"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-foreground text-[13px] font-medium h-8 px-3 transition-all hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 text-xs"
            >
              staging
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white leading-none">
                {pendingCount}
              </span>
            </a>
          )}
          <button
            type="button"
            onClick={() => { setShowTemplatePicker(true); setSelectedTemplate("blank"); }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Nova pagina
          </button>
        </div>
      </div>

      {/* Modal template picker */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 className="text-base font-semibold text-foreground">Escolha um template</h2>
            <p className="mt-1 text-sm text-muted-foreground">Selecione um modelo para comecar sua nova pagina.</p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent ${
                    selectedTemplate === tpl.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-2xl leading-none">{tpl.icon}</span>
                  <span className="mt-2 text-sm font-medium text-foreground">{tpl.name}</span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{tpl.description}</span>
                  <span className="mt-1.5 text-[10px] text-muted-foreground">{tpl.sectionsCount} sections</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTemplatePicker(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-foreground text-[13px] font-medium h-8 px-3 transition-all hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setShowTemplatePicker(false); setShowCreate(true); form.reset(); }}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar pagina */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={form.handleSubmit(handleCreate)} className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 className="text-base font-semibold text-foreground">Nova pagina</h2>
            <p className="mt-1 text-sm text-muted-foreground">Defina o titulo e o slug da pagina.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Titulo</label>
                <input
                  type="text"
                  {...form.register("title", {
                    onChange: (e) => handleTitleChange(e.target.value),
                  })}
                  placeholder="Ex: Sobre nos"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  autoFocus
                />
                {form.formState.errors.title && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Slug</label>
                <input
                  type="text"
                  {...form.register("slug")}
                  placeholder="sobre-nos"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-foreground shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <p className="mt-1 text-xs text-muted-foreground">URL: /{form.watch("slug") || "..."}</p>
                {form.formState.errors.slug && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-foreground text-[13px] font-medium h-8 px-3 transition-all hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
              >
                {form.formState.isSubmitting ? "Criando..." : "Criar pagina"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-visible rounded-lg border border-border bg-card">
        {error ? (
          <div className="flex items-center gap-2 p-6 text-sm text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z" />
            </svg>
            {error}
          </div>
        ) : pages.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhuma pagina encontrada.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titulo</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atualizado</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pages.map((page) => (
                <tr
                  key={page.id}
                  onClick={() => router.push(`/admin/paginas/${page.id}`)}
                  className="cursor-pointer transition-colors hover:bg-background"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{page.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <code className="rounded bg-accent px-1.5 py-0.5 text-xs">{page.slug}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {page.draft ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-semibold text-warning ring-1 ring-warning/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                          Rascunho
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Publicado
                        </span>
                      )}
                      {page.scheduledAt && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {new Date(page.scheduledAt).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(page.updatedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowMenu pageId={page.id} slug={page.slug} title={page.title} onDuplicate={handleDuplicate} onDeleted={(id) => setPages((prev) => prev.filter((p) => p.id !== id))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
