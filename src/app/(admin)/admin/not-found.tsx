"use client";

import Link from "next/link";
import { AdminShell } from "@brasa/admin";
import { FileQuestion } from "lucide-react";

export default function AdminNotFound() {
  return (
    <AdminShell title="Pagina nao encontrada">
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">
          Pagina nao encontrada
        </h2>

        <p className="max-w-md text-muted-foreground">
          A pagina que voce esta procurando nao existe ou foi movida. Verifique o
          endereco ou volte ao painel.
        </p>

        <Link
          href="/admin"
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Voltar ao painel
        </Link>
      </div>
    </AdminShell>
  );
}
