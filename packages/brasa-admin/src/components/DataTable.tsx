"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import DeleteConfirm from "./DeleteConfirm";

type Column<T> = {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  totalPages: number;
  currentPage: number;
  baseUrl: string;
  onDelete?: (id: number) => void;
  editUrl?: (item: T) => string;
};

export default function DataTable<T extends { id: number; status?: string }>({
  columns,
  data,
  totalPages,
  currentPage,
  baseUrl,
  onDelete,
  editUrl,
}: Props<T>) {
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const getValue = (item: T, key: string): unknown => {
    return (item as Record<string, unknown>)[key];
  };

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 256 256"
          fill="currentColor"
          className="mx-auto mb-4 text-muted-foreground"
          aria-hidden="true"
        >
          <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208Zm-32-80a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,128Z" />
        </svg>
        <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
      </div>
    );
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const separator = baseUrl.includes("?") ? "&" : "?";

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {col.label}
                  </th>
                ))}
                {(editUrl || onDelete) && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-background"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3 text-foreground"
                    >
                      {col.render ? (
                        col.render(item)
                      ) : col.key === "status" ? (
                        <StatusBadge
                          status={
                            (getValue(item, col.key) as "draft" | "published") ||
                            "draft"
                          }
                        />
                      ) : (
                        String(getValue(item, col.key) ?? "")
                      )}
                    </td>
                  ))}
                  {(editUrl || onDelete) && (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editUrl && (
                          <Link
                            href={editUrl(item)}
                            className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 256 256"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z" />
                            </svg>
                            Editar
                          </Link>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-danger-bg"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 256 256"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
                            </svg>
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Pagina {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              {hasPrev ? (
                <Link
                  href={`${baseUrl}${separator}page=${currentPage - 1}`}
                  className="rounded border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
                >
                  Anterior
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded border border-border bg-accent px-3 py-1.5 text-sm font-medium text-muted-foreground">
                  Anterior
                </span>
              )}
              {hasNext ? (
                <Link
                  href={`${baseUrl}${separator}page=${currentPage + 1}`}
                  className="rounded border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
                >
                  Próximo
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded border border-border bg-accent px-3 py-1.5 text-sm font-medium text-muted-foreground">
                  Próximo
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <DeleteConfirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId !== null && onDelete) {
            onDelete(deleteId);
          }
        }}
      />
    </>
  );
}
