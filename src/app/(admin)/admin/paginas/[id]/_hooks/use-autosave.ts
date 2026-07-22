"use client";

import { useEffect, useRef } from "react";

/**
 * Generic autosave hook.
 * Runs `saveFn(currentState)` every `intervalMs` if the state has changed
 * compared to the `savedSnapshot`.
 */
export function useAutosave<T>(
  state: T | null,
  savedSnapshot: string,
  saveFn: (state: T) => Promise<void>,
  intervalMs = 30000,
) {
  const stateRef = useRef(state);
  stateRef.current = state;

  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const snapshotRef = useRef(savedSnapshot);
  snapshotRef.current = savedSnapshot;

  useEffect(() => {
    const timer = setInterval(() => {
      const current = stateRef.current;
      if (current && JSON.stringify(current) !== snapshotRef.current) {
        saveFnRef.current(current);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);
}
