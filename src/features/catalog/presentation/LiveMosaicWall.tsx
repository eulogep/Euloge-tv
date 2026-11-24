"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Grid2x2,
  Columns2,
  Volume2,
  VolumeX,
  Maximize2,
  Shuffle,
  RefreshCw,
  X,
  Search,
  Radio,
  Tv,
  Plus,
} from "lucide-react";
import type { ChannelSummary, NormalizedStream, PublicChannelDetail } from "../domain/types";
import { ChannelMire } from "@/features/meridian/presentation/ChannelMire";
import { resolveOfficialPlaybackStream } from "../infrastructure/rts-live";
import { createHlsAdapter, type HlsAdapter } from "@/features/player/infrastructure/hls-adapter";
import { chooseStrategy } from "@/features/player/application/playback-strategy";
import {
  buildSourceAttemptPlan,
  detectBrowserFamily,
} from "@/features/player/application/source-selection";
import { playlistStore } from "@/features/imported-playlists/infrastructure/playlist-store";
import { toNormalizedChannel, type ImportedChannel } from "@/features/imported-playlists/domain/types";
import { toPublicChannelDetail } from "../application/source-health";
import { countryDisplayName } from "./display-names";
import { cn } from "@/lib/utils";

type MosaicChannelOption = {
  id: string;
  name: string;
  countryCode: string | null;
  countryName: string | null;
  countryFlag: string | null;
  logoUrl: string | null;
  primaryCategory: ChannelSummary["primaryCategory"];
  isImported?: boolean;
  importedRaw?: ImportedChannel;
};

type MosaicTileProps = {
  slotIndex: number;
  channel: MosaicChannelOption | null;
  isAudioActive: boolean;
  onActivateAudio: () => void;
  onOpenPicker: () => void;
  onExpand: (channelId: string) => void;
};

function MosaicTile({
  slotIndex,
  channel,
  isAudioActive,
  onActivateAudio,
  onOpenPicker,
  onExpand,
}: MosaicTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const adapterRef = useRef<HlsAdapter | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">("idle");

  const cleanup = useCallback(() => {
    try {
      adapterRef.current?.destroy();
    } catch {
      // ignore
    }
    adapterRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  useEffect(() => {
    if (!channel) {
      cleanup();
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");

    const startStream = async () => {
      cleanup();
      const video = videoRef.current;
      if (!video) return;

      try {
        let detail: PublicChannelDetail | null = null;
        if (channel.importedRaw) {
          detail = toPublicChannelDetail(toNormalizedChannel(channel.importedRaw));
        } else {
          const res = await fetch(`/api/channels/${encodeURIComponent(channel.id)}`);
          if (!res.ok) throw new Error("fetch");
          detail = (await res.json()) as PublicChannelDetail;
        }
        if (cancelled || !detail || detail.streams.length === 0) {
          if (!cancelled) setStatus("error");
          return;
        }

        const browser = detectBrowserFamily();
        const plan = buildSourceAttemptPlan(detail.streams, browser, {});
        const stream: NormalizedStream | undefined = plan[0];
        if (!stream) {
          if (!cancelled) setStatus("error");
          return;
        }

        const resolved = await resolveOfficialPlaybackStream(stream, detail.id);
        if (cancelled) return;

        const canHls = video.canPlayType("application/vnd.apple.mpegurl");
        const preferNativeHls = browser !== "chromium";
        const strategy = chooseStrategy({
          stream: resolved,
          videoCanPlayHls: canHls,
          hlsJsSupported: canHls === "" || !preferNativeHls,
          preferNativeHls,
        });

        video.muted = !isAudioActive;

        if (
          strategy.kind === "native-hls" ||
          strategy.kind === "native-mp4" ||
          strategy.kind === "native-direct"
        ) {
          video.src = resolved.url;
          video.load();
          await video.play().catch(() => {
            video.muted = true;
            return video.play().catch(() => {});
          });
          return;
        }

        if (strategy.kind === "hls.js") {
          const { default: Hls } = await import("hls.js");
          if (cancelled) return;
          if (Hls.isSupported()) {
            const adapter = createHlsAdapter({
              video,
              stream: resolved,
              initialQuality: -2,
              callbacks: {
                onManifestParsed: () => {
                  if (cancelled) return;
                  void video.play().catch(() => {
                    video.muted = true;
                    void video.play().catch(() => {});
                  });
                },
                onLevelSwitched: () => {},
                onFatalError: () => {
                  if (!cancelled) setStatus("error");
                },
                onRecovered: () => {},
              },
            });
            adapterRef.current = adapter;
            await adapter.start();
          } else if (canHls !== "") {
            video.src = resolved.url;
            video.load();
            void video.play().catch(() => {});
          } else {
            setStatus("error");
          }
          return;
        }

        setStatus("error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void startStream();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [channel?.id, cleanup]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isAudioActive;
    if (isAudioActive && video.paused && status === "playing") {
      void video.play().catch(() => {});
    }
  }, [isAudioActive, status]);

  if (!channel) {
    return (
      <button
        type="button"
        onClick={onOpenPicker}
        className="group border-border bg-card/70 hover:border-[var(--accent)]/50 hover:bg-surface-elevated/70 flex aspect-video flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed p-6 text-center transition-all"
      >
        <span className="bg-surface-elevated text-accent flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110">
          <Plus className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold">Ajouter l’écran {slotIndex + 1}</span>
        <span className="text-muted text-xs">Choisir une chaîne du catalogue ou locale</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group relative aspect-video overflow-hidden rounded-2xl border bg-[#06080f] transition-all duration-300",
        isAudioActive
          ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent),0_20px_50px_-14px_rgba(245,185,66,0.35)]"
          : "border-white/12 hover:border-white/30",
      )}
      data-testid={`mosaic-tile-${slotIndex}`}
      data-audio-active={isAudioActive ? "true" : "false"}
    >
      {/* Studio backdrop underneath video while loading or if stream fails */}
      <ChannelMire
        channelId={channel.id}
        name={channel.name}
        logoUrl={channel.logoUrl}
        category={channel.primaryCategory}
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          status === "playing" ? "opacity-0" : "opacity-100",
        )}
      />

      <video
        ref={videoRef}
        playsInline
        muted={!isAudioActive}
        preload="metadata"
        crossOrigin="anonymous"
        onPlaying={() => setStatus("playing")}
        onError={() => setStatus("error")}
        className={cn(
          "relative z-[1] h-full w-full object-cover transition-opacity duration-500",
          status === "playing" ? "opacity-100" : "opacity-0",
        )}
        aria-label={`Écran ${slotIndex + 1} : ${channel.name}`}
      />

      {/* Clickable surface to switch active audio */}
      <button
        type="button"
        onClick={onActivateAudio}
        className="absolute inset-0 z-[2] cursor-pointer text-left focus-visible:outline-none"
        aria-label={
          isAudioActive
            ? `${channel.name} — son actif`
            : `Activer le son sur ${channel.name}`
        }
      />

      {/* Top HUD bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 via-black/35 to-transparent p-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-mono text-[10px] font-bold tracking-wider uppercase backdrop-blur-md",
              isAudioActive
                ? "bg-[var(--accent)] text-[#090b10]"
                : "border border-white/15 bg-black/65 text-white/90",
            )}
          >
            {isAudioActive ? (
              <>
                <span className="md-eq" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                SON ACTIF
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--live)]" />
                ÉCRAN {slotIndex + 1}
              </>
            )}
          </span>
          {status === "loading" && (
            <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] text-white/75 backdrop-blur-md">
              Syntonisation…
            </span>
          )}
          {status === "error" && (
            <span className="rounded-full bg-rose-500/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
              Signal indisponible
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActivateAudio();
            }}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all",
              isAudioActive
                ? "border-[var(--accent)] bg-[var(--accent)] text-[#090b10]"
                : "border-white/20 bg-black/60 text-white hover:bg-black/85",
            )}
            aria-label={isAudioActive ? `Son actif sur ${channel.name}` : `Écouter ${channel.name}`}
          >
            {isAudioActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPicker();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black/85"
            aria-label={`Changer la chaîne de l’écran ${slotIndex + 1}`}
            title="Changer de chaîne"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand(channel.id);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black/85"
            aria-label={`Ouvrir ${channel.name} en plein écran`}
            title="Ouvrir en grand"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom channel caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3.5 pt-8 pb-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white drop-shadow-sm">{channel.name}</p>
          <p className="truncate text-[11px] text-white/75">
            {channel.countryFlag && <span className="mr-1">{channel.countryFlag}</span>}
            {channel.countryCode
              ? countryDisplayName(channel.countryCode, channel.countryName ?? channel.countryCode)
              : channel.isImported
                ? "Playlist locale"
                : "International"}
          </p>
        </div>
        {status === "playing" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/90 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white uppercase">
            <Radio className="h-2.5 w-2.5" aria-hidden /> LIVE
          </span>
        )}
      </div>
    </div>
  );
}

type Props = {
  channels: readonly ChannelSummary[];
  onExpand: (channelId: string) => void;
  onClose: () => void;
};

export function LiveMosaicWall({ channels, onExpand, onClose }: Props) {
  const [layout, setLayout] = useState<2 | 4>(4);
  const [audioSlot, setAudioSlot] = useState<number>(0);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [importedOptions, setImportedOptions] = useState<MosaicChannelOption[]>([]);

  useEffect(() => {
    let active = true;
    void playlistStore
      .list()
      .then((playlists) => {
        if (!active) return;
        const flat: MosaicChannelOption[] = [];
        for (const p of playlists) {
          for (const ch of p.channels.slice(0, 60)) {
            const norm = toNormalizedChannel(ch);
            flat.push({
              id: norm.id,
              name: norm.name,
              countryCode: norm.countryCode,
              countryName: norm.countryName,
              countryFlag: norm.countryFlag,
              logoUrl: norm.logoUrl,
              primaryCategory: norm.primaryCategory,
              isImported: true,
              importedRaw: ch,
            });
          }
        }
        setImportedOptions(flat);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const allOptions = useMemo<MosaicChannelOption[]>(() => {
    const catalogOpts: MosaicChannelOption[] = channels.map((c) => ({
      id: c.id,
      name: c.name,
      countryCode: c.countryCode,
      countryName: c.countryName,
      countryFlag: c.countryFlag,
      logoUrl: c.logoUrl,
      primaryCategory: c.primaryCategory,
    }));
    return [...catalogOpts, ...importedOptions];
  }, [channels, importedOptions]);

  const [slots, setSlots] = useState<(string | null)[]>(() =>
    [0, 1, 2, 3].map((i) => channels[i]?.id ?? null),
  );

  // Sync initial slots once catalog arrives if still empty
  useEffect(() => {
    if (channels.length === 0) return;
    setSlots((prev) => {
      if (prev.some(Boolean)) return prev;
      return [0, 1, 2, 3].map((i) => channels[i]?.id ?? null);
    });
  }, [channels]);

  const byId = useMemo(() => new Map(allOptions.map((item) => [item.id, item])), [allOptions]);

  const shuffleSlots = () => {
    if (allOptions.length === 0) return;
    const pool = [...allOptions].sort(() => Math.random() - 0.5);
    setSlots([0, 1, 2, 3].map((i) => pool[i]?.id ?? null));
    setAudioSlot(0);
  };

  const filteredPicker = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return allOptions.slice(0, 48);
    return allOptions
      .filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          (ch.countryName?.toLowerCase().includes(q) ?? false) ||
          (ch.countryCode?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 48);
  }, [allOptions, pickerQuery]);

  const visibleCount = layout;

  return (
    <section
      className="space-y-5"
      aria-label="Régie Mosaïque Multi-Écrans"
      data-testid="live-mosaic-wall"
    >
      {/* Control room header bar */}
      <div className="premium-surface flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
            <Tv className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="md-kicker">
              <span className="md-pulse" aria-hidden /> Régie Multi-Écrans
            </p>
            <p className="text-muted text-xs">
              Cliquez sur un écran pour basculer le son en direct · jusqu’à 4 flux simultanés
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="border-border bg-surface inline-flex rounded-full border p-1"
            role="group"
            aria-label="Nombre d’écrans"
          >
            <button
              type="button"
              onClick={() => {
                setLayout(2);
                if (audioSlot >= 2) setAudioSlot(0);
              }}
              aria-pressed={layout === 2}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all",
                layout === 2
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Columns2 className="h-3.5 w-3.5" aria-hidden /> 2 écrans
            </button>
            <button
              type="button"
              onClick={() => setLayout(4)}
              aria-pressed={layout === 4}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all",
                layout === 4
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Grid2x2 className="h-3.5 w-3.5" aria-hidden /> 4 écrans
            </button>
          </div>

          <button
            type="button"
            onClick={shuffleSlots}
            className="premium-button-secondary gap-1.5 px-4 text-xs"
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden /> Mélanger
          </button>

          <button
            type="button"
            onClick={onClose}
            className="premium-button-secondary gap-1.5 px-4 text-xs"
          >
            <X className="h-3.5 w-3.5" aria-hidden /> Vue grille
          </button>
        </div>
      </div>

      {/* Live Multi-Screen Broadcast Wall */}
      <div
        className={cn(
          "grid gap-3.5 sm:gap-4",
          layout === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2",
        )}
      >
        {Array.from({ length: visibleCount }, (_, idx) => {
          const chId = slots[idx];
          const ch = chId ? (byId.get(chId) ?? null) : null;
          return (
            <MosaicTile
              key={idx}
              slotIndex={idx}
              channel={ch}
              isAudioActive={audioSlot === idx}
              onActivateAudio={() => setAudioSlot(idx)}
              onOpenPicker={() => {
                setPickerSlot(idx);
                setPickerQuery("");
              }}
              onExpand={onExpand}
            />
          );
        })}
      </div>

      {/* Channel Picker Modal for a specific screen slot */}
      {pickerSlot !== null && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={`Choisir une chaîne pour l’écran ${pickerSlot + 1}`}
          onClick={() => setPickerSlot(null)}
        >
          <div
            className="premium-surface flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="md-kicker">Écran {pickerSlot + 1}</p>
                <h2 className="type-section mt-0.5">Choisir une chaîne</h2>
              </div>
              <button
                type="button"
                onClick={() => setPickerSlot(null)}
                className="premium-icon-button h-10 w-10"
                aria-label="Fermer le sélecteur"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <label className="border-border bg-surface-elevated mt-4 flex h-11 items-center gap-2.5 rounded-full border px-4">
              <Search className="text-muted h-4 w-4 shrink-0" aria-hidden />
              <input
                autoFocus
                type="search"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Rechercher une chaîne ou un pays…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>

            <ul className="scroll-area mt-4 grid flex-1 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredPicker.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSlots((prev) => {
                        const next = [...prev];
                        next[pickerSlot] = opt.id;
                        return next;
                      });
                      setAudioSlot(pickerSlot);
                      setPickerSlot(null);
                    }}
                    className="border-border bg-surface/70 hover:border-[var(--accent)]/50 hover:bg-surface-elevated flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all"
                  >
                    <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg">
                      <ChannelMire
                        channelId={opt.id}
                        name={opt.name}
                        logoUrl={opt.logoUrl}
                        category={opt.primaryCategory}
                        className="absolute inset-0"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{opt.name}</span>
                      <span className="text-muted block truncate text-xs">
                        {opt.countryFlag ? `${opt.countryFlag} ` : ""}
                        {opt.isImported
                          ? "Bibliothèque locale"
                          : opt.countryCode
                            ? countryDisplayName(opt.countryCode, opt.countryName ?? opt.countryCode)
                            : "Direct"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {filteredPicker.length === 0 && (
                <li className="text-muted col-span-full py-8 text-center text-sm">
                  Aucune chaîne ne correspond à « {pickerQuery} ».
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
