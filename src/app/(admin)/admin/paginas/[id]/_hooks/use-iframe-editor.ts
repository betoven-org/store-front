"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { BrasaManifest, SectionBlock } from "@brasa/core/manifest";

type UseIframeEditorArgs = {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  sectionBlocks: SectionBlock[];
  manifest: BrasaManifest | null;
  onSectionUpdate: (updater: (prev: SectionBlock[]) => SectionBlock[]) => void;
  sectionsDebounceRef: React.RefObject<ReturnType<typeof setTimeout> | undefined>;
  saveSectionsRef: React.RefObject<((blocks: SectionBlock[]) => Promise<void>) | null>;
  setOpenColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
};

function buildSchemas(manifest: BrasaManifest | null): Record<string, Record<string, { type: string; format?: string }>> {
  const schemas: Record<string, Record<string, { type: string; format?: string }>> = {};
  if (!manifest) return schemas;
  for (const s of manifest.sections) {
    schemas[s.key] = {};
    for (const [k, f] of Object.entries(s.props)) {
      if (f.format === "hidden") continue;
      schemas[s.key][k] = { type: f.type, format: f.format };
    }
  }
  return schemas;
}

export function useIframeEditor({
  iframeRef,
  sectionBlocks,
  manifest,
  onSectionUpdate,
  sectionsDebounceRef,
  saveSectionsRef,
  setOpenColumns,
}: UseIframeEditorArgs) {
  const [inlineEdit, setInlineEdit] = useState(false);

  const sectionBlocksRef = useRef(sectionBlocks);
  sectionBlocksRef.current = sectionBlocks;
  const manifestRef = useRef(manifest);
  manifestRef.current = manifest;
  const inlineEditRef = useRef(inlineEdit);
  inlineEditRef.current = inlineEdit;

  const sendToIframe = useCallback(
    (msg: object) => {
      iframeRef.current?.contentWindow?.postMessage(msg, "*");
    },
    [iframeRef],
  );

  // Try to inject script via contentDocument (same-origin only).
  // For cross-origin or internal preview, the script is already in the HTML.
  const tryInjectScript = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument) return;
      if (iframe.contentDocument.querySelector("script[data-brasa-editor]")) return;
      const script = iframe.contentDocument.createElement("script");
      script.setAttribute("data-brasa-editor", "true");
      script.src = "/brasa-editor.js";
      iframe.contentDocument.head.appendChild(script);
    } catch {
      // Cross-origin — script is already embedded in the preview HTML
    }
  }, [iframeRef]);

  const sendInitAndEnable = useCallback(() => {
    const schemas = buildSchemas(manifestRef.current);
    sendToIframe({
      type: "brasa:init",
      blocks: sectionBlocksRef.current,
      schemas,
    });
    sendToIframe({ type: "brasa:enable" });
  }, [sendToIframe]);

  const toggleInlineEdit = useCallback(() => {
    setInlineEdit((prev) => {
      const next = !prev;
      if (next) {
        tryInjectScript();
        // Send init after a short delay to let the script load
        setTimeout(sendInitAndEnable, 300);
      } else {
        sendToIframe({ type: "brasa:disable" });
      }
      return next;
    });
  }, [tryInjectScript, sendInitAndEnable, sendToIframe]);

  // When iframe reloads while inline edit is active, re-send init+enable
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function onLoad() {
      if (!inlineEditRef.current) return;
      tryInjectScript();
      setTimeout(sendInitAndEnable, 300);
    }

    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [iframeRef, tryInjectScript, sendInitAndEnable]);

  // Listen for messages from the iframe
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || typeof msg.type !== "string") return;

      switch (msg.type) {
        case "brasa:ready": {
          if (inlineEditRef.current) sendInitAndEnable();
          break;
        }
        case "brasa:update": {
          const { blockId, propKey, value } = msg as {
            blockId: string;
            propKey: string;
            value: string;
          };
          onSectionUpdate((prev) => {
            const next = prev.map((block) => {
              if (block.id !== blockId) return block;
              return { ...block, props: { ...block.props, [propKey]: value } };
            });
            if (sectionsDebounceRef.current)
              clearTimeout(sectionsDebounceRef.current);
            sectionsDebounceRef.current = setTimeout(
              () => saveSectionsRef.current?.(next),
              1000,
            );
            return next;
          });
          break;
        }

        case "brasa:select": {
          const { blockId } = msg as { blockId: string };
          setOpenColumns((prev) => {
            const next = new Set(prev);
            next.add("sections");
            return next;
          });
          setTimeout(() => {
            const el = document.querySelector(
              `[data-section-id="${blockId}"]`,
            );
            if (el)
              el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 50);
          break;
        }

        case "brasa:media-request": {
          toast("Selecione uma imagem no painel de seções");
          setOpenColumns((prev) => {
            const next = new Set(prev);
            next.add("sections");
            return next;
          });
          break;
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { inlineEdit, toggleInlineEdit, sendToIframe };
}
