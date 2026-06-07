"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AdminShell, FormField, RichTextEditor, ImageUpload, DeleteConfirm , BrasaPageLoader , BrasaLoader } from "@brasa/admin";
import Link from "next/link";

type SelectOption = { value: string; label: string };

type PostData = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: unknown;
  status: "draft" | "published";
  featured: boolean;
  categoryId: number | null;
  authorId: number | null;
  heroImageId: number | null;
  heroImageUrl: string | null;
  coverUrl: string | null;
  tags: { id: number; tag: string }[];
};

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [status, setStatus] = useState("draft");
  const [featured, setFeatured] = useState(false);
  const [heroImageId, setHeroImageId] = useState<number | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState<unknown>(null);

  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [authors, setAuthors] = useState<SelectOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [postRes, catRes, authRes] = await Promise.all([
          fetch(`/api/admin/posts/${id}`),
          fetch("/api/admin/categories"),
          fetch("/api/admin/authors"),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          const docs = catData.docs || catData;
          setCategories(
            docs.map((c: { id: number; name: string }) => ({
              value: String(c.id),
              label: c.name,
            }))
          );
        }

        if (authRes.ok) {
          const authData = await authRes.json();
          const docs = authData.docs || authData;
          setAuthors(
            docs.map((a: { id: number; name: string }) => ({
              value: String(a.id),
              label: a.name,
            }))
          );
        }

        if (!postRes.ok) {
          router.push("/admin/posts");
          return;
        }

        const post: PostData = await postRes.json();

        setTitle(post.title);
        setExcerpt(post.excerpt);
        setCategoryId(post.categoryId ? String(post.categoryId) : "");
        setAuthorId(post.authorId ? String(post.authorId) : "");
        setStatus(post.status);
        setFeatured(post.featured);
        setHeroImageId(post.heroImageId);
        setHeroImageUrl(post.heroImageUrl);
        setCoverUrl(post.coverUrl || "");
        setTagsInput(post.tags?.map((t) => t.tag).join(", ") || "");
        setContent(post.content);
      } catch {
        router.push("/admin/posts");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, router]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = "Título é obrigatório";
    if (!excerpt.trim()) newErrors.excerpt = "Excerpt e obrigatorio";
    if (!categoryId) newErrors.categoryId = "Categoria e obrigatoria";
    if (!authorId) newErrors.authorId = "Autor e obrigatorio";
    if (!content) newErrors.content = "Conteudo e obrigatorio";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    setErrors({});

    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const body = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        categoryId: Number(categoryId),
        authorId: Number(authorId),
        status,
        featured,
        heroImageId: heroImageId || null,
        coverUrl: coverUrl.trim() || null,
        tags: parsedTags,
      };

      const res = await fetch(`/api/admin/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ form: data.error || "Erro ao atualizar post" });
        return;
      }

      router.push("/admin/posts");
    } catch {
      setErrors({ form: "Erro de conexao. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      router.push("/admin/posts");
    } catch {
      setErrors({ form: "Erro ao excluir post." });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Editar Post">
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Editar Post">
      <div className="mb-4">
        <Link
          href="/admin/posts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar para posts
        </Link>
      </div>

      {errors.form && (
        <div className="mb-6 rounded-md border border-destructive/20 bg-danger-bg px-4 py-3 text-sm text-destructive">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Informações básicas
          </h2>

          <div className="space-y-4">
            <FormField
              label="Título"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              required
              placeholder="Título do post"
            />

            <FormField
              label="Excerpt"
              name="excerpt"
              type="textarea"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              error={errors.excerpt}
              required
              placeholder="Resumo do post"
              description="Breve descrição exibida nos cards e resultados de busca"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Categoria"
                name="categoryId"
                type="select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                error={errors.categoryId}
                required
                options={categories}
                placeholder="Selecione a categoria"
              />

              <FormField
                label="Autor"
                name="authorId"
                type="select"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                error={errors.authorId}
                required
                options={authors}
                placeholder="Selecione o autor"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Status"
                name="status"
                type="select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "draft", label: "Rascunho" },
                  { value: "published", label: "Publicado" },
                ]}
              />

              <FormField
                label="Destaque"
                name="featured"
                type="checkbox"
                value={featured}
                onChange={(e) =>
                  setFeatured((e.target as HTMLInputElement).checked)
                }
                description="Exibir este post em destaque na home"
              />
            </div>

            <FormField
              label="Tags"
              name="tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="saude, nutricao, bem-estar"
              description="Separadas por virgula"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Imagem de capa
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Upload de imagem
              </label>
              <ImageUpload
                value={heroImageId}
                onChange={(mediaId, mediaUrl) => {
                  setHeroImageId(mediaId);
                  setHeroImageUrl(mediaUrl);
                }}
                previewUrl={heroImageUrl}
              />
            </div>

            <FormField
              label="URL de capa externa"
              name="coverUrl"
              type="text"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              description="Alternativa ao upload. A URL externa sera usada se nenhuma imagem for enviada."
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Conteudo
          </h2>
          {errors.content && (
            <p className="mb-2 text-xs text-destructive">{errors.content}</p>
          )}
          <RichTextEditor content={content} onChange={setContent} />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/20 bg-card text-destructive text-[13px] font-medium h-8 px-3 transition-all hover:bg-danger-bg focus-visible:ring-2 focus-visible:ring-destructive/20 disabled:pointer-events-none disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 256 256"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
            </svg>
            {deleting ? "Excluindo..." : "Excluir Post"}
          </button>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/posts"
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow transition-colors hover:bg-background"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving && (
                <BrasaLoader size="sm" />
              )}
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </form>

      <DeleteConfirm
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Excluir post?"
        description="Esta acao nao pode ser desfeita. O post e suas tags serao permanentemente removidos."
      />
    </AdminShell>
  );
}
