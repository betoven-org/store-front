"use client";

import { useState, useEffect, useCallback } from "react";
import Drawer from "./Drawer";
import Spinner from "./Spinner";
import FormField from "./FormField";
import RichTextEditor from "./RichTextEditor";
import ImageUpload from "./ImageUpload";
import { Button } from "@/components/ui/button";

type SelectOption = { value: string; label: string };

type Props = {
  postId: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function PostDrawer({ postId, onClose, onSaved }: Props) {
  const open = postId !== null;

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
  const [contentHtml, setContentHtml] = useState("");
  const [useHtmlEditor, setUseHtmlEditor] = useState(false);

  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [authors, setAuthors] = useState<SelectOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setTitle("");
    setExcerpt("");
    setCategoryId("");
    setAuthorId("");
    setStatus("draft");
    setFeatured(false);
    setHeroImageId(null);
    setHeroImageUrl(null);
    setCoverUrl("");
    setTagsInput("");
    setContent(null);
    setContentHtml("");
    setUseHtmlEditor(false);
    setErrors({});
  }, []);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    resetForm();

    const loadData = async () => {
      try {
        const [postRes, catRes, authRes] = await Promise.all([
          fetch(`/api/admin/posts/${postId}`),
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
          onClose();
          return;
        }

        const post = await postRes.json();
        setTitle(post.title);
        setExcerpt(post.excerpt);
        setCategoryId(post.categoryId ? String(post.categoryId) : "");
        setAuthorId(post.authorId ? String(post.authorId) : "");
        setStatus(post.status);
        setFeatured(post.featured);
        setHeroImageId(post.heroImageId);
        setHeroImageUrl(post.heroImageUrl);
        setCoverUrl(post.coverUrl || "");
        setTagsInput(post.tags?.map((t: { tag: string }) => t.tag).join(", ") || "");
        // Detect markdown/HTML content from Supabase
        const rawContent = post.content;
        if (rawContent && typeof rawContent === "object" && rawContent._html) {
          setContentHtml(rawContent._html);
          setUseHtmlEditor(true);
          setContent(rawContent);
        } else {
          setContent(rawContent ?? null);
          setUseHtmlEditor(false);
        }
      } catch {
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [postId, open, onClose, resetForm]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Titulo e obrigatorio";
    // excerpt is optional for Supabase-synced posts
    if (!categoryId) newErrors.categoryId = "Categoria e obrigatoria";
    if (!authorId) newErrors.authorId = "Autor e obrigatorio";
    if (!content && !contentHtml.trim()) newErrors.content = "Conteudo e obrigatorio";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setErrors({});

    try {
      const parsedTags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

      let finalContent = content;
      if (useHtmlEditor && contentHtml.trim()) {
        finalContent = { type: "doc", _html: contentHtml };
      }

      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          excerpt: excerpt.trim(),
          content: finalContent,
          categoryId: Number(categoryId),
          authorId: Number(authorId),
          status,
          featured,
          heroImageId: heroImageId || null,
          coverUrl: coverUrl.trim() || null,
          tags: parsedTags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ form: data.error || "Erro ao atualizar post" });
        return;
      }

      onSaved();
      onClose();
    } catch {
      setErrors({ form: "Erro de conexao. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Editar Post">
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {errors.form && (
              <div className="mb-5 rounded-md border border-destructive/20 bg-danger-bg px-4 py-3 text-sm text-destructive">
                {errors.form}
              </div>
            )}

            <div className="space-y-5">
              <FormField label="Titulo" name="title" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} required placeholder="Titulo do post" />
              <FormField label="Excerpt" name="excerpt" type="textarea" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} error={errors.excerpt} required placeholder="Resumo do post" description="Breve descricao exibida nos cards e resultados de busca" />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Categoria" name="categoryId" type="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.categoryId} required options={categories} placeholder="Selecione a categoria" />
                <FormField label="Autor" name="authorId" type="select" value={authorId} onChange={(e) => setAuthorId(e.target.value)} error={errors.authorId} required options={authors} placeholder="Selecione o autor" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Status" name="status" type="select" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "draft", label: "Rascunho" }, { value: "published", label: "Publicado" }]} />
                <FormField label="Destaque" name="featured" type="checkbox" value={featured} onChange={(e) => setFeatured((e.target as HTMLInputElement).checked)} description="Exibir este post em destaque na home" />
              </div>

              <FormField label="Tags" name="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="saude, nutricao, bem-estar" description="Separadas por virgula" />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Imagem de capa</label>
                <ImageUpload value={heroImageId} onChange={(mediaId, mediaUrl) => { setHeroImageId(mediaId); setHeroImageUrl(mediaUrl); }} previewUrl={heroImageUrl} />
              </div>

              <FormField label="URL de capa externa" name="coverUrl" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" description="Alternativa ao upload" />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Conteudo<span className="ml-0.5 text-destructive">*</span></label>
                  {contentHtml && (
                    <button
                      type="button"
                      onClick={() => setUseHtmlEditor(!useHtmlEditor)}
                      className="text-xs text-primary hover:underline"
                    >
                      {useHtmlEditor ? "Usar editor visual" : "Editar Markdown"}
                    </button>
                  )}
                </div>
                {errors.content && <p className="mb-2 text-xs text-destructive">{errors.content}</p>}
                {useHtmlEditor ? (
                  <textarea
                    value={contentHtml}
                    onChange={(e) => setContentHtml(e.target.value)}
                    rows={16}
                    className="w-full rounded-md border bg-card px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                    placeholder="Conteudo em Markdown..."
                  />
                ) : (
                  <RichTextEditor content={content} onChange={setContent} />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
