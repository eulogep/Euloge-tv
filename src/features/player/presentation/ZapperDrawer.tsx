"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio, Search, Star, Tv, X } from "lucide-react";
import type { CatalogResponse, ChannelSummary } from "@/features/catalog/domain/types";
import { canFeatureChannel, healthStatusOf } from "@/features/catalog/application/source-health";
import { countryDisplayName } from "@/features/catalog/presentation/display-names";
import { ChannelMire } from "@/features/meridian/presentation/ChannelMire";
import { playlistStore } from "@/features/imported-playlists/infrastructure/playlist-store";
import { toNormalizedChannel } from "@/features/imported-playlists/domain/types";
import { useFavorites } from "@/features/favorites/favorites";
import { cn } from "@/lib/utils";

type ZapperTab = "all" | "favorites" | "local";

type ZapperEntry = {
  id: string;
  name: string;
  countryCode: string | null;
  countryName: string | null;
  countryFlag: string | null;
  logoUrl: string | null;
  primaryCategory: ChannelSummary["primaryCategory"];
  isHealthy: boolean;
  isLocal?: boolean;
};

type Props = {
  open: boolean;
  currentChannelId: string;
  onSelect: (channelId: string) => void;
  onClose: () => void;
};

export function ZapperDrawer({ open, currentChannelId, onSelect, onClose }: Props) {
  const { state: favorites } = useFavorites();
  const [tab, setTab] = useState<ZapperTab>("all");
  const [query, setQuery] = useState("");
  const [catalogItems, setCatalogItems] = useState<ZapperEntry[]>([]);
  const [localItems, setLocalItems] = useState<ZapperEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    void Promise.all([
      fetch("/api/catalog?limit=100&sort=quality")
        .then((r) => (r.ok ? (r.json() as Promise<CatalogResponse>) : null))
        .catch(() => null),
      playlistStore.list().catch(() => []),
    ]).then(([catalog, playlists]) => {
      if (cancelled) return;
      if (catalog) {
        setCatalogItems(
          catalog.items.filter(canFeatureChannel).map((c) => ({
            id: c.id,
            name: c.name,
            countryCode: c.countryCode,
            countryName: c.countryName,
            countryFlag: c.countryFlag,
            logoUrl: c.logoUrl,
            primaryCategory: c.primaryCategory,
            isHealthy: healthStatusOf(c) === "healthy",
          })),
        );
      }
      const locals: ZapperEntry[] = [];
      for (const pl of playlists) {
        for (const ch of pl.channels.slice(0, 80)) {
          const norm = toNormalizedChannel(ch);
          locals.push({
            id: norm.id,
            name: norm.name,
            countryCode: norm.countryCode,
            countryName: norm.countryName,
            countryFlag: norm.countryFlag,
            logoUrl: norm.logoUrl,
            primaryCategory: norm.primaryCategory,
            isHealthy: false,
            isLocal: true,
          });
        }
      }
      setLocalItems(locals);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const favSet = useMemo(() => new Set(favorites.channelIds), [favorites.channelIds]);

  const visible = useMemo(() => {
    const base =
      tab === "local"
        ? localItems
        : tab === "favorites"
          ? [...catalogItems, ...localItems].filter((item) => favSet.has(item.id))
          : catalogItems;
    const q = query.trim().toLowerCase();
    if (!q) return base.slice(0, 60);
    return base
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.countryName?.toLowerCase().includes(q) ?? false) ||
          (item.countryCode?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 60);
  }, [catalogItems, favSet, localItems, query, tab]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex justify-end bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Zapper rapide des chaînes"
      data-testid="zapper-drawer"
      onClick={onClose}
    >
      <aside
        className="border-border bg-[var(--glass-bg)] flex h-full w-full max-w-sm flex-col border-l p-5 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-accent/15 text-accent flex h-9 w-9 items-center justify-center rounded-xl">
              <Tv className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div>
              <p className="md-kicker">Télécommande</p>
              <h2 className="text-base font-bold tracking-tight">Zapper en direct</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="premium-icon-button h-10 w-10"
            aria-label="Fermer le zapper"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="border-border bg-surface mt-4 grid grid-cols-3 rounded-full border p-1">
          {(
            [
              ["all", "Direct"],
              ["favorites", "Favoris"],
              ["local", `Local (${localItems.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={cn(
                "min-h-9 rounded-full text-xs font-bold transition-all",
                tab === id
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="border-border bg-card mt-3 flex h-11 items-center gap-2 rounded-full border px-3.5">
          <Search className="text-muted h-4 w-4 shrink-0" aria-hidden />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer une chaîne…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>

        <ul className="scroll-area mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <li className="text-muted py-10 text-center text-sm">Chargement des chaînes…</li>
          ) : visible.length === 0 ? (
            <li className="text-muted py-10 text-center text-sm">
              {tab === "local"
                ? "Aucune playlist importée. Rendez-vous dans Profil → Bibliothèque."
                : tab === "favorites"
                  ? "Ajoutez des chaînes à vos favoris pour zapper instantanément."
                  : "Aucune chaîne trouvée."}
            </li>
          ) : (
            visible.map((ch) => {
              const isCurrent = ch.id === currentChannelId;
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(ch.id);
                      onClose();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                      isCurrent
                        ? "border-[var(--accent)] bg-[var(--state-selected)]"
                        : "border-border bg-card/75 hover:border-[var(--border-strong)] hover:bg-surface-elevated",
                    )}
                  >
                    <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg">
                      <ChannelMire
                        channelId={ch.id}
                        name={ch.name}
                        logoUrl={ch.logoUrl}
                        category={ch.primaryCategory}
                        className="absolute inset-0"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{ch.name}</span>
                        {favSet.has(ch.id) && (
                          <Star className="h-3 w-3 shrink-0 fill-[var(--sun)] text-[var(--sun)]" />
                        )}
                      </span>
                      <span className="text-muted flex items-center gap-1.5 truncate text-xs">
                        {ch.countryFlag && <span>{ch.countryFlag}</span>}
                        <span className="truncate">
                          {ch.isLocal
                            ? "Bibliothèque locale"
                            : ch.countryCode
                              ? countryDisplayName(ch.countryCode, ch.countryName ?? ch.countryCode)
                              : "International"}
                        </span>
                      </span>
                    </span>
                    {isCurrent ? (
                      <span className="md-eq shrink-0 text-[var(--accent)]" aria-hidden>
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : ch.isHealthy ? (
                      <Radio className="h-3.5 w-3.5 shrink-0 text-[var(--live)]" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>
    </div>
  );
}
