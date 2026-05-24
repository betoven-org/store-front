"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminShell, FormField, ImageUpload } from "@brasa/admin";

export default function NovoAutorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          avatar: avatarId,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao criar autor.");
      }

      router.push("/admin/autores");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Novo Autor">
      <div className="mb-6">
        <Link
          href="/admin/autores"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 256 256"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
          </svg>
          Voltar para Autores
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-danger-bg p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <FormField
            label="Nome"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex: Dr. Joao Silva"
          />

          <FormField
            label="Biografia"
            name="bio"
            type="textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Breve biografia do autor..."
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Avatar</label>
            <ImageUpload
              value={avatarId}
              onChange={(id, url) => {
                setAvatarId(id);
                setAvatarUrl(url);
              }}
              previewUrl={avatarUrl}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Criar Autor"}
          </button>
          <Link
            href="/admin/autores"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </AdminShell>
  );
}
