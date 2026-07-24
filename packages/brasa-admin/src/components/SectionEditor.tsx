"use client";

import { useCallback, useRef, useState, lazy, Suspense } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FieldSchema } from "@brasa/core/manifest";
import ToggleSwitch from "./ToggleSwitch";
import ImageUpload from "./ImageUpload";

const LazyRichTextHtml = lazy(() => import("./RichTextHtmlField"));

export type LoaderInfo = {
  fn: string;
  title?: string;
};

export type SectionEditorProps = {
  schema: Record<string, FieldSchema>;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  loader?: LoaderInfo;
};

// Count top-level visible fields and how many are filled
export function countFieldStats(
  schema: Record<string, FieldSchema>,
  values: Record<string, unknown>
): { total: number; filled: number } {
  let total = 0;
  let filled = 0;
  for (const [key, field] of Object.entries(schema)) {
    if (field.format === "hidden") continue;
    total++;
    const val = values[key];
    if (val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)) {
      filled++;
    }
  }
  return { total, filled };
}

// ---------------------------------------------------------------------------
// Shared class constants
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground shadow-sm placeholder:text-muted-foreground/40 transition-all duration-150 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]";

const labelCls = "block text-[12px] font-semibold text-foreground tracking-wide";

// ---------------------------------------------------------------------------
// Utility — build an empty item value from an items schema
// ---------------------------------------------------------------------------

function emptyFromSchema(schema: FieldSchema): unknown {
  if (schema.type === "object" && schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(schema.properties)) {
      obj[key] = field.default ?? emptyFromSchema(field);
    }
    return obj;
  }
  if (schema.type === "array") return [];
  if (schema.type === "boolean") return false;
  if (schema.type === "number") return 0;
  return "";
}

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function SvgPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SvgX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SvgChevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SvgGrip() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Group icons
function GroupIcon({ group }: { group: string }) {
  if (group === "Aparência") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <path d="M17 15.5s-3-5-7.5-5C5 10.5 2 15.5 2 15.5" />
      <path d="M20 17.5c0 2.5-2 4.5-4.5 4.5S11 20 11 17.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5Z" />
    </svg>
  );
  if (group === "Avançado") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// FieldLabel
// ---------------------------------------------------------------------------

function FieldLabel({
  title,
  required,
  description,
  htmlFor,
}: {
  title: string;
  required?: boolean;
  description?: string;
  htmlFor?: string;
}) {
  return (
    <>
      <label htmlFor={htmlFor} className={labelCls}>
        {title}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {description && (
        <p className="mt-0.5 text-[11px] text-muted-foreground/70 leading-relaxed">{description}</p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// FieldWrapper — uniform spacing around each field
// ---------------------------------------------------------------------------

function FieldWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Individual field renderers
// ---------------------------------------------------------------------------

type FieldRendererProps = {
  fieldKey: string;
  schema: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
};

// Swatch colors for color field suggestions (semantic theme palette)
const THEME_SWATCHES = [
  "#000000", "#ffffff", "#f8f9fa", "#212529",
  "#0d6efd", "#6610f2", "#6f42c1", "#d63384",
  "#dc3545", "#fd7e14", "#ffc107", "#198754",
  "#20c997", "#0dcaf0",
];

// Visual preview badge for select options
function SelectOptionBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();
  if (lower === "light" || lower === "claro")
    return <span className="inline-block h-3 w-3 rounded-full border border-border bg-white flex-shrink-0" aria-hidden="true" />;
  if (lower === "dark" || lower === "escuro")
    return <span className="inline-block h-3 w-3 rounded-full border border-border bg-zinc-900 flex-shrink-0" aria-hidden="true" />;
  if (lower === "gradient" || lower === "gradiente")
    return <span className="inline-block h-3 w-3 rounded-full border border-border flex-shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#ec4899)" }} aria-hidden="true" />;
  if (lower === "primary" || lower === "primário")
    return <span className="inline-block h-3 w-3 rounded-full border border-border bg-blue-600 flex-shrink-0" aria-hidden="true" />;
  if (lower === "secondary" || lower === "secundário")
    return <span className="inline-block h-3 w-3 rounded-full border border-border bg-zinc-400 flex-shrink-0" aria-hidden="true" />;
  return null;
}

function StringField({ fieldKey, schema, value, onChange }: FieldRendererProps) {
  const format = schema.format ?? "text";
  const id = `field-${fieldKey}`;
  const strVal = (value as string) ?? "";
  const isFilled = strVal.length > 0;
  const placeholder =
    schema.default !== undefined ? String(schema.default) : undefined;

  if (format === "hidden") return null;

  if (format === "textarea") {
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <textarea id={id} value={strVal} placeholder={placeholder ?? "Digite aqui..."} required={schema.required} rows={4}
          onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y`} />
      </FieldWrapper>
    );
  }

  if (format === "rich-text") {
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <Suspense fallback={<div className="h-[120px] rounded-lg border border-border bg-background animate-pulse" />}>
          <LazyRichTextHtml
            value={strVal}
            onChange={(html) => onChange(html)}
            placeholder={placeholder ?? "Escreva aqui..."}
          />
        </Suspense>
      </FieldWrapper>
    );
  }

  if (format === "image") {
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        {strVal ? (
          <div className="group relative overflow-hidden rounded-lg border border-border bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={strVal}
              alt={schema.title ?? fieldKey}
              className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              width={280}
              height={128}
            />
            <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/40 to-transparent p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onChange("")}
                className="rounded-md bg-destructive/90 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-destructive"
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/50 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span className="text-[11px] text-muted-foreground/60">Nenhuma imagem selecionada</span>
          </div>
        )}
        <ImageUpload value={strVal ? 1 : null} previewUrl={strVal || null} onChange={(_id, url) => onChange(url ?? "")} />
      </FieldWrapper>
    );
  }

  if (format === "color") {
    const displayColor = strVal || "#000000";
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <div className="rounded-lg border border-border bg-background p-3 space-y-3">
          {/* Main color row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <input
                id={id}
                type="color"
                value={displayColor}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
                aria-label={`Cor de ${schema.title ?? fieldKey}`}
              />
              <label
                htmlFor={id}
                className="block h-10 w-10 cursor-pointer rounded-lg border-2 border-border shadow-sm transition-transform hover:scale-105"
                style={{ backgroundColor: displayColor }}
                title="Clique para abrir o seletor de cores"
              />
            </div>
            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={strVal}
                placeholder={placeholder ?? "#000000"}
                onChange={(e) => onChange(e.target.value)}
                className={`${inputCls} font-mono text-xs`}
                aria-label={`Valor hex de ${schema.title ?? fieldKey}`}
              />
              {strVal && (
                <p className="text-[10px] text-muted-foreground/60 pl-1">
                  {strVal.toUpperCase()}
                </p>
              )}
            </div>
          </div>
          {/* Theme swatches */}
          <div>
            <p className="mb-1.5 text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">Sugestões</p>
            <div className="flex flex-wrap gap-1.5">
              {THEME_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  title={swatch}
                  onClick={() => onChange(swatch)}
                  className={`h-5 w-5 rounded-md border transition-all hover:scale-110 hover:shadow-md ${
                    strVal === swatch ? "ring-2 ring-primary ring-offset-1 border-primary/50" : "border-border"
                  }`}
                  style={{ backgroundColor: swatch }}
                  aria-label={`Aplicar cor ${swatch}`}
                />
              ))}
            </div>
          </div>
        </div>
      </FieldWrapper>
    );
  }

  if (format === "code") {
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-2 bg-accent/50 px-3 py-1.5 border-b border-border">
            <div className="flex gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
            </div>
            <span className="text-[10px] text-muted-foreground/50 font-mono">código</span>
          </div>
          <textarea
            id={id}
            value={strVal}
            placeholder={placeholder ?? "// Insira seu código aqui..."}
            required={schema.required}
            rows={10}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-zinc-950 dark:bg-zinc-950 text-zinc-100 px-3 py-2.5 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-0 border-0"
            spellCheck={false}
          />
        </div>
      </FieldWrapper>
    );
  }

  if (format === "icon") {
    const ICONS = [
      "star", "heart", "check", "x", "arrow-right", "arrow-left",
      "search", "settings", "home", "user", "mail", "phone",
      "calendar", "clock", "map-pin", "globe", "shield", "zap",
      "trending-up", "award", "gift", "truck", "package", "tag",
      "percent", "credit-card", "lock", "unlock", "eye", "bell",
    ];
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <div className="relative">
          <select id={id} value={strVal} required={schema.required} onChange={(e) => onChange(e.target.value)} className={inputCls}>
            <option value="">Selecione um ícone...</option>
            {ICONS.map((icon) => (<option key={icon} value={icon}>{icon}</option>))}
          </select>
        </div>
        {strVal && (
          <div className="flex items-center gap-2 rounded-md bg-accent/50 px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground">Selecionado:</span>
            <code className="rounded bg-background border border-border px-1.5 py-0.5 text-[10px] font-mono text-foreground">{strVal}</code>
          </div>
        )}
      </FieldWrapper>
    );
  }

  if (format === "select") {
    const options = schema.options ?? [];
    const hasVisualOptions = options.some((opt) => {
      const l = opt.toLowerCase();
      return ["light","dark","gradient","claro","escuro","gradiente","primary","secondary","primário","secundário"].includes(l);
    });
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <select id={id} value={strVal} required={schema.required} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">Selecione...</option>
          {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
        {hasVisualOptions && strVal && (
          <div className="flex items-center gap-2 rounded-md bg-accent/40 px-2.5 py-1.5">
            <SelectOptionBadge value={strVal} />
            <span className="text-[11px] text-muted-foreground">{strVal}</span>
          </div>
        )}
      </FieldWrapper>
    );
  }

  const inputType =
    format === "url" || format === "video" ? "url"
    : format === "email" ? "email"
    : format === "date" ? "date"
    : format === "datetime" ? "datetime-local"
    : "text";

  const contextualPlaceholder =
    placeholder ??
    (format === "url" ? "https://"
    : format === "email" ? "email@exemplo.com"
    : format === "date" ? "AAAA-MM-DD"
    : undefined);

  return (
    <FieldWrapper>
      <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
      <input id={id} type={inputType} value={strVal} placeholder={contextualPlaceholder} required={schema.required}
        onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </FieldWrapper>
  );
}

function NumberField({ fieldKey, schema, value, onChange }: FieldRendererProps) {
  const id = `field-${fieldKey}`;
  const numVal = value !== undefined && value !== null ? Number(value) : "";
  const isFilled = numVal !== "";
  const placeholder = schema.default !== undefined ? String(schema.default) : undefined;

  return (
    <FieldWrapper>
      <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
      <input id={id} type="number" value={numVal} placeholder={placeholder} required={schema.required}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} />
    </FieldWrapper>
  );
}

function BooleanField({ fieldKey, schema, value, onChange }: FieldRendererProps) {
  const id = `field-${fieldKey}`;
  const checked = Boolean(value);

  return (
    <FieldWrapper>
      <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150 ${
        checked
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-background"
      }`}>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className={`${labelCls} cursor-pointer`}>
            {schema.title ?? fieldKey}
            {schema.required && <span className="ml-0.5 text-destructive">*</span>}
          </label>
          {schema.description ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground/70 leading-relaxed">{schema.description}</p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground/50">
              {checked ? "Ativado" : "Desativado"}
            </p>
          )}
        </div>
        <ToggleSwitch id={id} checked={checked} onChange={(v) => onChange(v)} />
      </div>
    </FieldWrapper>
  );
}

// Depth-based accent colors for nested fields
const DEPTH_COLORS = [
  "border-l-primary/40",
  "border-l-blue-500/40",
  "border-l-emerald-500/40",
  "border-l-amber-500/40",
  "border-l-purple-500/40",
];

function getDepthColor(depth: number): string {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}

function ObjectField({ fieldKey, schema, value, onChange, depth = 0 }: FieldRendererProps) {
  if (!schema.properties) return null;
  const objVal = (value as Record<string, unknown>) ?? {};
  const [collapsed, setCollapsed] = useState(depth >= 2);
  const fieldCount = Object.keys(schema.properties).filter(k => schema.properties![k].format !== "hidden").length;

  return (
    <fieldset className={`rounded-lg border border-border bg-background/50 overflow-hidden ${depth > 0 ? `border-l-2 ${getDepthColor(depth)}` : ""}`}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left hover:bg-accent/30 transition-colors"
      >
        <span className="text-muted-foreground"><SvgChevron open={!collapsed} /></span>
        <span className="text-[12px] font-semibold text-foreground flex-1">{schema.title ?? fieldKey}</span>
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{fieldCount}</span>
      </button>
      {schema.description && !collapsed && (
        <p className="px-3.5 pb-2 text-[11px] text-muted-foreground leading-relaxed">{schema.description}</p>
      )}
      {!collapsed && (
        <div className="space-y-3 px-3.5 pb-3.5">
          {Object.entries(schema.properties).map(([key, fieldSchema]) => {
            if (fieldSchema.format === "hidden") return null;
            return (
              <FieldRenderer key={key} fieldKey={`${fieldKey}.${key}`} schema={fieldSchema}
                value={objVal[key] ?? fieldSchema.default} onChange={(v) => onChange({ ...objVal, [key]: v })} depth={depth + 1} />
            );
        })}
      </div>
      )}
    </fieldset>
  );
}

// ── Sortable array item ─────────────────────────────────────────────────────

type SortableArrayItemProps = {
  id: string;
  index: number;
  fieldKey: string;
  itemSchema: FieldSchema | undefined;
  item: unknown;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRemove: () => void;
  onChange: (value: unknown) => void;
  depth: number;
};

function getItemPreview(item: unknown): string {
  if (item === null || item === undefined) return "(vazio)";
  if (typeof item === "string") return item.length > 50 ? item.slice(0, 50) + "..." : item || "(vazio)";
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    // Try common label keys
    for (const key of ["title", "label", "name", "text", "heading", "titulo", "nome"]) {
      if (typeof obj[key] === "string" && obj[key]) return obj[key] as string;
    }
    // Fallback to first string value
    for (const val of Object.values(obj)) {
      if (typeof val === "string" && val) return val.length > 40 ? val.slice(0, 40) + "..." : val;
    }
    return `${Object.keys(obj).length} campos`;
  }
  return String(item);
}

function SortableArrayItem({
  id, index, fieldKey, itemSchema, item, collapsed, onToggleCollapse, onRemove, onChange, depth,
}: SortableArrayItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-background/50 group transition-all ${
        isDragging ? "opacity-40 border-primary/40 shadow-lg" : "border-border"
      } ${depth > 0 ? `border-l-2 ${getDepthColor(depth)}` : ""}`}
    >
      {/* Item header — always visible */}
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <span
          className="flex-shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <SvgGrip />
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex flex-1 items-center gap-1.5 min-w-0 text-left"
        >
          <span className="text-[10px] font-mono text-muted-foreground/50 flex-shrink-0">#{index + 1}</span>
          {collapsed && (
            <span className="truncate text-[12px] text-muted-foreground">{getItemPreview(item)}</span>
          )}
          <span className="ml-auto text-muted-foreground/40 flex-shrink-0">
            <SvgChevron open={!collapsed} />
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover item ${index + 1}`}
          className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive"
        >
          <SvgX />
        </button>
      </div>

      {/* Item body — collapsible */}
      {!collapsed && (
        <div className="px-3 pb-3 pt-0">
          {itemSchema ? (
            <FieldRenderer
              fieldKey={`${fieldKey}[${index}]`}
              schema={itemSchema}
              value={item}
              onChange={onChange}
              depth={depth + 1}
            />
          ) : (
            <input
              type="text"
              value={String(item ?? "")}
              onChange={(e) => onChange(e.target.value)}
              className={inputCls}
              aria-label={`Item ${index + 1}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ArrayField({ fieldKey, schema, value, onChange, depth = 0 }: FieldRendererProps) {
  const items = schema.items;
  const arrVal = (value as unknown[]) ?? [];

  // Stable IDs
  const idsRef = useRef<string[]>([]);
  if (idsRef.current.length < arrVal.length) {
    for (let i = idsRef.current.length; i < arrVal.length; i++) {
      idsRef.current.push(crypto.randomUUID());
    }
  } else if (idsRef.current.length > arrVal.length) {
    idsRef.current = idsRef.current.slice(0, arrVal.length);
  }

  // Collapse state — all items start collapsed
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(
    () => new Set(idsRef.current),
  );

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = idsRef.current.indexOf(String(active.id));
    const newIndex = idsRef.current.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    idsRef.current = arrayMove(idsRef.current, oldIndex, newIndex);
    onChange(arrayMove([...arrVal], oldIndex, newIndex));
  }

  function handleRemove(index: number) {
    const removedId = idsRef.current[index];
    idsRef.current.splice(index, 1);
    setCollapsedSet((prev) => { const next = new Set(prev); next.delete(removedId); return next; });
    onChange(arrVal.filter((_, i) => i !== index));
  }

  function handleAdd() {
    const newId = crypto.randomUUID();
    idsRef.current.push(newId);
    // Expand newly added item
    setCollapsedSet((prev) => { const next = new Set(prev); next.delete(newId); return next; });
    onChange([...arrVal, items ? emptyFromSchema(items) : ""]);
  }

  function toggleCollapse(id: string) {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function collapseAll() {
    setCollapsedSet(new Set(idsRef.current));
  }

  function expandAll() {
    setCollapsedSet(new Set());
  }

  const allCollapsed = collapsedSet.size === arrVal.length && arrVal.length > 0;

  const activeIndex = activeId ? idsRef.current.indexOf(activeId) : -1;

  return (
    <FieldWrapper>
      <div className="flex items-center justify-between">
        <FieldLabel title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        {arrVal.length > 2 && (
          <button
            type="button"
            onClick={allCollapsed ? expandAll : collapseAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {allCollapsed ? "Expandir" : "Recolher"}
          </button>
        )}
      </div>

      {arrVal.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/60 py-3 text-center border border-dashed border-border rounded-lg">
          Nenhum item adicionado.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={idsRef.current} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {arrVal.map((item, index) => (
                <SortableArrayItem
                  key={idsRef.current[index]}
                  id={idsRef.current[index]}
                  index={index}
                  fieldKey={fieldKey}
                  itemSchema={items}
                  item={item}
                  collapsed={collapsedSet.has(idsRef.current[index])}
                  onToggleCollapse={() => toggleCollapse(idsRef.current[index])}
                  onRemove={() => handleRemove(index)}
                  onChange={(v) => { const next = [...arrVal]; next[index] = v; onChange(next); }}
                  depth={depth ?? 0}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId && activeIndex !== -1 && (
              <div className="rounded-lg border border-primary/30 bg-card p-2.5 shadow-xl ring-2 ring-primary/20">
                <div className="flex items-center gap-1.5">
                  <SvgGrip />
                  <span className="text-[10px] font-mono text-muted-foreground/50">#{activeIndex + 1}</span>
                  <span className="text-[12px] text-foreground truncate">{getItemPreview(arrVal[activeIndex])}</span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/50"
      >
        <SvgPlus />
        Adicionar item
      </button>
    </FieldWrapper>
  );
}

function UnionField({ fieldKey, schema, value, onChange }: FieldRendererProps) {
  return <StringField fieldKey={fieldKey} schema={{ ...schema, format: "select" }} value={value} onChange={onChange} />;
}

// ---------------------------------------------------------------------------
// Central dispatcher
// ---------------------------------------------------------------------------

function FieldRenderer({ fieldKey, schema, value, onChange, depth = 0 }: FieldRendererProps) {
  if (schema.format === "hidden") return null;
  const props: FieldRendererProps = { fieldKey, schema, value, onChange, depth };

  switch (schema.type) {
    case "string": return <StringField {...props} />;
    case "number": return <NumberField {...props} />;
    case "boolean": return <BooleanField {...props} />;
    case "object": return <ObjectField {...props} />;
    case "array": return <ArrayField {...props} />;
    case "union": return <UnionField {...props} />;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Group utilities
// ---------------------------------------------------------------------------

function groupEntries(
  schema: Record<string, FieldSchema>
): Map<string, Array<[string, FieldSchema]>> {
  const groups = new Map<string, Array<[string, FieldSchema]>>();

  for (const [key, field] of Object.entries(schema)) {
    if (field.format === "hidden") continue;
    const group = field.group ?? "__ungrouped__";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push([key, field]);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Collapsible group section
// ---------------------------------------------------------------------------

function GroupSection({
  title,
  defaultOpen = true,
  count,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border overflow-hidden shadow-[0_1px_3px_0_hsl(var(--border)/0.5)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-accent/60 px-3.5 py-2.5 text-left transition-colors hover:bg-accent"
        aria-expanded={open}
      >
        <span className="text-muted-foreground/70"><GroupIcon group={title} /></span>
        <span className="flex-1 text-[11px] font-semibold text-foreground tracking-wider uppercase">{title}</span>
        {count != null && (
          <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border tabular-nums">
            {count}
          </span>
        )}
        <span className="text-muted-foreground/60"><SvgChevron open={open} /></span>
      </button>
      {open && <div className="space-y-3.5 px-3.5 pb-4 pt-3.5 bg-card/50">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoaderBadge
// ---------------------------------------------------------------------------

function LoaderBadge({ loader }: { loader: LoaderInfo }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-primary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
      <span>
        <strong>Dados dinâmicos</strong>
        {loader.title ? ` — ${loader.title}` : ` — ${loader.fn}`}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionEditor (public export)
// ---------------------------------------------------------------------------

const SEARCH_THRESHOLD = 8;

function SvgSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export default function SectionEditor({
  schema,
  values,
  onChange,
  loader,
}: SectionEditorProps) {
  const [search, setSearch] = useState("");

  const handleFieldChange = useCallback(
    (key: string, fieldValue: unknown) => {
      onChange({ ...values, [key]: fieldValue });
    },
    [values, onChange]
  );

  const groups = groupEntries(schema);
  const hasGroups = groups.size > 1 || !groups.has("__ungrouped__");

  // Total visible field count (for search threshold)
  const totalFields = Array.from(groups.values()).reduce((acc, entries) => acc + entries.length, 0);
  const showSearch = totalFields > SEARCH_THRESHOLD;

  const searchLower = search.trim().toLowerCase();

  function filterEntries(entries: Array<[string, FieldSchema]>): Array<[string, FieldSchema]> {
    if (!searchLower) return entries;
    return entries.filter(([key, field]) => {
      const label = (field.title ?? key).toLowerCase();
      const desc = (field.description ?? "").toLowerCase();
      return label.includes(searchLower) || desc.includes(searchLower) || key.toLowerCase().includes(searchLower);
    });
  }

  // Define group render order and defaults
  const groupOrder = ["__ungrouped__", "Aparência", "Avançado"];
  const groupDefaults: Record<string, boolean> = {
    "__ungrouped__": true,
    "Aparência": false,
    "Avançado": false,
  };

  const searchBar = showSearch ? (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
        <SvgSearch />
      </span>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filtrar campos..."
        aria-label="Filtrar campos da section"
        className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground/40 transition-all duration-150 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/10"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <SvgX />
        </button>
      )}
    </div>
  ) : null;

  if (!hasGroups || (groups.size === 1 && groups.has("__ungrouped__"))) {
    const entries = filterEntries(groups.get("__ungrouped__") ?? []);
    return (
      <div className="space-y-3">
        {loader && <LoaderBadge loader={loader} />}
        {searchBar}
        {entries.length === 0 && searchLower ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground/60">
            Nenhum campo encontrado para &ldquo;{search}&rdquo;
          </p>
        ) : (
          entries.map(([key, field]) => (
            <FieldRenderer key={key} fieldKey={key} schema={field}
              value={values[key] ?? field.default} onChange={(v) => handleFieldChange(key, v)} />
          ))
        )}
      </div>
    );
  }

  // Sort groups by defined order, then alphabetically for custom groups
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
    const ai = groupOrder.indexOf(a);
    const bi = groupOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-3">
      {loader && <LoaderBadge loader={loader} />}
      {searchBar}
      {sortedGroups.map(([groupName, rawEntries]) => {
        const isUngrouped = groupName === "__ungrouped__";
        const defaultOpen = groupDefaults[groupName] ?? true;
        const entries = filterEntries(rawEntries);

        // Hide entire group when searching and no matches
        if (searchLower && entries.length === 0) return null;

        if (isUngrouped) {
          return (
            <div key="__ungrouped__" className="space-y-3">
              {entries.map(([key, field]) => (
                <FieldRenderer key={key} fieldKey={key} schema={field}
                  value={values[key] ?? field.default} onChange={(v) => handleFieldChange(key, v)} />
              ))}
            </div>
          );
        }

        return (
          <GroupSection key={groupName} title={groupName} defaultOpen={defaultOpen} count={entries.length}>
            {entries.map(([key, field]) => (
              <FieldRenderer key={key} fieldKey={key} schema={field}
                value={values[key] ?? field.default} onChange={(v) => handleFieldChange(key, v)} />
            ))}
          </GroupSection>
        );
      })}
      {searchLower && sortedGroups.every(([, rawEntries]) => filterEntries(rawEntries).length === 0) && (
        <p className="py-6 text-center text-[12px] text-muted-foreground/60">
          Nenhum campo encontrado para &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  );
}
