"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, Trash2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { playlistStore } from "../infrastructure/playlist-store";
import {
  parseM3u,
  toImportedChannel,
  validatePlaylistSize,
  type ParseResult,
} from "../infrastructure/m3u-parser";
import type { ImportedPlaylist } from "../domain/types";
import { APP_CONFIG } from "@/config/app";

export function ImportView() {
  const [playlists, setPlaylists] = useState<ImportedPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastParse, setLastParse] = useState<ParseResult | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setPlaylists(await playlistStore.list());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setLastParse(null);
    setLoading(true);
    try {
      validatePlaylistSize(file.size);
      const text = await file.text();
      const result = parseM3u(text);
      setLastParse(result);
      if (result.entries.length === 0) {
        setError("Aucune entrée valide trouvée dans la playlist.");
        return;
      }
      const channels = result.entries.map((e, i) =>
        toImportedChannel(e, `pending:${file.name}`, i),
      );
      const playlist = await playlistStore.save(file.name, channels);
      setSuccess(`Playlist « ${playlist.name} » importée : ${playlist.channelCount} chaînes.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    await playlistStore.remove(id);
    await refresh();
  };

  return (
    <section className="space-y-6" aria-label="Bibliothèque importée">
      <header className="space-y-2">
        <p className="type-eyebrow">Contenu local</p>
        <h1 className="type-title">Bibliothèque</h1>
        <p className="text-muted max-w-2xl text-sm leading-6">
          Importez une playlist M3U personnelle. Le fichier reste dans votre navigateur — il n'est
          jamais envoyé au serveur.
        </p>
      </header>

      <div className="premium-surface border-dashed p-7 text-center sm:p-10">
        <input
          ref={fileRef}
          type="file"
          accept=".m3u,.m3u8,audio/x-mpegurl,application/x-mpegurl"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="premium-button-primary gap-2 px-5 text-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          Importer un fichier .m3u
        </button>
        <p className="text-muted mt-2 text-xs">
          Taille maximum : {(APP_CONFIG.maxPlaylistBytes / 1024 / 1024).toFixed(0)} Mo
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]"
          data-system-state="error"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-4 text-sm text-[var(--success)]"
          data-system-state="success"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {lastParse && lastParse.rejected.length > 0 && (
        <details className="premium-surface p-4 text-xs">
          <summary className="text-muted cursor-pointer">
            {lastParse.rejected.length} entrée(s) rejetée(s)
          </summary>
          <ul className="text-muted mt-2 space-y-1">
            {lastParse.rejected.slice(0, 20).map((r, i) => (
              <li key={i}>
                <code className="text-[var(--warning)]">{r.line.slice(0, 80)}</code> — {r.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="space-y-3">
        {playlists.length === 0 ? (
          <p className="premium-surface text-muted p-5 text-sm">Aucune playlist importée.</p>
        ) : (
          playlists.map((p) => (
            <article key={p.id} className="premium-surface flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-muted text-xs">
                  {p.channelCount} chaîne(s) · {new Date(p.importedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove(p.id)}
                className="premium-icon-button h-11 w-11 hover:!border-[var(--danger)]/40 hover:!text-[var(--danger)]"
                aria-label={`Supprimer ${p.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
