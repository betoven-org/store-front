"use client";

import { useState, useMemo } from "react";
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
};

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconGrip() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

type SectionPickerProps = {
  sections: SectionSchema[];
  onSelect: (schema: SectionSchema) => void;
  onClose: () => void;
};

function SectionPicker({ sections, onSelect, onClose }: SectionPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.group?.toLowerCase().includes(q)
    );
  }, [sections, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SectionSchema[]>();
    for (const section of filtered) {
      const group = section.group ?? "Outros";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(section);
    }
    return map;
  }, [filtered]);

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar secao"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Adicionar secao</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-muted-foreground"
          >
            <IconX />
          </button>
        </div>

        {/* search */}
        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground">
              <IconSearch />
            </span>
            <input
              type="search"
              autoFocus
              placeholder="Buscar secoes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-card py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* list */}
        <div className="max-h-[420px] overflow-y-auto px-2 py-2">
          {grouped.size === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma secao encontrada.
            </p>
          ) : (
            Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                {items.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => onSelect(section)}
                    className="flex w-full flex-col rounded-md px-3 py-2.5 text-left hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {section.title}
                    </span>
                    {section.description && (
                      <span className="mt-0.5 text-xs text-muted-foreground">
                        {section.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Block item (base UI, reused by SortableItem and DragOverlay) ──────────────

type BlockItemProps = {
  title: string;
  isSelected: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  onSelect: () => void;
  onDelete: () => void;
};

function BlockItem({
  title,
  isSelected,
  isDragging = false,
  dragHandleProps,
  onSelect,
  onDelete,
}: BlockItemProps) {
  return (
    <div
      className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
        isDragging
          ? "opacity-50"
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

      {/* title */}
      <span
        className={`min-w-0 flex-1 truncate text-sm font-medium ${
          isSelected ? "text-primary" : "text-foreground"
        }`}
      >
        {title}
      </span>

      {/* delete action */}
      <div
        className={`flex flex-shrink-0 items-center ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
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
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

function SortableItem({ id, title, isSelected, onSelect, onDelete }: SortableItemProps) {
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
        isSelected={isSelected}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    </li>
  );
}

// ── PageBuilder ───────────────────────────────────────────────────────────────

export default function PageBuilder({ manifest, value, onChange }: PageBuilderProps) {
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
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[300px_1fr]">
        {/* ── Left panel: block list ─────────────────────────────────────── */}
        <aside className="flex flex-col border-r border-border bg-transparent">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Secoes
            </h2>
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {value.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {value.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
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
                  <ul className="space-y-1.5 p-3" role="list">
                    {value.map((block) => {
                      const schema = schemaMap.get(block.component);
                      return (
                        <SortableItem
                          key={block.id}
                          id={block.id}
                          title={schema?.title ?? block.component}
                          isSelected={selectedId === block.id}
                          onSelect={() => setSelectedId(block.id)}
                          onDelete={() => deleteBlock(block.id)}
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
          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <IconPlus />
              Adicionar secao
            </button>
          </div>
        </aside>

        {/* ── Right panel: section editor ───────────────────────────────── */}
        <main className="flex flex-col overflow-y-auto">
          {selectedBlock && selectedSchema ? (
            <div className="flex flex-col gap-0">
              {/* Editor header */}
              <div className="border-b border-border bg-card px-6 py-4">
                <h2 className="text-sm font-semibold text-foreground">
                  {selectedSchema.title}
                </h2>
                {selectedSchema.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedSchema.description}
                  </p>
                )}
              </div>

              {/* Editor form */}
              <div className="px-6 py-5">
                <SectionEditor
                  schema={selectedSchema.props}
                  values={selectedBlock.props}
                  onChange={updateProps}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {value.length === 0
                  ? "Adicione uma secao para comecar."
                  : "Selecione uma secao para editar."}
              </p>
            </div>
          )}
        </main>
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
