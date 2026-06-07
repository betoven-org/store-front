"use client";

import { useState } from "react";
import ToggleSwitch from "./ToggleSwitch";
import BrasaLoader from "./BrasaLoader";

type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "textarea" | "select" | "file" | "checkbox";
  value?: string | boolean;
  onChange?: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  error?: string;
  required?: boolean;
  options?: SelectOption[];
  placeholder?: string;
  description?: string;
  /** Enable AI assistant button for this field */
  ai?: boolean | "write" | "rewrite" | "summarize" | "seo";
  /** Context to help AI generate better content (e.g. page title, site description) */
  aiContext?: string;
};

function AIButton({
  mode,
  context,
  currentValue,
  onGenerated,
}: {
  mode: string;
  context?: string;
  currentValue: string;
  onGenerated: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function generate(selectedMode: string) {
    setLoading(true);
    setShowMenu(false);
    try {
      const prompt =
        selectedMode === "rewrite"
          ? `Reescreva este texto: "${currentValue}"`
          : selectedMode === "summarize"
            ? `Resuma: "${currentValue}"`
            : selectedMode === "seo"
              ? `Gere SEO para: "${currentValue || context || ""}"`
              : context
                ? `Com base em: "${context}". Gere: ${currentValue || "um texto relevante"}`
                : currentValue || "Gere um texto curto e relevante";

      const res = await fetch("/api/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context, mode: selectedMode }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro na IA");
      }

      const data = await res.json();
      if (data.content) {
        onGenerated(data.content.trim());
      }
    } catch {
      // Silent fail — toast would need to be imported from page context
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <span className="flex items-center justify-center w-7 h-7">
        <BrasaLoader size="sm" />
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Gerar com IA"
        aria-label="Gerar conteúdo com IA"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          <path d="M5 3v4" />
          <path d="M19 17v4" />
          <path d="M3 5h4" />
          <path d="M17 19h4" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-md border border-border bg-card shadow-lg py-1">
            <button
              type="button"
              onClick={() => generate("write")}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
            >
              Escrever
            </button>
            {currentValue && (
              <>
                <button
                  type="button"
                  onClick={() => generate("rewrite")}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
                >
                  Reescrever
                </button>
                <button
                  type="button"
                  onClick={() => generate("summarize")}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
                >
                  Resumir
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => generate("seo")}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
            >
              Gerar SEO
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  required = false,
  options = [],
  placeholder,
  description,
  ai,
  aiContext,
}: Props) {
  const baseInputClasses =
    "w-full h-[34px] rounded-md border bg-card px-2.5 text-[13px] text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-muted-foreground";
  const borderClass = error ? "border-destructive/30" : "border-border";

  const inputId = `field-${name}`;
  const errorId = `error-${name}`;
  const descId = `desc-${name}`;

  const showAI = !!ai && (type === "text" || type === "textarea");
  const aiMode = typeof ai === "string" ? ai : "write";

  function handleAIGenerated(text: string) {
    if (onChange) {
      const syntheticEvent = {
        target: { name, value: text },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  }

  const ariaProps = {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": [error && errorId, description && descId]
      .filter(Boolean)
      .join(" ") || undefined,
  };

  const renderInput = () => {
    if (type === "textarea") {
      return (
        <textarea
          id={inputId}
          name={name}
          value={value as string}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={4}
          className={`${baseInputClasses} ${borderClass} h-auto min-h-[120px] py-2.5 resize-y`}
          {...ariaProps}
        />
      );
    }

    if (type === "select") {
      return (
        <select
          id={inputId}
          name={name}
          value={value as string}
          onChange={onChange}
          required={required}
          className={`${baseInputClasses} ${borderClass}`}
          {...ariaProps}
        >
          <option value="">{placeholder || "Selecione..."}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === "checkbox") {
      return (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={inputId} className="text-[12.5px] font-medium text-muted-foreground cursor-pointer">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </label>
          <ToggleSwitch
            id={inputId}
            checked={Boolean(value)}
            onChange={(checked) => {
              if (onChange) {
                const syntheticEvent = {
                  target: { name, type: "checkbox", checked, value: String(checked) },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                onChange(syntheticEvent);
              }
            }}
          />
        </div>
      );
    }

    if (type === "file") {
      return (
        <input
          id={inputId}
          name={name}
          type="file"
          onChange={onChange}
          required={required}
          className={`${baseInputClasses} ${borderClass} file:mr-3 file:rounded file:border-0 file:bg-foreground file:px-3 file:py-1 file:text-sm file:font-medium file:text-background hover:file:bg-foreground/90`}
          {...ariaProps}
        />
      );
    }

    return (
      <input
        id={inputId}
        name={name}
        type={type}
        value={value as string}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`${baseInputClasses} ${borderClass}`}
        {...ariaProps}
      />
    );
  };

  // Checkbox has its own label rendering
  if (type === "checkbox") {
    return (
      <div className="space-y-1">
        {renderInput()}
        {description && (
          <p id={descId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        {showAI && (
          <AIButton
            mode={aiMode}
            context={aiContext}
            currentValue={String(value || "")}
            onGenerated={handleAIGenerated}
          />
        )}
      </div>
      {renderInput()}
      {description && (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
