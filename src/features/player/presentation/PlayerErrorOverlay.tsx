"use client";

import { AlertCircle, ArrowLeft, ListVideo, RotateCcw } from "lucide-react";
import type { PlaybackErrorCode } from "../domain/types";
import { getErrorInfo } from "../domain/errors";

type Props = {
  code: PlaybackErrorCode;
  attemptedCount: number;
  sourceCount: number;
  sources: { id: string; title: string }[];
  onRetry: () => void;
  onChooseSource: (sourceId: string) => void;
  onBack: () => void;
};

export function PlayerErrorOverlay({
  code,
  attemptedCount,
  sourceCount,
  sources,
  onRetry,
  onChooseSource,
  onBack,
}: Props) {
  const info = getErrorInfo(code);
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white"
    >
      <AlertCircle className="h-12 w-12 text-[var(--danger)]" aria-hidden />
      <div>
        <p className="text-lg font-semibold">Aucune source n’a pu être lue.</p>
        {info.hint && <p className="mt-1 text-sm text-white/70">{info.hint}</p>}
        <p className="mt-2 text-sm text-white/70">
          {attemptedCount} source{attemptedCount > 1 ? "s" : ""} essayée
          {attemptedCount > 1 ? "s" : ""} sur {sourceCount}.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </button>
        <button
          type="button"
          onClick={onBack}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux chaînes
        </button>
      </div>
      {sources.length > 1 && (
        <details className="w-full max-w-sm text-sm">
          <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
            <ListVideo className="h-4 w-4" />
            Choisir une autre source
          </summary>
          <div className="mt-2 grid gap-1 rounded-lg bg-black/60 p-2">
            {sources.map((source, index) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onChooseSource(source.id)}
                className="rounded px-3 py-2 text-left text-white/80 hover:bg-white/10 hover:text-white"
              >
                Source {index + 1} — {source.title}
              </button>
            ))}
          </div>
        </details>
      )}
      <details className="text-xs text-white/50">
        <summary className="cursor-pointer">Détails techniques</summary>
        <p className="mt-1">{info.message}</p>
        <p>Code : {code}</p>
      </details>
    </div>
  );
}
