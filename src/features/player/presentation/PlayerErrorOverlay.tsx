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
      className="absolute inset-0 z-[var(--z-overlay)] flex flex-col items-center justify-center gap-3 bg-[var(--scrim)] p-6 text-center text-white backdrop-blur-sm"
      data-system-state="error"
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
          className="premium-button-primary mt-2 gap-2 px-4 text-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </button>
        <button
          type="button"
          onClick={onBack}
          className="premium-button-secondary mt-2 gap-2 px-4 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux chaînes
        </button>
      </div>
      {sources.length > 1 && (
        <details className="w-full max-w-sm text-sm">
          <summary className="premium-button-secondary mx-auto w-fit cursor-pointer list-none gap-2 px-4">
            <ListVideo className="h-4 w-4" />
            Choisir une autre source
          </summary>
          <div className="border-border bg-surface/95 mt-2 grid gap-1 rounded-xl border p-2">
            {sources.map((source, index) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onChooseSource(source.id)}
                className="min-h-11 rounded-lg px-3 py-2 text-left text-white/80 hover:bg-white/10 hover:text-white"
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
