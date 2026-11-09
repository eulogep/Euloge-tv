"use client";

import { useEffect, useState } from "react";
import type { Atlas } from "../domain/atlas";

let cached: Atlas | null = null;
let inflight: Promise<Atlas> | null = null;

const loadAtlas = (): Promise<Atlas> => {
  if (cached) return Promise.resolve(cached);
  inflight ??= fetch("/api/atlas")
    .then(async (response) => {
      if (!response.ok) throw new Error("atlas");
      cached = (await response.json()) as Atlas;
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

/** The atlas is one shared, session-long document: every view reads the same copy. */
export const useAtlas = (): { atlas: Atlas | null; failed: boolean; loading: boolean } => {
  const [atlas, setAtlas] = useState<Atlas | null>(cached);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    loadAtlas()
      .then((value) => {
        if (!cancelled) setAtlas(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { atlas, failed, loading: !atlas && !failed };
};
