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
  Inbox,
} from "lucide-react";
import { AdminShell, FormField, BrasaPageLoader, ToggleSwitch, DeleteConfirm } from "@brasa/admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "email", label: "Email" },
  { value: "textarea", label: "Texto Longo" },
  { value: "select", label: "Seleção" },
  { value: "phone", label: "Telefone" },
  { value: "number", label: "Número" },
];

type FormFieldDef = {
  name: string;
  label: string;
  type: "text" | "email" | "textarea" | "select" | "phone" | "number";
  required?: boolean;
  options?: string[];
};

type FormData = {
  id: number;
  name: string;
  slug: string;
  fields: FormFieldDef[];
  successMessage: string | null;
  notifyEmail: string | null;
  active: boolean;
  createdAt: string;
};

type Submission = {
  id: number;
  data: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

const SUBMISSIONS_LIMIT = 20;

export default function FormularioDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"campos" | "respostas">("campos");

  // Form info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [active, setActive] = useState(true);

  // Fields builder
  const [fields, setFields] = useState<FormFieldDef[]>([]);
  const [expandedField, setExpandedField] = useState<number | null>(null);

  // New field form
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FormFieldDef["type"]>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Submissions
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/forms/${formId}`);
        if (!res.ok) throw new Error("Formulário não encontrado");
        const data: FormData = await res.json();
        setName(data.name);
        setSlug(data.slug);
        setSuccessMessage(data.successMessage ?? "");
        setNotifyEmail(data.notifyEmail ?? "");
        setActive(data.active);
        setFields(Array.isArray(data.fields) ? data.fields : []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar formulário");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [formId]);

  const fetchSubmissions = useCallback(
    async (page = 1) => {
      setSubmissionsLoading(true);
      try {
        const offset = (page - 1) * SUBMISSIONS_LIMIT;
        const res = await fetch(
          `/api/admin/forms/${formId}/submissions?limit=${SUBMISSIONS_LIMIT}&offset=${offset}`,
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSubmissions(data.docs ?? []);
        setSubmissionsTotal(data.total ?? 0);
        setSubmissionsPage(page);
        setSubmissionsLoaded(true);
      } catch {
        toast.error("Erro ao carregar respostas");
      } finally {
        setSubmissionsLoading(false);
      }
    },
    [formId],
  );

  useEffect(() => {
    if (activeTab === "respostas" && !submissionsLoaded) {
      fetchSubmissions(1);
    }
  }, [activeTab, submissionsLoaded, fetchSubmissions]);

  function slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");
  }

  function handleNewFieldLabelChange(val: string) {
    setNewFieldLabel(val);
    setNewFieldName(slugify(val));
  }

  function addField() {
    if (!newFieldLabel.trim() || !newFieldName.trim()) {
      toast.error("Label e nome são obrigatórios");
      return;
    }
    if (fields.some((f) => f.name === newFieldName.trim())) {
      toast.error("Já existe um campo com esse nome");
      return;
    }
    setFields((prev) => [
      ...prev,
      {
        name: newFieldName.trim(),
        label: newFieldLabel.trim(),
        type: newFieldType,
        required: newFieldRequired,
        ...(newFieldType === "select" ? { options: [] } : {}),
      },
    ]);
    setNewFieldLabel("");
    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setShowAddField(false);
    toast.success("Campo adicionado (salve para confirmar)");
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
    setExpandedField(null);
  }

  function updateFieldProp(index: number, key: keyof FormFieldDef, value: unknown) {
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
      return next;
    });
    setExpandedField(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    if (fields.length === 0) {
      toast.error("Adicione pelo menos um campo");
      return;
    }
    const selectWithoutOptions = fields.find(
      (f) => f.type === "select" && (!f.options || f.options.length === 0),
    );
    if (selectWithoutOptions) {
      toast.error(`O campo "${selectWithoutOptions.label}" (seleção) precisa de opções`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          fields: fields.map((f) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            required: !!f.required,
            ...(f.type === "select" ? { options: f.options ?? [] } : {}),
          })),
          successMessage: successMessage.trim() || null,
          notifyEmail: notifyEmail.trim() || null,
          active,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao salvar");
      }

      toast.success("Formulário salvo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/admin/forms/${formId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao excluir");
      }
      toast.success("Formulário excluído");
      router.push("/admin/formularios");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir formulário");
    }
  }

  if (loading) {
    return (
      <AdminShell title="Formulário">
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  const totalPages = Math.max(Math.ceil(submissionsTotal / SUBMISSIONS_LIMIT), 1);

  return (
    <AdminShell title={name || "Formulário"}>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/formularios"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para Formulários
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowDelete(true)}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Excluir
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("campos")}
          className={[
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "campos"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Campos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("respostas")}
          className={[
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "respostas"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Respostas
          {submissionsLoaded && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {submissionsTotal}
            </span>
          )}
        </button>
      </div>

      {activeTab === "campos" && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Informações Gerais</h2>
              <div className="flex items-center gap-2">
                <ToggleSwitch checked={active} onChange={setActive} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

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
              description={`Endpoint público: /api/v1/forms/${slug || "{slug}"} — alterar o slug quebra integrações existentes no frontend.`}
              required
            />

            <FormField
              label="Mensagem de sucesso"
              name="successMessage"
              type="text"
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              placeholder="Enviado com sucesso!"
              description="Exibida ao visitante após o envio do formulário."
            />

            <FormField
              label="Email de notificação"
              name="notifyEmail"
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="contato@suaempresa.com.br"
              description="Recebe um e-mail a cada nova resposta. Deixe vazio para desativar."
            />
          </div>

          {/* Fields Builder */}
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Campos ({fields.length})
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

            {fields.length === 0 && !showAddField && (
              <p className="text-sm text-muted-foreground">
                Nenhum campo definido. Adicione campos para estruturar o formulário.
              </p>
            )}

            <div className="space-y-2">
              {fields.map((field, index) => {
                const isExpanded = expandedField === index;
                return (
                  <div
                    key={`${field.name}-${index}`}
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
                          disabled={index === fields.length - 1}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          aria-label="Mover para baixo"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedField(isExpanded ? null : index)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {field.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type})
                        </span>
                        {field.required && (
                          <span className="text-xs text-destructive">*</span>
                        )}
                      </button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeField(index)}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remover campo ${field.label}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="space-y-3 border-t border-border px-3 py-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-muted-foreground">
                              Label
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) =>
                                updateFieldProp(index, "label", e.target.value)
                              }
                              className="h-8 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-muted-foreground">
                              Nome (chave no payload)
                            </label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) =>
                                updateFieldProp(index, "name", e.target.value)
                              }
                              className="h-8 w-full rounded border border-border bg-background px-2 font-mono text-sm outline-none focus:border-foreground/30"
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
                          <div className="flex items-end pb-1">
                            <div className="flex items-center gap-2">
                              <ToggleSwitch
                                checked={!!field.required}
                                onChange={(val) =>
                                  updateFieldProp(index, "required", val)
                                }
                                size="sm"
                              />
                              <label className="text-xs text-muted-foreground">
                                Obrigatório
                              </label>
                            </div>
                          </div>
                        </div>

                        {field.type === "select" && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-muted-foreground">
                              Opções (separadas por vírgula)
                            </label>
                            <input
                              type="text"
                              value={(field.options ?? []).join(", ")}
                              onChange={(e) =>
                                updateFieldProp(
                                  index,
                                  "options",
                                  e.target.value
                                    .split(",")
                                    .map((opt) => opt.trim())
                                    .filter(Boolean),
                                )
                              }
                              placeholder="Opção A, Opção B, Opção C"
                              className="h-8 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
                            />
                          </div>
                        )}
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
                      Label
                    </label>
                    <input
                      type="text"
                      value={newFieldLabel}
                      onChange={(e) => handleNewFieldLabelChange(e.target.value)}
                      placeholder="Ex: Telefone"
                      className="h-8 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Nome (chave no payload)
                    </label>
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="ex: telefone"
                      className="h-8 w-full rounded border border-border bg-background px-2 font-mono text-sm outline-none focus:border-foreground/30"
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
                      onChange={(e) =>
                        setNewFieldType(e.target.value as FormFieldDef["type"])
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
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={newFieldRequired}
                        onChange={setNewFieldRequired}
                        size="sm"
                      />
                      <label className="text-xs text-muted-foreground">Obrigatório</label>
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
                      setNewFieldLabel("");
                      setNewFieldName("");
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
              {saving ? "Salvando..." : "Salvar Formulário"}
            </Button>
            <Link
              href="/admin/formularios"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-foreground text-[13px] font-medium h-8 px-3 transition-all hover:bg-accent"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}

      {activeTab === "respostas" && (
        <div className="space-y-4">
          {submissionsLoading && !submissionsLoaded ? (
            <BrasaPageLoader />
          ) : submissions.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Inbox className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nenhuma resposta recebida ainda.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                As respostas enviadas via{" "}
                <code className="rounded bg-accent px-1 py-0.5 text-[11px] font-mono">
                  /api/v1/forms/{slug}
                </code>{" "}
                aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                        Data
                      </TableHead>
                      {fields.map((f) => (
                        <TableHead
                          key={f.name}
                          className="px-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        >
                          {f.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="px-4 text-muted-foreground whitespace-nowrap">
                          {new Date(sub.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        {fields.map((f) => {
                          const raw = sub.data?.[f.name];
                          const value =
                            raw === null || raw === undefined || raw === ""
                              ? "-"
                              : typeof raw === "object"
                                ? JSON.stringify(raw)
                                : String(raw);
                          return (
                            <TableCell
                              key={f.name}
                              className="max-w-[280px] truncate px-4 text-foreground"
                              title={value}
                            >
                              {value}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {submissionsTotal}{" "}
                  {submissionsTotal === 1 ? "resposta" : "respostas"}
                  {totalPages > 1 && ` — Página ${submissionsPage} de ${totalPages}`}
                </p>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={submissionsPage <= 1 || submissionsLoading}
                      onClick={() => fetchSubmissions(submissionsPage - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={submissionsPage >= totalPages || submissionsLoading}
                      onClick={() => fetchSubmissions(submissionsPage + 1)}
                    >
                      Próximo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <DeleteConfirm
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={`Excluir "${name}"?`}
        description="Esta ação não pode ser desfeita. O formulário e todas as respostas serão permanentemente removidos."
      />
    </AdminShell>
  );
}
