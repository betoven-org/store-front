"use client";

import { useCallback, useRef, useState } from "react";
import type { FieldSchema } from "@brasa/core/manifest";
import ToggleSwitch from "./ToggleSwitch";
import ImageUpload from "./ImageUpload";

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

// ---------------------------------------------------------------------------
// Shared class constants
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground shadow-sm placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20";

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
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{description}</p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// FieldWrapper — uniform spacing around each field
// ---------------------------------------------------------------------------

function FieldWrapper({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
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

function StringField({ fieldKey, schema, value, onChange }: FieldRendererProps) {
  const format = schema.format ?? "text";
  const id = `field-${fieldKey}`;
  const strVal = (value as string) ?? "";
  const placeholder =
    schema.default !== undefined ? String(schema.default) : undefined;

  if (format === "hidden") return null;

  if (format === "textarea") {
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <textarea id={id} value={strVal} placeholder={placeholder} required={schema.required} rows={4}
          onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y`} />
      </FieldWrapper>
    );
  }

  if (format === "rich-text") {
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <textarea id={id} value={strVal} placeholder={placeholder ?? "<p>Conteudo HTML...</p>"} required={schema.required} rows={8}
          onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y font-mono text-xs leading-relaxed`} spellCheck={false} />
      </FieldWrapper>
    );
  }

  if (format === "image") {
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <ImageUpload value={strVal ? 1 : null} previewUrl={strVal || null} onChange={(_id, url) => onChange(url ?? "")} />
      </FieldWrapper>
    );
  }

  if (format === "color") {
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <input id={id} type="color" value={strVal || "#000000"} onChange={(e) => onChange(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-lg border border-border p-0.5 shadow-sm" />
          </div>
          <input type="text" value={strVal} placeholder={placeholder ?? "#000000"} onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} flex-1 font-mono text-xs`} aria-label={`Valor hex de ${schema.title ?? fieldKey}`} />
        </div>
      </FieldWrapper>
    );
  }

  if (format === "code") {
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <textarea id={id} value={strVal} placeholder={placeholder ?? "// Code..."} required={schema.required} rows={10}
          onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y font-mono text-xs leading-relaxed`} spellCheck={false} />
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
        <select id={id} value={strVal} required={schema.required} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">Selecione icone...</option>
          {ICONS.map((icon) => (<option key={icon} value={icon}>{icon}</option>))}
        </select>
        {strVal && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Selecionado: <code className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono">{strVal}</code>
          </p>
        )}
      </FieldWrapper>
    );
  }

  if (format === "select") {
    const options = schema.options ?? [];
    return (
      <FieldWrapper>
        <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
        <select id={id} value={strVal} required={schema.required} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">Selecione...</option>
          {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
      </FieldWrapper>
    );
  }

  const inputType =
    format === "url" || format === "video" ? "url"
    : format === "email" ? "email"
    : format === "date" ? "date"
    : format === "datetime" ? "datetime-local"
    : "text";

  return (
    <FieldWrapper>
      <FieldLabel htmlFor={id} title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
      <input id={id} type={inputType} value={strVal} placeholder={placeholder} required={schema.required}
        onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </FieldWrapper>
  );
}

function NumberField({ fieldKey, schema, value, onChange }: FieldRendererProps) {
  const id = `field-${fieldKey}`;
  const numVal = value !== undefined && value !== null ? Number(value) : "";
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
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
        <div className="min-w-0">
          <label htmlFor={id} className={`${labelCls} cursor-pointer`}>
            {schema.title ?? fieldKey}
            {schema.required && <span className="ml-0.5 text-destructive">*</span>}
          </label>
          {schema.description && (
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{schema.description}</p>
          )}
        </div>
        <ToggleSwitch id={id} checked={checked} onChange={(v) => onChange(v)} />
      </div>
    </FieldWrapper>
  );
}

function ObjectField({ fieldKey, schema, value, onChange, depth = 0 }: FieldRendererProps) {
  if (!schema.properties) return null;
  const objVal = (value as Record<string, unknown>) ?? {};

  return (
    <fieldset className="rounded-lg border border-border bg-background/50 px-3.5 pb-3.5 pt-2.5">
      <legend className="px-1.5 text-[12px] font-semibold text-foreground">{schema.title ?? fieldKey}</legend>
      {schema.description && (
        <p className="mb-2.5 text-[11px] text-muted-foreground leading-relaxed">{schema.description}</p>
      )}
      <div className="space-y-3">
        {Object.entries(schema.properties).map(([key, fieldSchema]) => {
          if (fieldSchema.format === "hidden") return null;
          return (
            <FieldRenderer key={key} fieldKey={`${fieldKey}.${key}`} schema={fieldSchema}
              value={objVal[key] ?? fieldSchema.default} onChange={(v) => onChange({ ...objVal, [key]: v })} depth={depth + 1} />
          );
        })}
      </div>
    </fieldset>
  );
}

function ArrayField({ fieldKey, schema, value, onChange, depth = 0 }: FieldRendererProps) {
  const items = schema.items;
  const arrVal = (value as unknown[]) ?? [];

  // Stable IDs: maintain a Map from index to UUID so React keys survive reorders.
  // The ref holds an array of IDs that mirrors arrVal by index.
  const idsRef = useRef<string[]>([]);

  // Grow/shrink the ID array to match current items
  if (idsRef.current.length < arrVal.length) {
    for (let i = idsRef.current.length; i < arrVal.length; i++) {
      idsRef.current.push(crypto.randomUUID());
    }
  } else if (idsRef.current.length > arrVal.length) {
    idsRef.current = idsRef.current.slice(0, arrVal.length);
  }

  function handleRemove(index: number) {
    idsRef.current.splice(index, 1);
    onChange(arrVal.filter((_, i) => i !== index));
  }

  function handleAdd() {
    idsRef.current.push(crypto.randomUUID());
    onChange([...arrVal, items ? emptyFromSchema(items) : ""]);
  }

  return (
    <FieldWrapper>
      <FieldLabel title={schema.title ?? fieldKey} required={schema.required} description={schema.description} />
      <div className="space-y-2">
        {arrVal.map((item, index) => (
          <div key={idsRef.current[index]} className="relative rounded-lg border border-border bg-background/50 p-3 group">
            <div className="absolute left-2 top-2 text-muted-foreground/40 cursor-grab"><SvgGrip /></div>
            <button type="button" onClick={() => handleRemove(index)} aria-label={`Remover item ${index + 1}`}
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive">
              <SvgX />
            </button>
            <div className="pl-5 pr-5">
              <span className="text-[10px] font-mono text-muted-foreground/50 mb-1 block">#{index + 1}</span>
              {items ? (
                <FieldRenderer fieldKey={`${fieldKey}[${index}]`} schema={items} value={item}
                  onChange={(v) => { const next = [...arrVal]; next[index] = v; onChange(next); }} depth={(depth ?? 0) + 1} />
              ) : (
                <input type="text" value={String(item ?? "")} onChange={(e) => { const next = [...arrVal]; next[index] = e.target.value; onChange(next); }}
                  className={inputCls} aria-label={`Item ${index + 1} de ${schema.title ?? fieldKey}`} />
              )}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={handleAdd}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/50">
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
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-accent/50 px-3.5 py-2.5 text-left transition-colors hover:bg-accent"
        aria-expanded={open}
      >
        <span className="text-muted-foreground"><GroupIcon group={title} /></span>
        <span className="flex-1 text-[12px] font-semibold text-foreground tracking-wide">{title}</span>
        {count != null && (
          <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
            {count}
          </span>
        )}
        <span className="text-muted-foreground"><SvgChevron open={open} /></span>
      </button>
      {open && <div className="space-y-3 px-3.5 pb-3.5 pt-3 bg-card">{children}</div>}
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

export default function SectionEditor({
  schema,
  values,
  onChange,
  loader,
}: SectionEditorProps) {
  const handleFieldChange = useCallback(
    (key: string, fieldValue: unknown) => {
      onChange({ ...values, [key]: fieldValue });
    },
    [values, onChange]
  );

  const groups = groupEntries(schema);
  const hasGroups = groups.size > 1 || !groups.has("__ungrouped__");

  // Define group render order and defaults
  const groupOrder = ["__ungrouped__", "Aparência", "Avançado"];
  const groupDefaults: Record<string, boolean> = {
    "__ungrouped__": true,
    "Aparência": false,
    "Avançado": false,
  };

  if (!hasGroups || (groups.size === 1 && groups.has("__ungrouped__"))) {
    const entries = groups.get("__ungrouped__") ?? [];
    return (
      <div className="space-y-3">
        {loader && <LoaderBadge loader={loader} />}
        {entries.map(([key, field]) => (
          <FieldRenderer key={key} fieldKey={key} schema={field}
            value={values[key] ?? field.default} onChange={(v) => handleFieldChange(key, v)} />
        ))}
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
      {sortedGroups.map(([groupName, entries]) => {
        const isUngrouped = groupName === "__ungrouped__";
        const defaultOpen = groupDefaults[groupName] ?? true;

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
    </div>
  );
}
