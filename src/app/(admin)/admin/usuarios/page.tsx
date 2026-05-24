"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { AdminShell, DeleteConfirm, UserDrawer, Spinner } from "@brasa/admin";
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

type Role = "admin" | "editor" | "author" | "viewer";

type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

type ApiResponse = {
  docs: User[];
  totalPages: number;
  page: number;
};

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  author: "Autor",
  viewer: "Visualizador",
};

const ROLE_CLASSES: Record<Role, string> = {
  admin: "bg-primary/10 text-primary",
  editor: "bg-primary/10 text-primary",
  author: "bg-warning-bg text-warning",
  viewer: "bg-accent text-muted-foreground",
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_CLASSES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length >= 2
      ? parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      : parts[0].charAt(0);
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground select-none">
      {letters.toUpperCase()}
    </div>
  );
}

export default function UsuariosPage() {
  const [data, setData] = useState<User[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [drawerId, setDrawerId] = useState<number | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?page=${page}`);
      if (res.status === 403) {
        setError("Voce nao tem permissao para acessar esta pagina.");
        return;
      }
      if (!res.ok) throw new Error("Erro ao carregar usuarios.");
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
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: number) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Erro ao excluir usuario.");
        return;
      }
      fetchUsers(currentPage);
    } catch {
      setError("Erro ao excluir usuario.");
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const deleteTarget = data.find((u) => u.id === deleteId);

  const allSelected = data.length > 0 && selected.size === data.length;
  const someSelected = selected.size > 0 && selected.size < data.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(data.map((u) => u.id)));
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
    <AdminShell title="Usuarios">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gerencie os usuarios com acesso ao painel.</p>
        <Button onClick={() => setDrawerId(-1)}>
          <Plus />
          Novo Usuario
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Fechar
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Users className="mx-auto mb-4 size-12 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nenhum usuario encontrado.</p>
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
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">
                  Nome
                </TableHead>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">
                  Email
                </TableHead>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">
                  Permissao
                </TableHead>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">
                  Data
                </TableHead>
                <TableHead className="px-4 text-right text-xs font-semibold uppercase tracking-wider">
                  Acoes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((user) => (
                <TableRow
                  key={user.id}
                  data-state={selected.has(user.id) ? "selected" : undefined}
                >
                  <TableCell className="w-10 px-4">
                    <Checkbox
                      checked={selected.has(user.id)}
                      onCheckedChange={() => toggleOne(user.id)}
                      aria-label={`Selecionar ${user.name}`}
                    />
                  </TableCell>
                  <TableCell className="w-12 px-4">
                    <Initials name={user.name} />
                  </TableCell>
                  <TableCell className="px-4">
                    <button
                      type="button"
                      onClick={() => setDrawerId(user.id)}
                      className="text-left font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {user.name}
                    </button>
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="px-4">
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="px-4 text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDrawerId(user.id)}
                        aria-label={`Editar ${user.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(user.id)}
                        aria-label={`Excluir ${user.name}`}
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchUsers(currentPage - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchUsers(currentPage + 1)}
                >
                  Proximo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <UserDrawer
        userId={drawerId}
        onClose={() => setDrawerId(null)}
        onSaved={() => fetchUsers(currentPage)}
      />

      <DeleteConfirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId !== null) handleDelete(deleteId); }}
        title="Excluir usuario?"
        description={
          deleteTarget
            ? `Voce esta prestes a excluir "${deleteTarget.name}" (${deleteTarget.email}). Esta acao nao pode ser desfeita.`
            : "Esta acao nao pode ser desfeita."
        }
      />
    </AdminShell>
  );
}
