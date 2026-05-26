"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { AdminShell, DeleteConfirm, BulkBar, AuthorDrawer, Spinner } from "@brasa/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

type Author = {
  id: number;
  name: string;
  slug: string;
  avatar?: { url?: string } | null;
};

type ApiResponse = {
  docs: Author[];
  totalPages: number;
  page: number;
};

export default function AutoresPage() {
  const [data, setData] = useState<Author[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);

  const fetchAuthors = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/authors?page=${page}`);
      if (!res.ok) throw new Error("Erro ao carregar autores.");
      const json: ApiResponse = await res.json();
      setData(json.docs);
      setTotalPages(json.totalPages);
      setCurrentPage(json.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
      setSelected(new Set());
    }
  }, []);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/authors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Erro ao excluir autor.");
        return;
      }
      fetchAuthors(currentPage);
    } catch {
      setError("Erro ao excluir autor.");
    }
  };

  const doBulkDelete = async () => {
    setBulkLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/authors/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action: "delete" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Erro na exclusao em massa.");
        return;
      }
      fetchAuthors(currentPage);
    } catch {
      setError("Erro na exclusao em massa.");
    } finally {
      setBulkLoading(false);
    }
  };

  const allSelected = data.length > 0 && selected.size === data.length;
  const someSelected = selected.size > 0 && selected.size < data.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(data.map((a) => a.id)));
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AdminShell title="Autores">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gerencie os autores do blog.</p>
        <Button nativeButton={false} render={<Link href="/admin/autores/novo" />}>
          <Plus />
          Novo Autor
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 font-medium underline">Fechar</button>
        </div>
      )}

      <BulkBar
        count={selected.size}
        actions={[{ label: "Excluir", onClick: () => setShowBulkDelete(true), variant: "danger" }]}
        onClear={() => setSelected(new Set())}
        loading={bulkLoading}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Users className="mx-auto mb-4 size-12 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nenhum autor encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 px-4">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <TableHead className="w-12 px-4" aria-label="Avatar" />
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">Nome</TableHead>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">Slug</TableHead>
                <TableHead className="px-4 text-right text-xs font-semibold uppercase tracking-wider">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((author) => (
                <TableRow
                  key={author.id}
                  data-state={selected.has(author.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => setDrawerId(author.id)}
                >
                  <TableCell className="w-10 px-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(author.id)}
                      onCheckedChange={() => toggleOne(author.id)}
                      aria-label={`Selecionar ${author.name}`}
                    />
                  </TableCell>
                  <TableCell className="w-12 px-4">
                    {author.avatar?.url ? (
                      <Image
                        src={author.avatar.url}
                        alt={author.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {author.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    <button
                      type="button"
                      onClick={() => setDrawerId(author.id)}
                      className="text-left font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {author.name}
                    </button>
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">{author.slug}</TableCell>
                  <TableCell className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDrawerId(author.id)}
                        aria-label={`Editar ${author.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(author.id)}
                        aria-label={`Excluir ${author.name}`}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => fetchAuthors(currentPage - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => fetchAuthors(currentPage + 1)}>
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AuthorDrawer
        authorId={drawerId}
        onClose={() => setDrawerId(null)}
        onSaved={() => fetchAuthors(currentPage)}
      />

      <DeleteConfirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId !== null) handleDelete(deleteId); }}
        title="Excluir autor?"
        description="Esta acao nao pode ser desfeita. O autor sera permanentemente removido."
      />

      <DeleteConfirm
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={doBulkDelete}
        title={`Excluir ${selected.size} ${selected.size === 1 ? "autor" : "autores"}?`}
        description="Esta acao nao pode ser desfeita. Autores com posts vinculados nao serao excluidos."
      />
    </AdminShell>
  );
}
