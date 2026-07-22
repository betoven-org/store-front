"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { SectionBlock } from "@brasa/core/manifest";

const MAX_HISTORY = 50;

export function useSectionState(
  id: string,
  callbacks: {
    setPage: (updater: (prev: unknown) => unknown) => void;
    setLastSaved: (val: string) => void;
    setPreviewKey: (updater: (prev: number) => number) => void;
  },
) {
  const [sectionBlocks, setSectionBlocks] = useState<SectionBlock[]>([]);
  const [savingSections, setSavingSections] = useState(false);

  // Undo/Redo history
  const sectionHistoryRef = useRef<SectionBlock[][]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const sectionsDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveSectionsRef = useRef<((blocks: SectionBlock[]) => Promise<void>) | null>(null);

  const pushToHistory = useCallback((blocks: SectionBlock[]) => {
    sectionHistoryRef.current = sectionHistoryRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    sectionHistoryRef.current.push(structuredClone(blocks));
    if (sectionHistoryRef.current.length > MAX_HISTORY) {
      sectionHistoryRef.current = sectionHistoryRef.current.slice(
        -MAX_HISTORY,
      );
    }
    historyIndexRef.current = sectionHistoryRef.current.length - 1;
  }, []);

  const saveSections = useCallback(
    async (blocks: SectionBlock[]) => {
      setSavingSections(true);
      try {
        const res = await fetch(`/api/admin/pages/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftSections: blocks }),
        });
        if (res.ok) {
          const updated = await res.json();
          callbacks.setPage(() => updated);
        }
        callbacks.setLastSaved(
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
        callbacks.setPreviewKey((k) => k + 1);
      } catch {
        toast.error("Erro ao salvar sections");
      } finally {
        setSavingSections(false);
      }
    },
    [id, callbacks],
  );

  // Keep ref in sync
  saveSectionsRef.current = saveSections;

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) {
      toast("Nada para desfazer");
      return;
    }
    historyIndexRef.current -= 1;
    const prev = sectionHistoryRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setSectionBlocks(structuredClone(prev));
    if (sectionsDebounceRef.current) clearTimeout(sectionsDebounceRef.current);
    sectionsDebounceRef.current = setTimeout(
      () => saveSectionsRef.current?.(prev),
      800,
    );
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= sectionHistoryRef.current.length - 1) {
      toast("Nada para refazer");
      return;
    }
    historyIndexRef.current += 1;
    const next = sectionHistoryRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setSectionBlocks(structuredClone(next));
    if (sectionsDebounceRef.current) clearTimeout(sectionsDebounceRef.current);
    sectionsDebounceRef.current = setTimeout(
      () => saveSectionsRef.current?.(next),
      800,
    );
  }, []);

  const handleSectionsChange = useCallback(
    (blocks: SectionBlock[]) => {
      setSectionBlocks(blocks);
      if (!isUndoRedoRef.current) {
        pushToHistory(blocks);
      }
      isUndoRedoRef.current = false;
      if (sectionsDebounceRef.current)
        clearTimeout(sectionsDebounceRef.current);
      sectionsDebounceRef.current = setTimeout(
        () => saveSections(blocks),
        1500,
      );
    },
    [pushToHistory, saveSections],
  );

  const canUndo = historyIndexRef.current > 0;
  const canRedo =
    historyIndexRef.current < sectionHistoryRef.current.length - 1;

  return {
    sectionBlocks,
    setSectionBlocks,
    handleSectionsChange,
    saveSections,
    undo,
    redo,
    canUndo,
    canRedo,
    savingSections,
    pushToHistory,
    isUndoRedoRef,
    sectionsDebounceRef,
    saveSectionsRef,
  };
}
