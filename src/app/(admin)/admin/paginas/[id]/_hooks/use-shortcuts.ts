"use client";

import { useEffect, useRef } from "react";

type ShortcutCallbacks = {
  onSave: () => void;
  onPublish: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

/**
 * Keyboard shortcuts:
 * - Ctrl/Cmd+S       -> save
 * - Ctrl/Cmd+Shift+P -> publish
 * - Ctrl/Cmd+Z       -> undo
 * - Ctrl/Cmd+Shift+Z -> redo
 */
export function useShortcuts(callbacks: ShortcutCallbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Ctrl+S / Cmd+S
      if (e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        cbRef.current.onSave();
        return;
      }

      // Ctrl+Shift+P / Cmd+Shift+P
      if (e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        cbRef.current.onPublish();
        return;
      }

      // Ctrl+Z / Cmd+Z
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        cbRef.current.onUndo();
        return;
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z
      if ((e.key === "z" || e.key === "Z") && e.shiftKey) {
        e.preventDefault();
        cbRef.current.onRedo();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
