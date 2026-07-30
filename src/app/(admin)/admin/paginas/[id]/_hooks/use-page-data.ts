"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { SectionBlock } from "@brasa/core/manifest";
import type { EditState, Page } from "./types";

export function usePageData(id: string) {
  const [page, setPage] = useState<Page | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedSnapshotRef = useRef("");

  // -- Initial sections loaded from fetch (state triggers consumer re-render)
  const [initialSections, setInitialSections] = useState<SectionBlock[] | null>(null);

  useEffect(() => {
    fetch(`/api/admin/pages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar pagina");
        return res.json();
      })
      .then((data: Page) => {
        setPage(data);
        const initial: EditState = data.draft ?? {
          title: data.title,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          ogTitle: data.ogTitle,
          ogDescription: data.ogDescription,
          ogImageUrl: data.ogImageUrl,
          content: data.content,
        };
        setEditState(initial);
        const snap = JSON.stringify(initial);
        setSavedSnapshot(snap);
        savedSnapshotRef.current = snap;
        setScheduledAt(data.scheduledAt ?? null);

        // Compute effective sections and expose via ref
        const pub = JSON.stringify(data.sections ?? []);
        const draft = JSON.stringify(data.draftSections ?? []);
        const effectiveSections =
          draft !== pub && data.draftSections
            ? data.draftSections
            : (data.sections ?? []);
        setInitialSections(effectiveSections as SectionBlock[]);
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const save = useCallback(
    async (state: EditState) => {
      // Skip save if nothing changed from the last saved snapshot
      const snap = JSON.stringify(state);
      if (snap === savedSnapshotRef.current) return;

      setSaving(true);
      try {
        const res = await fetch(`/api/admin/pages/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        if (!res.ok) throw new Error("Erro ao salvar");
        const updated: Page = await res.json();
        setPage(updated);
        setSavedSnapshot(snap);
        savedSnapshotRef.current = snap;
        setLastSaved(
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
        setPreviewKey((k) => k + 1);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar");
      } finally {
        setSaving(false);
      }
    },
    [id],
  );

  const publish = useCallback(async () => {
    if (!editState || !page) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await save(editState);
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erro ao publicar");
      const updated: Page = await res.json();
      setPage(updated);
      // Reset editState from the newly published values so autosave
      // doesn't re-create a false draft
      const publishedState: EditState = {
        title: updated.title,
        metaTitle: updated.metaTitle,
        metaDescription: updated.metaDescription,
        ogTitle: updated.ogTitle,
        ogDescription: updated.ogDescription,
        ogImageUrl: updated.ogImageUrl,
        content: updated.content,
      };
      setEditState(publishedState);
      const snap = JSON.stringify(publishedState);
      setSavedSnapshot(snap);
      savedSnapshotRef.current = snap;
      toast.success("Pagina publicada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setPublishing(false);
    }
  }, [editState, page, id, save]);

  const schedule = useCallback(async () => {
    if (!scheduledAt || !editState) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await save(editState);
    setScheduling(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });
      if (!res.ok) throw new Error("Erro ao agendar");
      const updated: Page = await res.json();
      setPage(updated);
      const dateStr = new Date(scheduledAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      toast.success(`Publicação agendada para ${dateStr}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao agendar");
    } finally {
      setScheduling(false);
    }
  }, [scheduledAt, editState, id, save]);

  const cancelSchedule = useCallback(async () => {
    setScheduling(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: null }),
      });
      if (!res.ok) throw new Error("Erro ao cancelar agendamento");
      const updated: Page = await res.json();
      setPage(updated);
      setScheduledAt(null);
      toast.success("Agendamento cancelado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar");
    } finally {
      setScheduling(false);
    }
  }, [id]);

  const hasSectionsDraft =
    page !== null &&
    page.draftSections !== null &&
    JSON.stringify(page.draftSections) !== JSON.stringify(page.sections);
  const hasDraft = (page?.draft !== null && page?.draft !== undefined) || hasSectionsDraft;

  return {
    page,
    setPage,
    editState,
    setEditState,
    savedSnapshot,
    setSavedSnapshot,
    save,
    publish,
    schedule,
    cancelSchedule,
    saving,
    publishing,
    scheduling,
    loading,
    fetchError,
    lastSaved,
    setLastSaved,
    previewKey,
    setPreviewKey,
    scheduledAt,
    setScheduledAt,
    hasDraft,
    debounceRef,
    initialSections,
    clearInitialSections: () => setInitialSections(null),
  };
}
