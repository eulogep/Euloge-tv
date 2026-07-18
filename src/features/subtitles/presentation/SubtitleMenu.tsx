"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { useEmbeddedTracks } from "../infrastructure/embedded-subtitle-provider";
import { ValidationError } from "@/lib/errors";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onImportVtt: (file: File) => Promise<void>;
  onClose: () => void;
};

export function SubtitleMenu({ videoRef, onImportVtt, onClose }: Props) {
  const video = videoRef.current;
  const tracks = useEmbeddedTracks(video);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!video) return;
    const onChange = () => setError(null);
    video.textTracks.addEventListener("change", onChange);
    return () => video.textTracks.removeEventListener("change", onChange);
  }, [video]);

  const toggleTrack = (index: number) => {
    if (!video) return;
    const target = video.textTracks[index];
    if (!target) return;
    // Disable all others, toggle the target.
    for (let i = 0; i < video.textTracks.length; i++) {
      const t = video.textTracks[i];
      if (i === index) {
        t.mode = t.mode === "showing" ? "disabled" : "showing";
      } else if (t.mode === "showing") {
        t.mode = "disabled";
      }
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await onImportVtt(file);
      setError(null);
      onClose();
    } catch (err) {
      const message = err instanceof ValidationError ? err.message : "Fichier VTT invalide.";
      setError(message);
    }
  };

  return (
    <div className="absolute top-12 right-3 z-30 w-72 rounded-lg border border-white/10 bg-black/95 p-3 text-sm text-white shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Sous-titres</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-white/70 hover:bg-white/10"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="max-h-60 space-y-1 overflow-y-auto">
        {tracks.length === 0 && <li className="text-xs text-white/60">Aucune piste intégrée.</li>}
        {tracks.map((t, i) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => toggleTrack(i)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-white/10"
            >
              <span className="truncate">{t.label}</span>
              {t.enabled && <span className="text-xs text-[var(--accent)]">Activé</span>}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-white/10 pt-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".vtt,text/vtt"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10"
        >
          <FileUp className="h-4 w-4" />
          Importer un fichier .vtt
        </button>
        {error && (
          <p className="mt-1 text-xs text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
