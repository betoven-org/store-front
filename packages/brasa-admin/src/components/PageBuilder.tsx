"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import type { BrasaManifest, SectionBlock, SectionSchema } from "@brasa/core/manifest";
import SectionEditor from "./SectionEditor";

// ── Types ─────────────────────────────────────────────────────────────────────

type PageBuilderProps = {
  manifest: BrasaManifest;
  value: SectionBlock[];
  onChange: (blocks: SectionBlock[]) => void;
  /** When set, the editor panel is NOT rendered inside PageBuilder.
   *  Instead, the parent receives the selected section info via this callback
   *  and renders <SectionEditorPanel /> wherever it wants. */
  onSelectionChange?: (selection: { block: SectionBlock; schema: SectionSchema } | null) => void;
  /** Hide the inline editor (when parent renders it externally) */
  externalEditor?: boolean;
};

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconGrip() {
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

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// ── Section picker modal ──────────────────────────────────────────────────────

// Palette icon for section thumbnails placeholder
function IconPalette() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

// Group → color mapping for dots and category tabs
const GROUP_COLORS: Record<string, string> = {
  Home: "#8b5cf6",
  Marketing: "#f97316",
  Conteudo: "#3b82f6",
  Produtos: "#10b981",
  Institucional: "#ec4899",
  Outros: "#6b7280",
};

function getGroupColor(group: string): string {
  return GROUP_COLORS[group] ?? GROUP_COLORS["Outros"];
}

type SectionPickerProps = {
  sections: SectionSchema[];
  onSelect: (schema: SectionSchema) => void;
  onClose: () => void;
};

function SectionPicker({ sections, onSelect, onClose }: SectionPickerProps) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("Todos");

  // All unique groups, sorted
  const allGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const s of sections) groups.add(s.group ?? "Outros");
    return ["Todos", ...Array.from(groups).sort()];
  }, [sections]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return sections.filter((s) => {
      const matchGroup = activeGroup === "Todos" || (s.group ?? "Outros") === activeGroup;
      if (!matchGroup) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.group?.toLowerCase().includes(q)
      );
    });
  }, [sections, query, activeGroup]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    /* backdrop with blur */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar seção"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-foreground">Adicionar seção</h2>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {filtered.length} disponíveis
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <IconX />
          </button>
        </div>

        {/* search */}
        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <IconSearch />
            </span>
            <input
              type="search"
              autoFocus
              placeholder="Buscar seções..."
              aria-label="Buscar seções"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* category tabs (pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-5 py-2.5 scrollbar-none">
          {allGroups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(group)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                activeGroup === group
                  ? "bg-primary text-white"
                  : "bg-accent text-muted-foreground hover:bg-accent/80 hover:text-foreground"
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* grid of cards */}
        <div className="max-h-[480px] overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 text-muted-foreground/40">
                <IconSearch />
              </span>
              <p className="text-sm text-muted-foreground">Nenhuma seção encontrada.</p>
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setActiveGroup("Todos"); }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-3" role="list">
              {filtered.map((section) => (
                <li key={section.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(section)}
                    className="group relative flex w-full flex-col overflow-hidden rounded-lg border border-border bg-background text-left transition-all hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* thumbnail area */}
                    <div className="relative aspect-video w-full overflow-hidden bg-accent">
                      {section.thumbnail ? (
                        <img
                          src={section.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                          width={280}
                          height={157}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                          <IconPalette />
                        </div>
                      )}
                      {/* "Adicionar" overlay on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/80 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                          <IconPlus />
                          Adicionar
                        </span>
                      </div>
                    </div>

                    {/* info */}
                    <div className="flex flex-col gap-0.5 p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">{section.group ?? "Outros"}</span>
                      </div>
                      <span className="text-[13px] font-semibold text-foreground leading-tight">
                        {section.title}
                      </span>
                      {section.description && (
                        <span className="line-clamp-2 text-[11px] text-muted-foreground">
                          {section.description}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Block item (base UI, reused by SortableItem and DragOverlay) ──────────────

function IconClock() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="m1 1 22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

type BlockItemProps = {
  title: string;
  group?: string;
  isDeferred?: boolean;
  isHidden?: boolean;
  index?: number;
  isSelected: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onToggleHidden?: () => void;
};

function BlockItem({
  title,
  group,
  isDeferred = false,
  isHidden = false,
  index,
  isSelected,
  isDragging = false,
  dragHandleProps,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleHidden,
}: BlockItemProps) {
  const groupColor = getGroupColor(group ?? "Outros");

  return (
    <div
      className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
        isDragging
          ? "opacity-50"
          : isHidden
          ? "border-border/50 bg-card/50 opacity-50"
          : isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-border hover:bg-background"
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* drag handle */}
      <span
        className="flex-shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-hidden="true"
        {...dragHandleProps}
        onClick={(e) => e.stopPropagation()}
      >
        <IconGrip />
      </span>

      {/* title + group label */}
      <div className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13px] font-medium leading-tight ${
            isHidden ? "text-muted-foreground line-through" : isSelected ? "text-primary" : "text-foreground"
          }`}
        >
          {title}
        </span>
        {group && (
          <span className="block truncate text-[10px] text-muted-foreground leading-none mt-0.5">
            {group}
          </span>
        )}
      </div>

      {/* lazy badge */}
      {isDeferred && !isHidden && (
        <span
          className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          title="Carrega ao scroll"
        >
          <IconClock />
          lazy
        </span>
      )}

      {/* index (visible on hover) */}
      {index !== undefined && (
        <span
          className="flex-shrink-0 text-[10px] font-mono text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        >
          {index + 1}
        </span>
      )}

      {/* actions (visible on hover or when selected) */}
      <div
        className={`flex flex-shrink-0 items-center gap-0.5 ${
          isSelected || isHidden ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* toggle visibility */}
        {onToggleHidden && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
            aria-label={isHidden ? `Mostrar ${title}` : `Ocultar ${title}`}
            title={isHidden ? "Mostrar no site" : "Ocultar no site"}
            className={`rounded p-1 transition-colors ${
              isHidden
                ? "text-warning hover:bg-warning/10 hover:text-warning"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {isHidden ? <IconEyeOff /> : <IconEye />}
          </button>
        )}
        {/* duplicate */}
        {onDuplicate && (
          <button
            type="button"
            onClick={onDuplicate}
            aria-label={`Duplicar ${title}`}
            title="Duplicar"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <IconCopy />
          </button>
        )}
        {/* delete */}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remover ${title}`}
          className="rounded p-1 text-muted-foreground hover:bg-danger-bg hover:text-destructive"
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

// ── Sortable wrapper ──────────────────────────────────────────────────────────

type SortableItemProps = {
  id: string;
  title: string;
  group?: string;
  isDeferred?: boolean;
  isHidden?: boolean;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
};

function SortableItem({ id, title, group, isDeferred, isHidden, index, isSelected, onSelect, onDelete, onDuplicate, onToggleHidden }: SortableItemProps) {
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
    <li ref={setNodeRef} style={style}>
      <BlockItem
        title={title}
        group={group}
        isDeferred={isDeferred}
        isHidden={isHidden}
        index={index}
        isSelected={isSelected}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onToggleHidden={onToggleHidden}
      />
    </li>
  );
}

// ── PageBuilder ───────────────────────────────────────────────────────────────

export default function PageBuilder({ manifest, value, onChange, onSelectionChange, externalEditor }: PageBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    value[0]?.id ?? null
  );
  const [showPicker, setShowPicker] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Build a lookup map from section key -> SectionSchema
  const schemaMap = useMemo(() => {
    const map = new Map<string, SectionSchema>();
    for (const s of manifest.sections) map.set(s.key, s);
    return map;
  }, [manifest.sections]);

  const selectedBlock = value.find((b) => b.id === selectedId) ?? null;
  const selectedSchema = selectedBlock ? schemaMap.get(selectedBlock.component) : null;

  // Notify parent of selection changes (for external editor panel)
  const prevSelRef = useRef<string | null>(null);
  useEffect(() => {
    if (!onSelectionChange) return;
    if (prevSelRef.current === selectedId) return;
    prevSelRef.current = selectedId;
    onSelectionChange(
      selectedBlock && selectedSchema
        ? { block: selectedBlock, schema: selectedSchema }
        : null,
    );
  }, [selectedId, selectedBlock, selectedSchema, onSelectionChange]);

  const activeBlock = activeId ? value.find((b) => b.id === activeId) ?? null : null;
  const activeSchema = activeBlock ? schemaMap.get(activeBlock.component) : null;

  // ── DnD sensors ────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 5px movement before activating drag — prevents accidental
        // drag on click/select
        distance: 5,
      },
    })
  );

  // ── DnD handlers ───────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((b) => b.id === active.id);
    const newIndex = value.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteBlock = (id: string) => {
    const next = value.filter((b) => b.id !== id);
    onChange(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
  };

  const duplicateBlock = (id: string) => {
    const idx = value.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const source = value[idx];
    const newBlock: SectionBlock = {
      ...structuredClone(source),
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random()),
    };
    const next = [...value];
    next.splice(idx + 1, 0, newBlock);
    onChange(next);
    setSelectedId(newBlock.id);
  };

  const toggleHidden = (id: string) => {
    onChange(
      value.map((b) =>
        b.id === id ? { ...b, hidden: !b.hidden } : b
      )
    );
  };

  const addBlock = (schema: SectionSchema) => {
    const newBlock: SectionBlock = {
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random()),
      component: schema.key,
      props: Object.fromEntries(
        Object.entries(schema.props).map(([k, f]) => [k, f.default ?? undefined])
      ),
    };
    const next = [...value, newBlock];
    onChange(next);
    setSelectedId(newBlock.id);
    setShowPicker(false);
  };

  const updateProps = (props: Record<string, unknown>) => {
    if (!selectedBlock) return;
    onChange(
      value.map((b) => (b.id === selectedBlock.id ? { ...b, props } : b))
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-0">
        {/* ── Section list ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Seções
          </h2>
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {value.length}
          </span>
        </div>

        <div className="overflow-y-auto">
          {value.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Nenhuma secao adicionada.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={value.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-1 p-2" role="list">
                  {value.map((block, idx) => {
                    const schema = schemaMap.get(block.component);
                    return (
                      <SortableItem
                        key={block.id}
                        id={block.id}
                        title={schema?.title ?? block.component}
                        group={schema?.group}
                        isDeferred={block.deferred}
                        isHidden={block.hidden}
                        index={idx}
                        isSelected={selectedId === block.id}
                        onSelect={() => setSelectedId(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onToggleHidden={() => toggleHidden(block.id)}
                      />
                    );
                  })}
                </ul>
              </SortableContext>

              <DragOverlay>
                {activeBlock && (
                  <div className="rounded-lg shadow-lg ring-2 ring-ring">
                    <BlockItem
                      title={activeSchema?.title ?? activeBlock.component}
                      group={activeSchema?.group}
                      isDeferred={activeBlock.deferred}
                      isSelected={false}
                      onSelect={() => {}}
                      onDelete={() => {}}
                    />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Add section button */}
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <IconPlus />
            Adicionar seção
          </button>
        </div>

        {/* ── Section editor (below the list, hidden when using external editor) */}
        {!externalEditor && selectedBlock && selectedSchema ? (
          <div className="flex flex-col gap-0 border-t border-border">
            {/* Editor header */}
            <div className="border-b border-border bg-card px-4 py-3">
              <h2 className="text-[13px] font-semibold text-foreground">
                {selectedSchema.title}
              </h2>
              {selectedSchema.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedSchema.description}
                </p>
              )}
            </div>

            {/* Editor form */}
            <div className="overflow-y-auto px-4 py-3 space-y-4">
              <SectionEditor
                schema={selectedSchema.props}
                values={selectedBlock.props}
                onChange={updateProps}
              />
            </div>
          </div>
        ) : !externalEditor ? (
          <div className="flex items-center justify-center border-t border-border py-6">
            <p className="text-xs text-muted-foreground">
              {value.length === 0
                ? "Adicione uma secao para comecar."
                : "Selecione uma secao para editar."}
            </p>
          </div>
        ) : null}
      </div>

      {/* Section picker modal */}
      {showPicker && (
        <SectionPicker
          sections={manifest.sections}
          onSelect={addBlock}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
