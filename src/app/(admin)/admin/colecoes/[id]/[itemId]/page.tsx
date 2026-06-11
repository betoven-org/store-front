"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import {
  AdminShell,
  FormField,
  BrasaPageLoader,
  ToggleSwitch,
  DeleteConfirm,
} from "@brasa/admin";
import { Button } from "@/components/ui/button";

type CollectionField = {
  id: number;
  slug: string;
  name: string;
  type: string;
  required: boolean;
  sortOrder: number;
  config: any;
};

type CollectionInfo = {
  id: number;
  name: string;
  slug: string;
  fields: CollectionField[];
};

type ItemData = {
  id: number;
  slug: string;
  data: Record<string, any>;
  status: "draft" | "published";
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function ItemEditorPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string;
  const itemId = params.itemId as string;
  const isNew = itemId === "novo";

  const [collection, setCollection] = useState<CollectionInfo | null>(null);
  const [slug, setSlug] = useState("");
  const [data, setData] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [featured, setFeatured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Fetch collection info with fields
        const colRes = await fetch(`/api/admin/collections/${collectionId}`);
        if (!colRes.ok) throw new Error("Collection nao encontrada");
        const colData = await colRes.json();
        setCollection(colData);

        // If editing, fetch item
        if (!isNew) {
          const itemRes = await fetch(
            `/api/admin/collections/${collectionId}/items/${itemId}`,
          );
          if (!itemRes.ok) throw new Error("Item nao encontrado");
          const itemData: ItemData = await itemRes.json();
          setSlug(itemData.slug);
          setData(itemData.data ?? {});
          setStatus(itemData.status);
          setFeatured(itemData.featured);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao carregar dados",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [collectionId, itemId, isNew]);

  function updateField(fieldSlug: string, value: any) {
    setData((prev) => ({ ...prev, [fieldSlug]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) {
      toast.error("Slug e obrigatorio");
      return;
    }
    setSaving(true);
    try {
      const url = isNew
        ? `/api/admin/collections/${collectionId}/items`
        : `/api/admin/collections/${collectionId}/items/${itemId}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), data, status, featured }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao salvar item");
      }

      const saved = await res.json();
      toast.success(isNew ? "Item criado" : "Item salvo");

      if (isNew) {
        router.replace(`/admin/colecoes/${collectionId}/${saved.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/collections/${collectionId}/items/${itemId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao excluir item");
      }
      toast.success("Item excluido");
      router.push(`/admin/colecoes/${collectionId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title={isNew ? "Novo Item" : "Editar Item"}>
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  const fields = collection?.fields ?? [];

  return (
    <AdminShell title={isNew ? "Novo Item" : "Editar Item"}>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/admin/colecoes/${collectionId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para {collection?.name ?? "Collection"}
        </Link>
      </div>

      <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-6">
        {/* Slug + Status + Featured */}
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Configuracoes</h2>

          <FormField
            label="Slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ex: meu-item"
            required
          />

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Status
              </label>
              <p className="text-xs text-muted-foreground">
                {status === "published" ? "Publicado" : "Rascunho"}
              </p>
            </div>
            <ToggleSwitch
              checked={status === "published"}
              onChange={(checked) =>
                setStatus(checked ? "published" : "draft")
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                Destaque
              </label>
              <p className="text-xs text-muted-foreground">
                Marcar como item em destaque
              </p>
            </div>
            <ToggleSwitch
              checked={featured}
              onChange={setFeatured}
            />
          </div>
        </div>

        {/* Dynamic fields */}
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Campos</h2>

          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Esta collection nao tem campos definidos.{" "}
              <Link
                href={`/admin/colecoes/${collectionId}/configurar`}
                className="text-foreground underline"
              >
                Configurar campos
              </Link>
            </p>
          ) : (
            fields.map((field) => (
              <DynamicField
                key={field.id}
                field={field}
                value={data[field.slug]}
                onChange={(val) => updateField(field.slug, val)}
              />
            ))
          )}
        </div>

        {/* Save / Delete */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || deleting}>
            <Save className="size-4" />
            {saving ? "Salvando..." : isNew ? "Criar Item" : "Salvar Alteracoes"}
          </Button>
          <Link
            href={`/admin/colecoes/${collectionId}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-foreground text-[13px] font-medium h-8 px-3 transition-all hover:bg-accent"
          >
            Cancelar
          </Link>
          {!isNew && (
            <Button
              type="button"
              variant="destructive"
              disabled={saving || deleting}
              onClick={() => setShowDelete(true)}
              className="ml-auto"
            >
              <Trash2 className="size-4" />
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          )}
        </div>
      </form>

      <DeleteConfirm
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Excluir este item?"
        description="Esta acao nao pode ser desfeita. O item sera movido para a lixeira."
      />
    </AdminShell>
  );
}

// ── Dynamic Field Renderer ──────────────────────────────────────────────────

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: {
    slug: string;
    name: string;
    type: string;
    required: boolean;
    config: any;
  };
  value: any;
  onChange: (val: any) => void;
}) {
  const { type, name, slug, required, config } = field;

  switch (type) {
    case "text":
      return (
        <FormField
          label={name}
          name={slug}
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      );

    case "long_text":
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {name}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <textarea
            name={slug}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            rows={5}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 resize-y"
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {name}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <input
            type="number"
            name={slug}
            value={value ?? ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
            required={required}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
          />
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-foreground">
              {name}
            </label>
          </div>
          <ToggleSwitch
            checked={!!value}
            onChange={onChange}
          />
        </div>
      );

    case "date":
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {name}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <input
            type="datetime-local"
            name={slug}
            value={value ? value.slice(0, 16) : ""}
            onChange={(e) => onChange(e.target.value || null)}
            required={required}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
          />
        </div>
      );

    case "image":
      return (
        <FormField
          label={name}
          name={slug}
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL da imagem"
          required={required}
        />
      );

    case "url":
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {name}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <input
            type="url"
            name={slug}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            required={required}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
          />
        </div>
      );

    case "select": {
      const options: { value: string; label: string }[] = config?.options ?? [];
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {name}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <select
            name={slug}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            required={required}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
          >
            <option value="">Selecione...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    case "reference":
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {name}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <input
            type="number"
            name={slug}
            value={value ?? ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder="ID de referencia"
            required={required}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
          />
        </div>
      );

    case "json":
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {name}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <textarea
            name={slug}
            value={
              typeof value === "string"
                ? value
                : value != null
                  ? JSON.stringify(value, null, 2)
                  : ""
            }
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            rows={6}
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 resize-y"
            placeholder='{ "key": "value" }'
          />
        </div>
      );

    default:
      return (
        <FormField
          label={name}
          name={slug}
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      );
  }
}
