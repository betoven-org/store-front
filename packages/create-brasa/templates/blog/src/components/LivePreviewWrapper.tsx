"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { applyPatch, type Operation } from "fast-json-patch";
import { SectionRenderer } from "./SectionRenderer";
import type { SectionBlock } from "@/lib/cms";

export function LivePreviewWrapper({ initialBlocks }: { initialBlocks: SectionBlock[] }) {
  const [blocks, setBlocks] = useState<SectionBlock[]>(initialBlocks);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const handleMessage = useCallback((event: MessageEvent) => {
    const msg = event.data;
    if (!msg || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "brasa:live-update": {
        const { patches, blocks: fullBlocks } = msg as {
          patches: Operation[];
          blocks: SectionBlock[];
        };
        if (patches && patches.length > 0) {
          try {
            const cloned = structuredClone(blocksRef.current);
            const result = applyPatch(cloned, patches);
            setBlocks(result.newDocument);
          } catch {
            if (fullBlocks) setBlocks(fullBlocks);
          }
        } else if (fullBlocks) {
          setBlocks(fullBlocks);
        }
        break;
      }
      case "brasa:sections-update": {
        const { blocks: newBlocks } = msg as { blocks: SectionBlock[] };
        if (newBlocks) setBlocks(newBlocks);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  return <SectionRenderer blocks={blocks} />;
}
