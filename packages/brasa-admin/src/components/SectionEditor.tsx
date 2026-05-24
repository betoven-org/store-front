"use client";

import { useCallback } from "react";

// ---------------------------------------------------------------------------
// Types (mirrors packages/brasa-core/src/manifest.ts)
// ---------------------------------------------------------------------------

type FieldType = "string" | "number" | "boolean" | "object" | "array" | "union";
type FieldFormat =
  | "text"
  | "textarea"
  | "rich-text"
  | "image"
  | "color"
  | "url"
  | "date"
  | "email"
  | "code"
  | "select"
  | "hidden";

type FieldSchema = {
  type: FieldType;
  title?: string;
  description?: string;
  format?: FieldFormat;
  required?: boolean;
  default?: unknown;
  group?: string;
  properties?: Record<string, FieldSchema>;
  items?: FieldSchema;
  options?: string[];
};

export type SectionEditorProps = {
  schema: Record<string, FieldSchema>;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
};

// ---------------------------------------------------------------------------
// Shared class constants
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring";

const labelCls = "block text-sm font-medium text-foreground";

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
// SVG icons (no emoji policy)
// ---------------------------------------------------------------------------

function SvgPlus() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z" />
    </svg>
  );
}

function SvgX() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
    </svg>
  );
}

function SvgChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
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
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
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
        <FieldLabel
          htmlFor={id}
          title={schema.title ?? fieldKey}
          required={schema.required}
          description={schema.description}
        />
        <textarea
          id={id}
          value={strVal}
          placeholder={placeholder}
          required={schema.required}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} resize-y`}
        />
      </FieldWrapper>
    );
  }

  if (format === "rich-text") {
    return (
      <FieldWrapper>
        <FieldLabel
          htmlFor={id}
          title={schema.title ?? fieldKey}
          required={schema.required}
          description={schema.description}
        />
        <p className="text-xs text-muted-foreground">
          Editor rico sera adicionado futuramente — editando HTML diretamente.
        </p>
        <textarea
          id={id}
          value={strVal}
          placeholder={placeholder ?? "<p>Conteudo HTML...</p>"}
          required={schema.required}
          rows={8}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} resize-y font-mono text-xs`}
        />
      </FieldWrapper>
    );
  }

  if (format === "image") {
    return (
      <FieldWrapper>
        <FieldLabel
          htmlFor={id}
          title={schema.title ?? fieldKey}
          required={schema.required}
          description={schema.description}
        />
        <input
          id={id}
          type="text"
          value={strVal}
          placeholder={placeholder ?? "https://..."}
          required={schema.required}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
        {strVal && (
          <div className="mt-1.5 overflow-hidden rounded-md border border-border bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={strVal}
              alt={`Preview de ${schema.title ?? fieldKey}`}
              className="max-h-40 w-auto object-contain p-2"
              width={320}
              height={160}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </FieldWrapper>
    );
  }

  if (format === "color") {
    return (
      <FieldWrapper>
        <FieldLabel
          htmlFor={id}
          title={schema.title ?? fieldKey}
          required={schema.required}
          description={schema.description}
        />
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="color"
            value={strVal || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded-md border border-border bg-card p-0.5 shadow-sm"
          />
          <input
            type="text"
            value={strVal}
            placeholder={placeholder ?? "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} flex-1`}
            aria-label={`Valor hex de ${schema.title ?? fieldKey}`}
          />
        </div>
      </FieldWrapper>
    );
  }

  if (format === "select") {
    const options = schema.options ?? [];
    return (
      <FieldWrapper>
        <FieldLabel
          htmlFor={id}
          title={schema.title ?? fieldKey}
          required={schema.required}
          description={schema.description}
        />
        <select
          id={id}
          value={strVal}
          required={schema.required}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="">Selecione...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </FieldWrapper>
    );
  }

  // url | email | date | text (default)
  const inputType =
    format === "url"
      ? "url"
      : format === "email"
        ? "email"
        : format === "date"
          ? "date"
          : "text";

  return (
    <FieldWrapper>
      <FieldLabel
        htmlFor={id}
        title={schema.title ?? fieldKey}
        required={schema.required}
        description={schema.description}
      />
      <input
        id={id}
        type={inputType}
        value={strVal}
        placeholder={placeholder}
        required={schema.required}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </FieldWrapper>
  );
}

function NumberField({ fieldKey, schema, value, onChange }: FieldRendererProps) {
  const id = `field-${fieldKey}`;
  const numVal = value !== undefined && value !== null ? Number(value) : "";
  const placeholder =
    schema.default !== undefined ? String(schema.default) : undefined;

  return (
    <FieldWrapper>
      <FieldLabel
        htmlFor={id}
        title={schema.title ?? fieldKey}
        required={schema.required}
        description={schema.description}
      />
      <input
        id={id}
        type="number"
        value={numVal}
        placeholder={placeholder}
        required={schema.required}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
        className={inputCls}
      />
    </FieldWrapper>
  );
}

function BooleanField({ fieldKey, schema, value, onChange }: FieldRendererProps) {
  const id = `field-${fieldKey}`;
  const checked = Boolean(value);

  return (
    <FieldWrapper>
      <div className="flex items-start gap-3">
        <div className="flex h-5 items-center">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-border text-primary accent-primary focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor={id} className={`${labelCls} cursor-pointer`}>
            {schema.title ?? fieldKey}
            {schema.required && (
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {schema.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{schema.description}</p>
          )}
        </div>
      </div>
    </FieldWrapper>
  );
}

function ObjectField({ fieldKey, schema, value, onChange, depth = 0 }: FieldRendererProps) {
  if (!schema.properties) return null;

  const objVal = (value as Record<string, unknown>) ?? {};

  const handleFieldChange = (key: string, fieldValue: unknown) => {
    onChange({ ...objVal, [key]: fieldValue });
  };

  return (
    <fieldset className="rounded-md border border-border bg-background px-4 pb-4 pt-3">
      <legend className="px-1 text-sm font-medium text-foreground">
        {schema.title ?? fieldKey}
      </legend>
      {schema.description && (
        <p className="mb-3 text-xs text-muted-foreground">{schema.description}</p>
      )}
      <div className="space-y-4">
        {Object.entries(schema.properties).map(([key, fieldSchema]) => {
          if (fieldSchema.format === "hidden") return null;
          return (
            <FieldRenderer
              key={key}
              fieldKey={`${fieldKey}.${key}`}
              schema={fieldSchema}
              value={objVal[key] ?? fieldSchema.default}
              onChange={(v) => handleFieldChange(key, v)}
              depth={depth + 1}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

function ArrayField({ fieldKey, schema, value, onChange, depth = 0 }: FieldRendererProps) {
  const items = schema.items;
  const arrVal = (value as unknown[]) ?? [];

  const handleItemChange = (index: number, itemValue: unknown) => {
    const next = [...arrVal];
    next[index] = itemValue;
    onChange(next);
  };

  const handleAdd = () => {
    const empty = items ? emptyFromSchema(items) : "";
    onChange([...arrVal, empty]);
  };

  const handleRemove = (index: number) => {
    onChange(arrVal.filter((_, i) => i !== index));
  };

  return (
    <FieldWrapper>
      <FieldLabel
        title={schema.title ?? fieldKey}
        required={schema.required}
        description={schema.description}
      />
      <div className="space-y-3">
        {arrVal.map((item, index) => (
          <div
            key={index}
            className="relative border-l-2 border-primary/20 pl-4"
          >
            <button
              type="button"
              onClick={() => handleRemove(index)}
              aria-label={`Remover item ${index + 1}`}
              className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <SvgX />
            </button>
            {items ? (
              <FieldRenderer
                fieldKey={`${fieldKey}[${index}]`}
                schema={items}
                value={item}
                onChange={(v) => handleItemChange(index, v)}
                depth={(depth ?? 0) + 1}
              />
            ) : (
              <input
                type="text"
                value={String(item ?? "")}
                onChange={(e) => handleItemChange(index, e.target.value)}
                className={`${inputCls} pr-8`}
                aria-label={`Item ${index + 1} de ${schema.title ?? fieldKey}`}
              />
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <SvgPlus />
        Adicionar
      </button>
    </FieldWrapper>
  );
}

function UnionField({ fieldKey, schema, value, onChange }: FieldRendererProps) {
  // Union is rendered the same as select — options hold the possible values
  return (
    <StringField
      fieldKey={fieldKey}
      schema={{ ...schema, format: "select" }}
      value={value}
      onChange={onChange}
    />
  );
}

// ---------------------------------------------------------------------------
// Central dispatcher
// ---------------------------------------------------------------------------

function FieldRenderer({ fieldKey, schema, value, onChange, depth = 0 }: FieldRendererProps) {
  if (schema.format === "hidden") return null;

  const props: FieldRendererProps = { fieldKey, schema, value, onChange, depth };

  switch (schema.type) {
    case "string":
      return <StringField {...props} />;
    case "number":
      return <NumberField {...props} />;
    case "boolean":
      return <BooleanField {...props} />;
    case "object":
      return <ObjectField {...props} />;
    case "array":
      return <ArrayField {...props} />;
    case "union":
      return <UnionField {...props} />;
    default:
      return null;
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

import { useState } from "react";

function GroupSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-t-md bg-background px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
        aria-expanded={open}
      >
        {title}
        <SvgChevron open={open} />
      </button>
      {open && <div className="space-y-4 px-4 pb-4 pt-3">{children}</div>}
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
}: SectionEditorProps) {
  const handleFieldChange = useCallback(
    (key: string, fieldValue: unknown) => {
      onChange({ ...values, [key]: fieldValue });
    },
    [values, onChange]
  );

  const groups = groupEntries(schema);
  const hasGroups = groups.size > 1 || !groups.has("__ungrouped__");

  if (!hasGroups || (groups.size === 1 && groups.has("__ungrouped__"))) {
    // Single flat list — no group headers
    const entries = groups.get("__ungrouped__") ?? [];
    return (
      <div className="space-y-4">
        {entries.map(([key, field]) => (
          <FieldRenderer
            key={key}
            fieldKey={key}
            schema={field}
            value={values[key] ?? field.default}
            onChange={(v) => handleFieldChange(key, v)}
          />
        ))}
      </div>
    );
  }

  // Multiple groups — render each as a collapsible section
  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([groupName, entries]) => {
        const isUngrouped = groupName === "__ungrouped__";

        const fields = (
          <div className="space-y-4">
            {entries.map(([key, field]) => (
              <FieldRenderer
                key={key}
                fieldKey={key}
                schema={field}
                value={values[key] ?? field.default}
                onChange={(v) => handleFieldChange(key, v)}
              />
            ))}
          </div>
        );

        if (isUngrouped) return fields;

        return (
          <GroupSection key={groupName} title={groupName}>
            {entries.map(([key, field]) => (
              <FieldRenderer
                key={key}
                fieldKey={key}
                schema={field}
                value={values[key] ?? field.default}
                onChange={(v) => handleFieldChange(key, v)}
              />
            ))}
          </GroupSection>
        );
      })}
    </div>
  );
}
