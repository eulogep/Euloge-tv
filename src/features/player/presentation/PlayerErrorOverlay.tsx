"use client";

import { AlertCircle, SkipForward } from "lucide-react";
import type { PlaybackErrorCode } from "../domain/types";
import { getErrorInfo } from "../domain/errors";

type Props = {
  code: PlaybackErrorCode;
  sourceIndex: number;
  sourceCount: number;
  onTryNext: () => void;
};

export function PlayerErrorOverlay({ code, sourceIndex, sourceCount, onTryNext }: Props) {
  const info = getErrorInfo(code);
  const canTryNext = sourceCount > 1 && sourceIndex < sourceCount - 1;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white"
    >
      <AlertCircle className="h-12 w-12 text-[var(--danger)]" aria-hidden />
      <div>
        <p className="text-lg font-semibold">{info.message}</p>
        {info.hint && <p className="mt-1 text-sm text-white/70">{info.hint}</p>}
      </div>
      {canTryNext && (
        <button
          type="button"
          onClick={onTryNext}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <SkipForward className="h-4 w-4" />
          Essayer la source suivante
        </button>
      )}
      <p className="text-xs text-white/50">Code erreur : {code}</p>
    </div>
  );
}
