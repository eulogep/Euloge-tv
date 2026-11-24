"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileUp,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Play,
  ChevronDown,
  ChevronUp,
  Search,
  ClipboardPaste,
  Tv,
  ExternalLink,
  Globe,
  Download,
} from "lucide-react";
import { playlistStore } from "../infrastructure/playlist-store";
import {
  parseM3u,
  toImportedChannel,
  validatePlaylistSize,
  type ParseResult,
} from "../infrastructure/m3u-parser";
import type { ImportedPlaylist } from "../domain/types";
import { APP_CONFIG } from "@/config/app";
import { useAppStore } from "@/lib/utils/app-store";
import type { TbcplSite, TbcplCatalog } from "@/features/catalog/infrastructure/tbcpl-client";

const TBCPL_CATEGORY_LABELS: Record<string, string> = {
  livetv: "Live TV & Sports",
  movies: "Films & Séries",
  anime: "Anime",
  manga: "Manga",
  paid: "Payant",
  apps: "Applications",
};

export function ImportView() {
  const watch = useAppStore((state) => state.watch);
  const [playlists, setPlaylists] = useState<ImportedPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastParse, setLastParse] = useState<ParseResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [channelQuery, setChannelQuery] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteName, setPasteName] = useState("Ma playlist M3U");
  const [pasteText, setPasteText] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  // TBCPL catalog state
  const [tbcplCatalog, setTbcplCatalog] = useState<TbcplCatalog | null>(null);
  const [tbcplLoading, setTbcplLoading] = useState(false);
  const [tbcplFilter, setTbcplFilter] = useState<string>("livetv");
  const [tbcplOpen, setTbcplOpen] = useState(false);

  // iptv-github country import state
  const [githubCountry, setGithubCountry] = useState("fr");
  const [githubLoading, setGithubLoading] = useState(false);

  // Local playlists state (.txt / generated-playlist.m3u)
  const [localLoading, setLocalLoading] = useState(false);

  const importLocalPlaylist = async () => {
    setLocalLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/local-playlist");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ok: boolean; name: string; m3u: string; count: number };
      if (!data.m3u) {
        throw new Error("Aucun flux détecté dans les fichiers locaux.");
      }
      const bytes = new TextEncoder().encode(data.m3u).byteLength;
      await importM3uText(data.name || "Playlists locales", data.m3u, bytes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import local impossible.");
    } finally {
      setLocalLoading(false);
    }
  };

  const refresh = async () => {
    setPlaylists(await playlistStore.list());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const loadTbcplCatalog = async () => {
    if (tbcplCatalog || tbcplLoading) return;
    setTbcplLoading(true);
    try {
      const res = await fetch("/api/tbcpl");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as TbcplCatalog;
      setTbcplCatalog(data);
    } catch {
      setError("Impossible de charger le catalogue TBCPL.");
    } finally {
      setTbcplLoading(false);
    }
  };

  const importFromGithubCountry = async () => {
    if (!githubCountry.trim()) return;
    setGithubLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/iptv-github?country=${encodeURIComponent(githubCountry.trim())}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { country: string; channels: unknown[]; count: number };
      if (!data.channels?.length) {
        setError(`Aucun flux trouvé pour le pays « ${githubCountry} ».`);
        return;
      }
      const m3uLines = [`#EXTM3U`];
      for (const ch of data.channels as Array<{ name: string; sourceUrl: string; countryCode?: string | null; categories?: string[] }>) {
        m3uLines.push(`#EXTINF:-1 tvg-country="${ch.countryCode ?? ""}",${ch.name}`);
        m3uLines.push(ch.sourceUrl);
      }
      const m3uText = m3uLines.join("\n");
      const bytes = new TextEncoder().encode(m3uText).byteLength;
      await importM3uText(`TBCPL / GitHub iptv-org — ${githubCountry.toUpperCase()}`, m3uText, bytes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import pays impossible.");
    } finally {
      setGithubLoading(false);
    }
  };

  const importM3uText = async (name: string, text: string, byteSize: number) => {
    setError(null);
    setSuccess(null);
    setLastParse(null);
    setLoading(true);
    try {
      validatePlaylistSize(byteSize);
      const result = parseM3u(text);
      setLastParse(result);
      if (result.entries.length === 0) {
        setError("Aucune entrée valide trouvée dans la playlist.");
        return;
      }
      const prefix = `imported:${Date.now()}`;
      const channels = result.entries.map((e, i) => toImportedChannel(e, prefix, i));
      const playlist = await playlistStore.save(name.trim() || "Playlist importée", channels);
      setSuccess(`Playlist « ${playlist.name} » importée : ${playlist.channelCount} chaînes.`);
      setExpandedId(playlist.id);
      setChannelQuery("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    await importM3uText(file.name, text, file.size);
  };

  const handlePasteImport = async () => {
    const trimmed = pasteText.trim();
    if (!trimmed) {
      setError("Collez le contenu d’une playlist .m3u avant d’importer.");
      return;
    }
    const bytes = new TextEncoder().encode(trimmed).byteLength;
    await importM3uText(pasteName, trimmed, bytes);
    setPasteText("");
    setPasteOpen(false);
  };

  const remove = async (id: string) => {
    await playlistStore.remove(id);
    if (expandedId === id) setExpandedId(null);
    await refresh();
  };

  const normalizedQuery = channelQuery.trim().toLowerCase();
  const visibleChannelsByPlaylist = useMemo(() => {
    const map = new Map<string, ImportedPlaylist["channels"]>();
    for (const p of playlists) {
      if (p.id !== expandedId) continue;
      const filtered = normalizedQuery
        ? p.channels.filter(
            (ch) =>
              ch.name.toLowerCase().includes(normalizedQuery) ||
              (ch.countryCode?.toLowerCase().includes(normalizedQuery) ?? false) ||
              ch.categories.some((c) => c.toLowerCase().includes(normalizedQuery)),
          )
        : p.channels;
      map.set(p.id, filtered);
    }
    return map;
  }, [playlists, expandedId, normalizedQuery]);

  return (
    <section className="mx-auto max-w-5xl space-y-6" aria-label="Bibliothèque importée">
      <header className="space-y-2">
        <p className="md-kicker">Contenu local</p>
        <h1 className="type-title">Bibliothèque</h1>
        <p className="text-muted max-w-2xl text-sm leading-6">
          Importez et parcourez vos playlists M3U personnelles. Tout reste dans votre navigateur —
          aucun fichier n’est envoyé au serveur.
        </p>
      </header>

      <div className="premium-surface relative overflow-hidden border-dashed p-7 text-center sm:p-10">
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-3xl"
          aria-hidden
        />
        <input
          ref={fileRef}
          type="file"
          accept=".m3u,.m3u8,audio/x-mpegurl,application/x-mpegurl"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <div className="relative flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void importLocalPlaylist()}
            disabled={loading || localLoading}
            className="premium-button-primary gap-2 px-6 text-sm"
          >
            {localLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Importer les listes locales (.txt)
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading || localLoading}
            className="premium-button-secondary gap-2 px-5 text-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Importer un fichier .m3u
          </button>
          <button
            type="button"
            onClick={() => setPasteOpen((prev) => !prev)}
            disabled={loading || localLoading}
            className="premium-button-secondary gap-2 px-5 text-sm"
            aria-expanded={pasteOpen}
          >
            <ClipboardPaste className="h-4 w-4" aria-hidden />
            Coller un M3U
          </button>
        </div>
        <p className="text-muted relative mt-3 text-xs">
          Taille maximum : {(APP_CONFIG.maxPlaylistBytes / 1024 / 1024).toFixed(0)} Mo
        </p>

        {pasteOpen && (
          <div className="relative mt-6 space-y-3 border-t border-[var(--border)] pt-6 text-left">
            <label className="block space-y-1.5 text-xs">
              <span className="text-muted font-medium">Nom de la playlist</span>
              <input
                type="text"
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm"
                placeholder="Ma playlist M3U"
              />
            </label>
            <label className="block space-y-1.5 text-xs">
              <span className="text-muted font-medium">Contenu #EXTM3U</span>
              <textarea
                rows={5}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5 font-mono text-xs"
                placeholder={"#EXTM3U\n#EXTINF:-1 tvg-country=\"DE\",Ma chaîne\nhttps://example.com/live.m3u8"}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="premium-button-secondary px-4 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handlePasteImport()}
                disabled={loading}
                className="premium-button-primary px-5 text-xs"
              >
                Enregistrer la playlist
              </button>
            </div>
          </div>
        )}
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

      {/* ── Section TBCPL : sources recommandées ── */}
      <section className="space-y-3" aria-label="Sources TBCPL">
        <button
          type="button"
          onClick={() => {
            setTbcplOpen((prev) => !prev);
            if (!tbcplOpen) void loadTbcplCatalog();
          }}
          className="premium-surface flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold transition-all hover:border-[var(--border-strong)]"
        >
          <span className="flex items-center gap-3">
            <span className="bg-surface-elevated text-accent flex h-9 w-9 items-center justify-center rounded-xl">
              <Tv className="h-4 w-4" aria-hidden />
            </span>
            <span>Sources TBCPL — The Best Couch Potato List</span>
          </span>
          {tbcplOpen ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>

        {tbcplOpen && (
          <div className="premium-surface space-y-4 p-5">
            {/* Filtres par catégorie */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(TBCPL_CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTbcplFilter(key)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    tbcplFilter === key
                      ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "border-[var(--border)] text-muted hover:border-[var(--border-strong)] hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tbcplLoading && (
              <p className="text-muted flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement du catalogue TBCPL…
              </p>
            )}

            {tbcplCatalog && (
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {tbcplCatalog.sites
                  .filter((s: TbcplSite) => s.category === tbcplFilter)
                  .map((site: TbcplSite) => (
                    <li
                      key={site.url}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-3.5 py-3 transition-colors hover:border-[var(--border-strong)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{site.name}</p>
                        <p className="text-muted truncate text-[11px]">
                          {new URL(site.url).hostname}
                        </p>
                      </div>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="premium-button-secondary min-h-9 shrink-0 gap-1.5 px-3 text-xs"
                        aria-label={`Ouvrir ${site.name}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        Ouvrir
                      </a>
                    </li>
                  ))}
              </ul>
            )}

            {!tbcplLoading && tbcplCatalog && tbcplCatalog.sites.filter((s: TbcplSite) => s.category === tbcplFilter).length === 0 && (
              <p className="text-muted text-sm">Aucun site dans cette catégorie.</p>
            )}
          </div>
        )}
      </section>

      {/* ── Section import par pays (iptv-org GitHub) ── */}
      <section className="premium-surface space-y-3.5 p-5" aria-label="Import flux par pays">
        <div className="flex items-center gap-3">
          <span className="bg-surface-elevated text-secondary-accent flex h-9 w-9 items-center justify-center rounded-xl">
            <Globe className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Import flux par pays — iptv-org GitHub</h2>
            <p className="text-muted text-xs leading-5">
              Codes ISO-3166 : <code className="text-[var(--accent)]">fr</code>,{" "}
              <code className="text-[var(--accent)]">cd</code>,{" "}
              <code className="text-[var(--accent)]">cm</code>,{" "}
              <code className="text-[var(--accent)]">us</code>, etc.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={githubCountry}
            onChange={(e) => setGithubCountry(e.target.value.toLowerCase().slice(0, 10))}
            placeholder="Code pays (ex: fr)"
            aria-label="Code pays ISO-3166"
            className="h-11 w-36 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 font-mono text-sm"
            maxLength={10}
          />
          <button
            type="button"
            onClick={() => void importFromGithubCountry()}
            disabled={githubLoading || !githubCountry.trim()}
            className="premium-button-primary gap-2 px-5 text-sm"
          >
            {githubLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Importer les flux
          </button>
        </div>
      </section>

      <div className="space-y-3.5">
        {playlists.length === 0 ? (
          <p className="premium-surface text-muted p-6 text-center text-sm">Aucune playlist importée.</p>
        ) : (
          playlists.map((p) => {
            const isExpanded = expandedId === p.id;
            const visibleChannels = visibleChannelsByPlaylist.get(p.id) ?? [];
            return (
              <article key={p.id} className="premium-surface overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : p.id);
                      setChannelQuery("");
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp className="text-accent h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown className="text-muted h-4 w-4 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-muted text-xs">
                        {p.channelCount} chaîne(s) ·{" "}
                        {new Date(p.importedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(p.id)}
                    className="premium-icon-button h-11 w-11 hover:!border-[var(--danger)]/40 hover:!text-[var(--danger)]"
                    aria-label={`Supprimer ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-3.5 border-t border-[var(--border)] p-4 sm:p-5">
                    <div className="relative">
                      <Search
                        className="text-muted pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
                        aria-hidden
                      />
                      <input
                        type="search"
                        value={channelQuery}
                        onChange={(e) => setChannelQuery(e.target.value)}
                        placeholder="Filtrer les chaînes de cette playlist…"
                        aria-label={`Filtrer ${p.name}`}
                        className="h-11 w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] pr-4 pl-10 text-sm"
                      />
                    </div>
                    {visibleChannels.length === 0 ? (
                      <p className="text-muted py-3 text-xs">
                        Aucune chaîne ne correspond à « {channelQuery} ».
                      </p>
                    ) : (
                      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleChannels.slice(0, 60).map((ch) => (
                          <li
                            key={ch.id}
                            className="flex items-center justify-between gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-3.5 py-3 transition-colors hover:border-[var(--border-strong)]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{ch.name}</p>
                              <p className="text-muted truncate text-[11px]">
                                {[ch.countryCode, ch.categories[0], ch.streams[0]?.kind.toUpperCase()]
                                  .filter(Boolean)
                                  .join(" · ") || "Flux local"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => watch(ch.id)}
                              className="premium-button-secondary min-h-9 shrink-0 gap-1.5 px-3 text-xs"
                              aria-label={`Regarder ${ch.name}`}
                            >
                              <Play className="h-3.5 w-3.5" aria-hidden />
                              Regarder
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {visibleChannels.length > 60 && (
                      <p className="text-muted text-xs">
                        Affichage limité aux 60 premières chaînes ({visibleChannels.length} au total)
                        — affinez avec la recherche.
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
