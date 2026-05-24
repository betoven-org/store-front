"use client";

import { useState, useEffect } from "react";
import Drawer from "./Drawer";
import Spinner from "./Spinner";
import FormField from "./FormField";
import { Button } from "@/components/ui/button";

type Props = {
  categoryId: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function CategoryDrawer({ categoryId, onClose, onSaved }: Props) {
  const open = categoryId !== null;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setName("");
    setSlug("");
    setErrors({});

    const loadData = async () => {
      try {
        const res = await fetch(`/api/admin/categories/${categoryId}`);
        if (!res.ok) { onClose(); return; }
        const data = await res.json();
        setName(data.name);
        setSlug(data.slug);
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
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.status === 409) {
        setErrors({ form: "Ja existe uma categoria com esse nome/slug." });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({ form: data.error || "Erro ao atualizar categoria" });
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
    <Drawer open={open} onClose={onClose} title="Editar Categoria" maxWidth="max-w-md">
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
              <FormField label="Nome" name="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required placeholder="Nome da categoria" />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Slug</label>
                <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">{slug}</p>
                <p className="text-xs text-muted-foreground">O slug e gerado automaticamente e nao pode ser alterado.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
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
