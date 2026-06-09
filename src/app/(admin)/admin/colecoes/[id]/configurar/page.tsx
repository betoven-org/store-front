"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AdminShell, FormField, BrasaPageLoader, ToggleSwitch } from "@brasa/admin";
import { Button } from "@/components/ui/button";

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "long_text", label: "Texto Longo" },
  { value: "number", label: "Numero" },
  { value: "boolean", label: "Booleano" },
  { value: "date", label: "Data" },
  { value: "image", label: "Imagem" },
  { value: "url", label: "URL" },
  { value: "select", label: "Select" },
  { value: "reference", label: "Referencia" },
  { value: "json", label: "JSON" },
];

type CollectionField = {
  id?: number;
  slug: string;
  name: string;
  type: string;
  required: boolean;
  sortOrder: number;
  config: any;
  _isNew?: boolean;
  _deleted?: boolean;
};

type CollectionData = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  source: "local" | "synced";
  syncConfig: any;
  fields: CollectionField[];
};

export default function ConfigurarCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Collection info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");
  const [source, setSource] = useState<"local" | "synced">("local");

  // Sync config (for synced collections)
  const [syncConfig, setSyncConfig] = useState<string>("");

  // Fields
  const [fields, setFields] = useState<CollectionField[]>([]);
  const [expandedField, setExpandedField] = useState<number | null>(null);

  // New field form
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldSlug, setNewFieldSlug] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/collections/${collectionId}`);
        if (!res.ok) throw new Error("Collection nao encontrada");
        const data: CollectionData = await res.json();
        setName(data.name);
        setSlug(data.slug);
        setIcon(data.icon ?? "");
        setSource(data.source);
        setSyncConfig(
          data.syncConfig ? JSON.stringify(data.syncConfig, null, 2) : "",
        );
        setFields(
          (data.fields ?? []).map((f) => ({
            ...f,
            _isNew: false,
            _deleted: false,
          })),
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao carregar collection",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [collectionId]);

  function handleNewFieldNameChange(val: string) {
    setNewFieldName(val);
    setNewFieldSlug(
      val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/(^_|_$)/g, ""),
    );
  }

  function addField() {
    if (!newFieldName.trim() || !newFieldSlug.trim()) {
      toast.error("Nome e slug sao obrigatorios");
      return;
    }
    if (fields.some((f) => !f._deleted && f.slug === newFieldSlug)) {
      toast.error("Ja existe um campo com esse slug");
      return;
    }
    setFields((prev) => [
      ...prev,
      {
        slug: newFieldSlug.trim(),
        name: newFieldName.trim(),
        type: newFieldType,
        required: newFieldRequired,
        sortOrder: prev.length,
        config: null,
        _isNew: true,
        _deleted: false,
      },
    ]);
    setNewFieldName("");
    setNewFieldSlug("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setShowAddField(false);
    toast.success("Campo adicionado (salve para confirmar)");
  }

  function removeField(index: number) {
    setFields((prev) => {
      const next = [...prev];
      if (next[index]._isNew) {
        next.splice(index, 1);
      } else {
        next[index] = { ...next[index], _deleted: true };
      }
      return next;
    });
  }

  function updateFieldProp(index: number, key: string, value: any) {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  function moveField(index: number, direction: "up" | "down") {
    setFields((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((f, i) => ({ ...f, sortOrder: i }));
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e slug sao obrigatorios");
      return;
    }
    setSaving(true);

    let parsedSyncConfig = null;
    if (source === "synced" && syncConfig.trim()) {
      try {
        parsedSyncConfig = JSON.parse(syncConfig);
      } catch {
        toast.error("syncConfig invalido: JSON mal formatado");
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          icon: icon.trim() || null,
          source,
          syncConfig: parsedSyncConfig,
          fields: fields
            .filter((f) => !f._deleted)
            .map((f, i) => ({
              id: f._isNew ? undefined : f.id,
              slug: f.slug,
              name: f.name,
              type: f.type,
              required: f.required,
              sortOrder: i,
              config: f.config,
            })),
          deletedFieldIds: fields
            .filter((f) => f._deleted && f.id)
            .map((f) => f.id),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao salvar");
      }

      toast.success("Collection salva");
      router.push(`/admin/colecoes/${collectionId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Configurar Collection">
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  const activeFields = fields.filter((f) => !f._deleted);

  return (
    <AdminShell title="Configurar Collection">
      <div className="mb-6">
        <Link
          href={`/admin/colecoes/${collectionId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para {name || "Collection"}
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">
            Informacoes Gerais
          </h2>

          <FormField
            label="Nome"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <FormField
            label="Slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />

          <FormField
            label="Icone (emoji)"
            name="icon"
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="Ex: 📝"
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Origem
            </label>
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as "local" | "synced")
              }
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
            >
              <option value="local">Local</option>
              <option value="synced">Sincronizada (Supabase)</option>
            </select>
          </div>
        </div>

        {/* Sync Config (only for synced) */}
        {source === "synced" && (
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">
              Configuracao de Sync
            </h2>
            <p className="text-xs text-muted-foreground">
              JSON com supabaseTable, matchColumn e fieldMap para sincronizacao
              automatica.
            </p>
            <textarea
              value={syncConfig}
              onChange={(e) => setSyncConfig(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 resize-y"
              placeholder={`{
  "supabaseTable": "products",
  "matchColumn": "slug",
  "fieldMap": {
    "name": "name",
    "description": "description"
  }
}`}
            />
          </div>
        )}

        {/* Fields Manager */}
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Campos ({activeFields.length})
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddField(true)}
            >
              <Plus className="size-3" />
              Novo Campo
            </Button>
          </div>

          {activeFields.length === 0 && !showAddField && (
            <p className="text-sm text-muted-foreground">
              Nenhum campo definido. Adicione campos para estruturar os itens
              desta collection.
            </p>
          )}

          {/* Existing fields */}
          <div className="space-y-2">
            {fields.map((field, index) => {
              if (field._deleted) return null;
              const isExpanded = expandedField === index;
              return (
                <div
                  key={field.id ?? `new-${index}`}
                  className="rounded-md border border-border bg-background"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveField(index, "up")}
                        disabled={index === 0}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Mover para cima"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(index, "down")}
                        disabled={
                          index ===
                          fields.filter((f) => !f._deleted).length - 1
                        }
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Mover para baixo"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedField(isExpanded ? null : index)
                      }
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {field.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({field.type})
                      </span>
                      {field.required && (
                        <span className="text-xs text-destructive">*</span>
                      )}
                      {field._isNew && (
                        <span className="text-[10px] text-success font-medium">
                          NOVO
                        </span>
                      )}
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeField(index)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remover campo ${field.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-border px-3 py-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-muted-foreground">
                            Nome
                          </label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) =>
                              updateFieldProp(index, "name", e.target.value)
                            }
                            className="h-8 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-muted-foreground">
                            Slug
                          </label>
                          <input
                            type="text"
                            value={field.slug}
                            onChange={(e) =>
                              updateFieldProp(index, "slug", e.target.value)
                            }
                            className="h-8 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-muted-foreground">
                            Tipo
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateFieldProp(index, "type", e.target.value)
                            }
                            className="h-8 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center gap-2">
                            <ToggleSwitch
                              checked={field.required}
                              onChange={(val) =>
                                updateFieldProp(index, "required", val)
                              }
                              size="sm"
                            />
                            <label className="text-xs text-muted-foreground">
                              Obrigatorio
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-muted-foreground">
                          Config (JSON avancado)
                        </label>
                        <textarea
                          value={
                            field.config
                              ? JSON.stringify(field.config, null, 2)
                              : ""
                          }
                          onChange={(e) => {
                            try {
                              updateFieldProp(
                                index,
                                "config",
                                e.target.value
                                  ? JSON.parse(e.target.value)
                                  : null,
                              );
                            } catch {
                              // Allow invalid JSON while typing
                            }
                          }}
                          rows={3}
                          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-foreground/30 resize-y"
                          placeholder='{ "options": [{ "value": "a", "label": "A" }] }'
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add field form */}
          {showAddField && (
            <div className="space-y-3 rounded-md border border-dashed border-foreground/20 bg-muted/30 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Novo Campo
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => handleNewFieldNameChange(e.target.value)}
                    placeholder="Ex: Titulo"
                    className="h-8 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={newFieldSlug}
                    onChange={(e) => setNewFieldSlug(e.target.value)}
                    placeholder="ex: titulo"
                    className="h-8 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Tipo
                  </label>
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                    className="h-8 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      checked={newFieldRequired}
                      onChange={setNewFieldRequired}
                      size="sm"
                    />
                    <label className="text-xs text-muted-foreground">
                      Obrigatorio
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={addField}>
                  Adicionar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddField(false);
                    setNewFieldName("");
                    setNewFieldSlug("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            <Save className="size-4" />
            {saving ? "Salvando..." : "Salvar Configuracoes"}
          </Button>
          <Link
            href={`/admin/colecoes/${collectionId}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-foreground text-[13px] font-medium h-8 px-3 transition-all hover:bg-accent"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </AdminShell>
  );
}
