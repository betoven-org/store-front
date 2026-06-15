"use client";

import { useState, useEffect, useCallback } from "react";
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
  Zap,
  Loader2,
  RefreshCw,
  X,
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
  pageSlugPattern: string | null;
  fields: CollectionField[];
};

type IntrospectColumn = {
  name: string;
  type: string;
  cmsType: string;
};

type IntrospectResult = {
  table: string;
  columns: IntrospectColumn[];
  sample: Record<string, unknown>;
  suggestedMatchColumn: string;
  suggestedFieldMap: Record<string, string>;
  suggestedFields: Array<{
    slug: string;
    name: string;
    type: string;
    required: boolean;
    sortOrder: number;
  }>;
};

type FieldMapEntry = {
  supabaseCol: string;
  cmsField: string;
  enabled: boolean;
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

  // Auto-detect state
  const [sbTables, setSbTables] = useState<string[]>([]);
  const [sbTablesLoading, setSbTablesLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [matchColumn, setMatchColumn] = useState("id");
  const [fieldMapEntries, setFieldMapEntries] = useState<FieldMapEntry[]>([]);
  const [introspecting, setIntrospecting] = useState(false);
  const [introspectResult, setIntrospectResult] = useState<IntrospectResult | null>(null);
  const [useAutoDetect, setUseAutoDetect] = useState(false);

  // Collection pages
  const [pageSlugPattern, setPageSlugPattern] = useState("");

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
        setPageSlugPattern(data.pageSlugPattern ?? "");
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

  // ── Auto-detect helpers ─────────────────────────────────────────────────

  const loadSupabaseTables = useCallback(async () => {
    setSbTablesLoading(true);
    try {
      const res = await fetch("/api/admin/integrations/supabase/introspect");
      if (!res.ok) throw new Error("Erro ao listar tabelas");
      const data = await res.json();
      setSbTables(data.tables || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar ao Supabase");
    } finally {
      setSbTablesLoading(false);
    }
  }, []);

  // Load tables when switching to synced + auto-detect mode
  useEffect(() => {
    if (source === "synced" && useAutoDetect && sbTables.length === 0 && !sbTablesLoading) {
      loadSupabaseTables();
    }
  }, [source, useAutoDetect, sbTables.length, sbTablesLoading, loadSupabaseTables]);

  // Initialize auto-detect state from existing syncConfig
  useEffect(() => {
    if (source === "synced" && syncConfig.trim()) {
      try {
        const parsed = JSON.parse(syncConfig);
        if (parsed.supabaseTable) {
          setSelectedTable(parsed.supabaseTable);
          setMatchColumn(parsed.matchColumn || "id");
          if (parsed.fieldMap) {
            setFieldMapEntries(
              Object.entries(parsed.fieldMap).map(([supabaseCol, cmsField]) => ({
                supabaseCol,
                cmsField: cmsField as string,
                enabled: true,
              })),
            );
            setUseAutoDetect(true);
          }
        }
      } catch {
        // Invalid JSON — keep textarea mode
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleIntrospect(table: string) {
    setIntrospecting(true);
    try {
      const res = await fetch(
        `/api/admin/integrations/supabase/introspect?table=${encodeURIComponent(table)}`,
      );
      if (!res.ok) throw new Error("Erro ao introspect tabela");
      const data: IntrospectResult = await res.json();
      setIntrospectResult(data);
      setMatchColumn(data.suggestedMatchColumn);

      // Build fieldMap entries from suggestion
      setFieldMapEntries(
        Object.entries(data.suggestedFieldMap).map(([supabaseCol, cmsField]) => ({
          supabaseCol,
          cmsField,
          enabled: true,
        })),
      );

      // Auto-create collection fields from suggestion (only new ones)
      const existingSlugs = new Set(fields.filter((f) => !f._deleted).map((f) => f.slug));
      const newFields: CollectionField[] = data.suggestedFields
        .filter((sf) => !existingSlugs.has(sf.slug))
        .map((sf, i) => ({
          slug: sf.slug,
          name: sf.name,
          type: sf.type,
          required: sf.required,
          sortOrder: fields.length + i,
          config: null,
          _isNew: true,
          _deleted: false,
        }));

      if (newFields.length > 0) {
        setFields((prev) => [...prev, ...newFields]);
        toast.success(`${newFields.length} campo(s) criado(s) automaticamente`);
      }

      // Update the JSON syncConfig for save
      const config = {
        supabaseTable: table,
        matchColumn: data.suggestedMatchColumn,
        fieldMap: data.suggestedFieldMap,
      };
      setSyncConfig(JSON.stringify(config, null, 2));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na introspecao");
    } finally {
      setIntrospecting(false);
    }
  }

  function updateFieldMapEntry(index: number, key: keyof FieldMapEntry, value: string | boolean) {
    setFieldMapEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
    // Rebuild syncConfig JSON
    const updated = fieldMapEntries.map((e, i) =>
      i === index ? { ...e, [key]: value } : e,
    );
    const fieldMap: Record<string, string> = {};
    for (const entry of updated) {
      if (entry.enabled) fieldMap[entry.supabaseCol] = entry.cmsField;
    }
    const config = { supabaseTable: selectedTable, matchColumn, fieldMap };
    setSyncConfig(JSON.stringify(config, null, 2));
  }

  function rebuildSyncConfigJson() {
    const fieldMap: Record<string, string> = {};
    for (const entry of fieldMapEntries) {
      if (entry.enabled) fieldMap[entry.supabaseCol] = entry.cmsField;
    }
    const config = { supabaseTable: selectedTable, matchColumn, fieldMap };
    setSyncConfig(JSON.stringify(config, null, 2));
  }

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
          pageSlugPattern: pageSlugPattern.trim() || null,
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
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Configuracao de Sync
              </h2>
              {!useAutoDetect ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUseAutoDetect(true)}
                >
                  <Zap className="size-3" />
                  Auto-detectar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseAutoDetect(false)}
                  className="text-muted-foreground"
                >
                  Editar JSON
                </Button>
              )}
            </div>

            {useAutoDetect ? (
              <div className="space-y-4">
                {/* Table selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-foreground">
                    Tabela do Supabase
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
                      disabled={sbTablesLoading}
                    >
                      <option value="">
                        {sbTablesLoading ? "Carregando tabelas..." : "Selecione uma tabela"}
                      </option>
                      {sbTables.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadSupabaseTables()}
                      disabled={sbTablesLoading}
                      className="shrink-0"
                    >
                      <RefreshCw className={`size-3.5 ${sbTablesLoading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => selectedTable && handleIntrospect(selectedTable)}
                      disabled={!selectedTable || introspecting}
                      className="shrink-0"
                    >
                      {introspecting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Zap className="size-3.5" />
                      )}
                      Detectar
                    </Button>
                  </div>
                </div>

                {/* Match column */}
                {fieldMapEntries.length > 0 && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-foreground">
                        Coluna de identificacao (matchColumn)
                      </label>
                      <select
                        value={matchColumn}
                        onChange={(e) => {
                          setMatchColumn(e.target.value);
                          // Defer rebuild
                          setTimeout(rebuildSyncConfigJson, 0);
                        }}
                        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
                      >
                        {introspectResult?.columns.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name} ({c.type})
                          </option>
                        ))}
                        {!introspectResult && (
                          <option value={matchColumn}>{matchColumn}</option>
                        )}
                      </select>
                      <p className="text-[11px] text-muted-foreground">
                        Coluna usada para identificar registros unicos (geralmente <code className="rounded bg-accent px-1 py-0.5 text-[10px]">id</code> ou <code className="rounded bg-accent px-1 py-0.5 text-[10px]">slug</code>).
                      </p>
                    </div>

                    {/* Field mapping table */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-foreground">
                        Mapeamento de campos ({fieldMapEntries.filter((e) => e.enabled).length} ativos)
                      </label>
                      <div className="rounded-md border border-border overflow-hidden">
                        <div className="grid grid-cols-[auto_1fr_8px_1fr_auto] gap-0 text-[11px] font-medium text-muted-foreground bg-accent/50 px-3 py-1.5 border-b border-border">
                          <span className="w-6" />
                          <span>Supabase</span>
                          <span />
                          <span>CMS Field</span>
                          <span className="w-8 text-center">Tipo</span>
                        </div>
                        <div className="divide-y divide-border">
                          {fieldMapEntries.map((entry, i) => (
                            <div
                              key={entry.supabaseCol}
                              className={`grid grid-cols-[auto_1fr_8px_1fr_auto] gap-0 items-center px-3 py-1.5 text-sm ${
                                !entry.enabled ? "opacity-40" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={entry.enabled}
                                onChange={(e) =>
                                  updateFieldMapEntry(i, "enabled", e.target.checked)
                                }
                                className="size-3.5 rounded border-border mr-2"
                              />
                              <span className="font-mono text-xs text-muted-foreground truncate">
                                {entry.supabaseCol}
                              </span>
                              <span className="text-center text-muted-foreground/40">→</span>
                              <input
                                type="text"
                                value={entry.cmsField}
                                onChange={(e) =>
                                  updateFieldMapEntry(i, "cmsField", e.target.value)
                                }
                                disabled={!entry.enabled}
                                className="h-7 rounded border border-border bg-background px-2 font-mono text-xs outline-none focus:border-foreground/30 disabled:opacity-50"
                              />
                              <span className="text-[10px] text-muted-foreground text-center w-8 ml-1">
                                {introspectResult?.columns.find(
                                  (c) => c.name === entry.supabaseCol,
                                )?.cmsType || "text"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Sample data preview */}
                {introspectResult?.sample && Object.keys(introspectResult.sample).length > 0 && (
                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                      Ver amostra de dados
                    </summary>
                    <pre className="mt-2 rounded-md bg-accent/30 p-3 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(introspectResult.sample, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* Collection Pages */}
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Paginas da Collection</h2>
          <p className="text-xs text-muted-foreground">
            Define como os itens dessa collection geram paginas no frontend.
            A pagina de indice (listagem) e criada em Paginas com o mesmo slug base.
            A pagina de detalhe e gerada automaticamente para cada item.
          </p>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Padrao de URL do detalhe</label>
            <input
              type="text"
              value={pageSlugPattern}
              onChange={(e) => setPageSlugPattern(e.target.value)}
              placeholder={`${slug}/{slug}`}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm font-mono outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
            />
            <p className="text-[11px] text-muted-foreground">
              Use <code className="rounded bg-accent px-1 py-0.5 text-[10px]">{"{slug}"}</code> para o slug do item.
              Ex: <code className="rounded bg-accent px-1 py-0.5 text-[10px]">blog/{"{slug}"}</code> gera URLs como <code className="rounded bg-accent px-1 py-0.5 text-[10px]">/blog/meu-post</code>
            </p>
          </div>

          {pageSlugPattern && (
            <div className="rounded-md border border-border bg-accent/30 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Resumo do routing:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Indice (listagem): <code className="rounded bg-card px-1.5 py-0.5 text-[11px] font-mono">/{pageSlugPattern.split("/")[0]}</code> — crie esta pagina em Paginas</p>
                <p>Detalhe (por item): <code className="rounded bg-card px-1.5 py-0.5 text-[11px] font-mono">/{pageSlugPattern}</code> — template automatico</p>
              </div>
              {activeFields.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground mb-1">Campos disponiveis para binding no template:</p>
                  <div className="flex flex-wrap gap-1">
                    {activeFields.map((f) => (
                      <code key={f.slug} className="rounded bg-card border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {`{{${f.slug}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
