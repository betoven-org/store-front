"use client";

import { useState, useEffect } from "react";
import Drawer from "./Drawer";
import Spinner from "./Spinner";
import FormField from "./FormField";
import ImageUpload from "./ImageUpload";
import { Button } from "@/components/ui/button";

type Props = {
  categoryId: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductCategoryDrawer({ categoryId, onClose, onSaved }: Props) {
  const open = categoryId !== null;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState<string>("0");
  const [imageId, setImageId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setName("");
    setSlug("");
    setDescription("");
    setSortOrder("0");
    setImageId(null);
    setImageUrl(null);
    setErrors({});

    const loadData = async () => {
      try {
        const catRes = await fetch(`/api/admin/product-categories/${categoryId}`);

        if (!catRes.ok) { onClose(); return; }

        const data = await catRes.json();
        setName(data.name ?? "");
        setSlug(data.slug ?? "");
        setDescription(data.description ?? "");
        setSortOrder(data.sortOrder != null ? String(data.sortOrder) : "0");
        setImageId(data.imageId ?? null);
        setImageUrl(data.imageUrl ?? null);
      } catch {
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [categoryId, open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrors({ name: "Nome e obrigatorio" });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(`/api/admin/product-categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          imageId: imageId ?? null,
          sortOrder: sortOrder !== "" ? Number(sortOrder) : 0,
        }),
      });

      if (res.status === 409) {
        setErrors({ form: "Ja existe uma categoria com esse nome/slug." });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({ form: data.error || "Erro ao atualizar categoria de produto" });
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
    <Drawer open={open} onClose={onClose} title="Editar Categoria de Produto" maxWidth="max-w-lg">
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
              <FormField
                label="Nome"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                required
                placeholder="Nome da categoria"
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Slug</label>
                <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {slug}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  O slug e gerado automaticamente e nao pode ser alterado.
                </p>
              </div>

              <FormField
                label="Descrição"
                name="description"
                type="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
                placeholder="Descrição da categoria (opcional)"
              />

              <FormField
                label="Ordem"
                name="sortOrder"
                type="text"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                error={errors.sortOrder}
                placeholder="0"
                description="Menor numero aparece primeiro."
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Imagem</label>
                <ImageUpload
                  value={imageId}
                  onChange={(id, url) => {
                    setImageId(id);
                    setImageUrl(url ?? null);
                  }}
                  previewUrl={imageUrl ?? undefined}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
