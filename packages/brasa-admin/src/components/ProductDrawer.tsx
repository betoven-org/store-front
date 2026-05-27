"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Eye, EyeOff } from "lucide-react";
import Drawer from "./Drawer";
import Spinner from "./Spinner";
import FormField from "./FormField";
import RichTextEditor from "./RichTextEditor";
import ImageUpload from "./ImageUpload";
import { Button } from "@/components/ui/button";

type SelectOption = { value: string; label: string };

type Benefit = { title: string; subtitle: string };

type Props = {
  productId: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductDrawer({ productId, onClose, onSaved }: Props) {
  const open = productId !== null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("draft");
  const [featured, setFeatured] = useState(false);
  const [composition, setComposition] = useState("");
  const [usageInstructions, setUsageInstructions] = useState("");
  const [whoCanUse, setWhoCanUse] = useState("");
  const [benefits, setBenefits] = useState<Benefit[]>([{ title: "", subtitle: "" }]);
  const [differentials, setDifferentials] = useState<string[]>([""]);
  const [imageId, setImageId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [content, setContent] = useState<unknown>(null);
  const [contentHtml, setContentHtml] = useState<string>("");
  const [useHtmlEditor, setUseHtmlEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setSeoTitle("");
    setSeoDescription("");
    setCategoryId("");
    setStatus("draft");
    setFeatured(false);
    setComposition("");
    setUsageInstructions("");
    setWhoCanUse("");
    setBenefits([{ title: "", subtitle: "" }]);
    setDifferentials([""]);
    setImageId(null);
    setImageUrl(null);
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
        const [productRes, catRes] = await Promise.all([
          fetch(`/api/admin/products/${productId}`),
          fetch("/api/admin/product-categories?limit=200&parentOnly=true"),
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

        if (!productRes.ok) {
          onClose();
          return;
        }

        const product = await productRes.json();
        setName(product.name ?? "");
        setDescription(product.description ?? "");
        setSeoTitle(product.seoTitle ?? "");
        setSeoDescription(product.seoDescription ?? "");
        setCategoryId(product.productCategoryId ? String(product.productCategoryId) : "");
        setStatus(product.status ?? "draft");
        setFeatured(product.featured ?? false);
        setComposition(product.composition ?? "");
        setUsageInstructions(product.usageInstructions ?? "");
        setWhoCanUse(product.whoCanUse ?? "");
        setBenefits(
          Array.isArray(product.benefits) && product.benefits.length > 0
            ? product.benefits
            : [{ title: "", subtitle: "" }]
        );
        setDifferentials(
          Array.isArray(product.differentials) && product.differentials.length > 0
            ? product.differentials
            : [""]
        );
        setImageId(product.imageId ?? null);
        setImageUrl(product.imageUrl ?? null);

        // Detect HTML content from VTEX import
        const rawContent = product.content;
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
  }, [productId, open, onClose, resetForm]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Nome e obrigatorio";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setErrors({});

    try {
      const cleanedBenefits = benefits.filter((b) => b.title.trim() || b.subtitle.trim());
      const cleanedDifferentials = differentials.filter((d) => d.trim());

      // Build content: if HTML editor, wrap in {_html, type}; if TipTap, send as-is
      let finalContent = content;
      if (useHtmlEditor && contentHtml.trim()) {
        finalContent = {
          type: "doc",
          _html: contentHtml,
          content: [{ type: "paragraph", content: [{ type: "text", text: "__HTML__" }] }],
        };
      }

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          seoTitle: seoTitle.trim() || null,
          seoDescription: seoDescription.trim() || null,
          productCategoryId: categoryId ? Number(categoryId) : null,
          status,
          featured,
          composition: composition.trim() || null,
          usageInstructions: usageInstructions.trim() || null,
          whoCanUse: whoCanUse.trim() || null,
          benefits: cleanedBenefits,
          differentials: cleanedDifferentials,
          imageId: imageId || null,
          content: finalContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ form: data.error || "Erro ao atualizar produto" });
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

  // Benefits handlers
  const updateBenefit = (index: number, field: keyof Benefit, value: string) => {
    setBenefits((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };
  const addBenefit = () => setBenefits((prev) => [...prev, { title: "", subtitle: "" }]);
  const removeBenefit = (index: number) => setBenefits((prev) => prev.filter((_, i) => i !== index));

  // Differentials handlers
  const updateDifferential = (index: number, value: string) => {
    setDifferentials((prev) => prev.map((d, i) => (i === index ? value : d)));
  };
  const addDifferential = () => setDifferentials((prev) => [...prev, ""]);
  const removeDifferential = (index: number) => setDifferentials((prev) => prev.filter((_, i) => i !== index));

  return (
    <Drawer open={open} onClose={onClose} title="Editar Produto" maxWidth={showPreview ? "max-w-6xl" : "max-w-2xl"}>
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className={`flex flex-1 min-h-0 ${showPreview ? "gap-0" : ""}`}>
          {/* Preview iframe */}
          {showPreview && productId && (
            <div className="flex-1 border-r border-border flex flex-col min-w-0">
              <div className="flex items-center justify-between border-b border-border bg-background px-3 py-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Preview do produto</span>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <iframe
                src={`/api/admin/products/${productId}/preview-proxy`}
                className="flex-1 w-full border-0 bg-white"
                title="Preview do produto"
              />
            </div>
          )}
          <div className={`${showPreview ? "w-[480px] shrink-0" : "flex-1"} overflow-y-auto px-6 py-5`}>
            {errors.form && (
              <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors.form}
              </div>
            )}

            <div className="space-y-5">
              <FormField label="Nome" name="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required placeholder="Nome do produto" />

              <FormField label="Descrição" name="description" type="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição curta do produto" />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Categoria" name="categoryId" type="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} options={categories} placeholder="Selecione a categoria" />
                <FormField label="Status" name="status" type="select" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "draft", label: "Rascunho" }, { value: "published", label: "Publicado" }]} />
              </div>

              <FormField label="Destaque" name="featured" type="checkbox" value={featured} onChange={(e) => setFeatured((e.target as HTMLInputElement).checked)} description="Exibir este produto em destaque" />

              <FormField label="Composicao" name="composition" type="textarea" value={composition} onChange={(e) => setComposition(e.target.value)} placeholder="Cada capsula contem..." />

              <FormField label="Sugestao de uso" name="usageInstructions" type="textarea" value={usageInstructions} onChange={(e) => setUsageInstructions(e.target.value)} placeholder="Ingerir 2 capsulas ao dia..." />

              <FormField label="Quem pode usar?" name="whoCanUse" type="textarea" value={whoCanUse} onChange={(e) => setWhoCanUse(e.target.value)} placeholder="Indicado para..." />

              {/* Beneficios */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Beneficios</label>
                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="rounded-md border bg-muted/30 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Beneficio {index + 1}</span>
                        {benefits.length > 1 && (
                          <button type="button" onClick={() => removeBenefit(index)} className="text-muted-foreground transition-colors hover:text-destructive" aria-label={`Remover beneficio ${index + 1}`}>
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <input type="text" value={benefit.title} onChange={(e) => updateBenefit(index, "title", e.target.value)} placeholder="Título" aria-label={`Título do benefício ${index + 1}`} className="w-full rounded-md border bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
                        <input type="text" value={benefit.subtitle} onChange={(e) => updateBenefit(index, "subtitle", e.target.value)} placeholder="Subtítulo" aria-label={`Subtítulo do benefício ${index + 1}`} className="w-full rounded-md border bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addBenefit} className="mt-2 flex items-center gap-1.5 text-sm text-primary transition-opacity hover:opacity-80">
                  <Plus className="size-4" aria-hidden="true" />
                  Adicionar beneficio
                </button>
              </div>

              {/* Diferenciais */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Diferenciais</label>
                <div className="space-y-2">
                  {differentials.map((diff, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input type="text" value={diff} onChange={(e) => updateDifferential(index, e.target.value)} placeholder={`Diferencial ${index + 1}`} aria-label={`Diferencial ${index + 1}`} className="flex-1 rounded-md border bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
                      {differentials.length > 1 && (
                        <button type="button" onClick={() => removeDifferential(index)} className="shrink-0 text-muted-foreground transition-colors hover:text-destructive" aria-label={`Remover diferencial ${index + 1}`}>
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addDifferential} className="mt-2 flex items-center gap-1.5 text-sm text-primary transition-opacity hover:opacity-80">
                  <Plus className="size-4" aria-hidden="true" />
                  Adicionar diferencial
                </button>
              </div>

              {/* SEO */}
              <div className="rounded-md border bg-muted/20 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO</p>
                <div className="space-y-4">
                  <FormField label="Título da página" name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Título que aparece na aba do navegador e no Google" description={`${seoTitle.length}/70 caracteres`} />
                  <FormField label="Meta descrição" name="seoDescription" type="textarea" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Descrição que aparece nos resultados do Google" description={`${seoDescription.length}/160 caracteres`} />
                </div>
              </div>

              {/* Imagem principal */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Imagem principal</label>
                <ImageUpload value={imageId} onChange={(mediaId, mediaUrl) => { setImageId(mediaId); setImageUrl(mediaUrl); }} previewUrl={imageUrl} />
              </div>

              {/* Conteudo - HTML ou TipTap */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Conteudo do produto</label>
                  {contentHtml && (
                    <button
                      type="button"
                      onClick={() => setUseHtmlEditor(!useHtmlEditor)}
                      className="text-xs text-primary hover:underline"
                    >
                      {useHtmlEditor ? "Usar editor visual" : "Editar HTML"}
                    </button>
                  )}
                </div>
                {useHtmlEditor ? (
                  <div>
                    <textarea
                      value={contentHtml}
                      onChange={(e) => setContentHtml(e.target.value)}
                      rows={16}
                      className="w-full rounded-md border bg-card px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                      aria-label="Conteúdo HTML do produto"
                      placeholder="<h2>Conteudo HTML do produto</h2>"
                    />
                    {contentHtml && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Preview</summary>
                        <div className="prose prose-sm mt-2 max-w-none rounded-md border bg-card p-4" dangerouslySetInnerHTML={{ __html: contentHtml }} />
                      </details>
                    )}
                  </div>
                ) : (
                  <RichTextEditor content={content} onChange={setContent} />
                )}
              </div>
            </div>
          </div>
          </div>{/* close flex row */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showPreview ? "Fechar preview" : "Preview no site"}
            </button>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner className="size-4" />}
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Drawer>
  );
}
