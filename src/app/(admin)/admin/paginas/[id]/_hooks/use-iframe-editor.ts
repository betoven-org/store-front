"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { SectionBlock } from "@brasa/core/manifest";

type UseIframeEditorArgs = {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  sectionBlocks: SectionBlock[];
  onSectionUpdate: (updater: (prev: SectionBlock[]) => SectionBlock[]) => void;
  sectionsDebounceRef: React.RefObject<ReturnType<typeof setTimeout> | undefined>;
  saveSectionsRef: React.RefObject<((blocks: SectionBlock[]) => Promise<void>) | null>;
  setOpenColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function useIframeEditor({
  iframeRef,
  sectionBlocks,
  onSectionUpdate,
  sectionsDebounceRef,
  saveSectionsRef,
  setOpenColumns,
}: UseIframeEditorArgs) {
  const [inlineEdit, setInlineEdit] = useState(false);

  // Keep sectionBlocks in a ref so the load handler always has the latest value
  const sectionBlocksRef = useRef(sectionBlocks);
  sectionBlocksRef.current = sectionBlocks;

  const sendToIframe = useCallback(
    (msg: object) => {
      iframeRef.current?.contentWindow?.postMessage(msg, "*");
    },
    [iframeRef],
  );

  const injectEditorScript = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    if (iframe.contentDocument.querySelector("script[data-brasa-editor]"))
      return;
    const script = iframe.contentDocument.createElement("script");
    script.setAttribute("data-brasa-editor", "true");
    script.src = "/brasa-editor.js";
    iframe.contentDocument.head.appendChild(script);
  }, [iframeRef]);

  const toggleInlineEdit = useCallback(() => {
    setInlineEdit((prev) => {
      const next = !prev;
      if (next) {
        injectEditorScript();
        setTimeout(() => {
          sendToIframe({
            type: "brasa:init",
            blocks: sectionBlocksRef.current,
          });
          sendToIframe({ type: "brasa:enable" });
        }, 150);
      } else {
        sendToIframe({ type: "brasa:disable" });
      }
      return next;
    });
  }, [injectEditorScript, sendToIframe]);

  // Re-send enable when iframe reloads while inline edit is active
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function onLoad() {
      if (!inlineEdit) return;
      injectEditorScript();
      setTimeout(() => {
        sendToIframe({
          type: "brasa:init",
          blocks: sectionBlocksRef.current,
        });
        sendToIframe({ type: "brasa:enable" });
      }, 150);
    }

    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [inlineEdit, iframeRef, injectEditorScript, sendToIframe]);

  // Listen for messages from the iframe
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || typeof msg.type !== "string") return;

      switch (msg.type) {
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
