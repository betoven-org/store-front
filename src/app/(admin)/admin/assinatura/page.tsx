"use client";

import { AdminShell, AssinaturaSection } from "@brasa/admin";

export default function AssinaturaPage() {
  return (
    <AdminShell title="Assinaturas">
      <div className="rounded-lg border border-border bg-card p-6">
        <AssinaturaSection />
      </div>
    </AdminShell>
  );
}
