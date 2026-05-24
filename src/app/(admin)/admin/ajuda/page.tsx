"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@brasa/admin";

type Guide = {
  id: number;
  slug: string;
  title: string;
  content: string;
  sortOrder: number;
};

export default function AjudaPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/guides")
      .then((r) => r.json())
      .then((data: Guide[]) => {
        setGuides(data);
        if (data.length > 0) setActiveSlug(data[0].slug);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeGuide = guides.find((g) => g.slug === activeSlug);

  return (
    <AdminShell title="Ajuda">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : guides.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum guia disponivel</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Sidebar com lista de guias */}
          {guides.length > 1 && (
            <nav className="w-56 flex-shrink-0">
              <ul className="space-y-1">
                {guides.map((guide) => (
                  <li key={guide.slug}>
                    <button
                      type="button"
                      onClick={() => setActiveSlug(guide.slug)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                        activeSlug === guide.slug
                          ? "bg-primary/5 text-primary"
                          : "text-muted-foreground hover:bg-background hover:text-foreground"
                      }`}
                    >
                      {guide.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Conteudo do guia */}
          {activeGuide && (
            <article className="min-w-0 flex-1 rounded-xl border border-border bg-card p-8">
              <h1 className="mb-6 text-2xl font-bold text-foreground">{activeGuide.title}</h1>
              <div
                className="prose prose-sm max-w-none
                  prose-headings:text-foreground prose-h2:mt-8 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
                  prose-h3:mt-4 prose-h3:text-base
                  prose-p:text-muted-foreground prose-p:leading-relaxed
                  prose-li:text-muted-foreground
                  prose-strong:text-foreground
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-table:text-sm prose-th:bg-background prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
                  prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border
                  prose-hr:border-border"
                dangerouslySetInnerHTML={{ __html: activeGuide.content }}
              />
            </article>
          )}
        </div>
      )}
    </AdminShell>
  );
}
