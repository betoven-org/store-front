"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { SectionBlock } from "@brasa/core/manifest";
import type { EditState, Page, PageVersion } from "./types";

export function usePageVersions(
  id: string,
  callbacks: {
    setPage: (page: Page) => void;
    setEditState: (state: EditState) => void;
    setSavedSnapshot: (snapshot: string) => void;
    setSectionBlocks: (blocks: SectionBlock[]) => void;
    pushToHistory: (blocks: SectionBlock[]) => void;
    setPreviewKey: (updater: (prev: number) => number) => void;
  },
) {
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.docs ?? []);
      }
    } catch {
      toast.error("Erro ao carregar historico");
    } finally {
      setLoadingVersions(false);
    }
  }, [id]);

  const rollback = useCallback(
    async (versionId: number) => {
      if (!confirm("Restaurar esta versao? A pagina atual sera substituida."))
        return;
      setRollingBack(true);
      try {
        const res = await fetch(
          `/api/admin/pages/${id}/versions/${versionId}`,
          { method: "POST" },
        );
        if (!res.ok) throw new Error("Erro ao restaurar");
        const updated: Page = await res.json();
        callbacks.setPage(updated);
        const initial: EditState = {
          title: updated.title,
          metaTitle: updated.metaTitle,
          metaDescription: updated.metaDescription,
          ogTitle: updated.ogTitle,
          ogDescription: updated.ogDescription,
          ogImageUrl: updated.ogImageUrl,
          content: updated.content,
        };
        callbacks.setEditState(initial);
        callbacks.setSavedSnapshot(JSON.stringify(initial));
        callbacks.setSectionBlocks(
          (updated.sections ?? []) as SectionBlock[],
        );
        callbacks.pushToHistory((updated.sections ?? []) as SectionBlock[]);
        callbacks.setPreviewKey((k) => k + 1);
        toast.success("Versao restaurada");
        fetchVersions();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao restaurar",
        );
      } finally {
        setRollingBack(false);
      }
    },
    [id, callbacks, fetchVersions],
  );

  return {
    versions,
    loadingVersions,
    rollingBack,
    fetchVersions,
    rollback,
  };
}
