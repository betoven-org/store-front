"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AdminShell, FormField, ImageUpload, DeleteConfirm , BrasaPageLoader } from "@brasa/admin";

export default function EditarAutorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const res = await fetch(`/api/admin/authors/${id}`);
        if (!res.ok) throw new Error("Autor nao encontrado.");
        const data = await res.json();
        setName(data.name || "");
        setSlug(data.slug || "");
        setBio(data.bio || "");
        if (data.avatar) {
          if (typeof data.avatar === "object") {
            setAvatarId(data.avatar.id);
            setAvatarUrl(data.avatar.url || null);
          } else {
            setAvatarId(data.avatar);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar autor.");
      } finally {
        setLoading(false);
      }
    };

    fetchAuthor();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/authors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          avatar: avatarId,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao atualizar autor.");
      }

      router.push("/admin/autores");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/authors/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error || "Erro ao excluir autor.");
        return;
      }

      router.push("/admin/autores");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir autor.");
    }
  };

  if (loading) {
    return (
      <AdminShell title="Editar Autor">
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Editar Autor">
      <div className="mb-6 flex items-center justify-between">
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

        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/20 bg-card text-destructive text-[13px] font-medium h-8 px-3 transition-all hover:bg-danger-bg focus-visible:ring-2 focus-visible:ring-destructive/20 disabled:pointer-events-none disabled:opacity-50"
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
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Slug</label>
            <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {slug}
            </p>
            <p className="text-xs text-muted-foreground">O slug e gerado automaticamente e nao pode ser alterado.</p>
          </div>

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
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Alteracoes"}
          </button>
          <Link
            href="/admin/autores"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-foreground text-[13px] font-medium h-8 px-3 transition-all hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <DeleteConfirm
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Excluir autor?"
        description="Esta acao nao pode ser desfeita. O autor sera permanentemente removido."
      />
    </AdminShell>
  );
}
