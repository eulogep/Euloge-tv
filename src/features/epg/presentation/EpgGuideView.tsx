"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useAppStore } from "@/lib/utils/app-store";
import { useCatalog } from "@/features/catalog/presentation/use-catalog";
import { calculateProgramProgress } from "../application/programs";
import type { ChannelSummary } from "@/features/catalog/domain/types";

export const formatEpgTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(value));

export function EpgGuideView() {
  const goBack = useAppStore((state) => state.goBack);
  const requestedId = useAppStore((state) =>
    state.view.view === "epg" ? state.view.channelId : undefined,
  );
  const { items, loading } = useCatalog({ limit: 100, sort: "quality" });
  const [selectedId, setSelectedId] = useState(requestedId ?? "");
  useEffect(() => {
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [items, selectedId]);
  const selected = useMemo(
    () => items.find((channel) => channel.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  return (
    <section className="mx-auto max-w-3xl space-y-5" aria-labelledby="epg-title">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="premium-icon-button bg-card h-11 w-11"
          aria-label="Retour"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 id="epg-title" className="type-title">
          Guide TV
        </h1>
      </header>
      <div
        className="scroll-area -mx-[var(--space-page-x)] flex gap-2 overflow-x-auto px-[var(--space-page-x)] pb-2"
        aria-label="Chaînes du guide"
      >
        {items.slice(0, 24).map((channel) => (
          <button
            key={channel.id}
            type="button"
            onClick={() => setSelectedId(channel.id)}
            aria-pressed={selected?.id === channel.id}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
          >
            <span
              className={`bg-card flex h-13 w-13 items-center justify-center rounded-[var(--shape-lg)] border text-xs font-black ${selected?.id === channel.id ? "border-[var(--accent-bright)]" : "border-[var(--border)]"}`}
            >
              {channel.name.slice(0, 3).toUpperCase()}
            </span>
            <span className="text-subtle w-full truncate text-[10px]">{channel.name}</span>
          </button>
        ))}
      </div>
      {loading ? (
        <div className="bg-card h-40 animate-pulse rounded-[var(--shape-lg)]" />
      ) : selected ? (
        <Schedule channel={selected} />
      ) : (
        <EpgEmpty />
      )}
    </section>
  );
}

function Schedule({ channel }: { channel: ChannelSummary }) {
  const epg = channel.epg;
  const current = epg?.currentProgram;
  if (!epg || !["available", "stale"].includes(epg.status)) return <EpgEmpty />;
  const progress = current
    ? calculateProgramProgress(current.startAt, current.endAt, new Date())
    : null;
  return (
    <div className="space-y-6">
      {current && progress !== null && (
        <EpgSection title="En ce moment">
          <article className="border-border bg-card rounded-[var(--shape-lg)] border p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="live-badge">DIRECT</span>
              <span className="text-subtle text-xs">
                {formatEpgTime(current.startAt)}–{formatEpgTime(current.endAt)}
              </span>
            </div>
            <h2 className="font-bold">{current.title}</h2>
            <div className="program-progress mt-3">
              <span style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
            {epg.status === "stale" && (
              <p className="text-warning mt-2 text-[11px]">Guide à actualiser</p>
            )}
          </article>
        </EpgSection>
      )}
      {epg.nextProgram && (
        <EpgSection title="À suivre">
          <ProgramRow program={epg.nextProgram} />
        </EpgSection>
      )}
      <EpgSection title="Plus tard aujourd’hui">
        {epg.laterPrograms?.length ? (
          <div className="divide-border divide-y">
            {epg.laterPrograms.map((program) => (
              <ProgramRow key={`${program.startAt}-${program.title}`} program={program} />
            ))}
          </div>
        ) : (
          <p className="text-subtle text-sm">Aucun autre programme renseigné.</p>
        )}
      </EpgSection>
    </div>
  );
}

function ProgramRow({ program }: { program: { startAt: string; title: string } }) {
  return (
    <div className="flex min-h-12 items-center gap-3 py-2">
      <time className="text-subtle w-12 shrink-0 text-xs font-bold">
        {formatEpgTime(program.startAt)}
      </time>
      <span className="text-sm font-semibold">{program.title}</span>
    </div>
  );
}
function EpgSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="type-eyebrow text-subtle mb-3">{title}</h2>
      {children}
    </section>
  );
}
function EpgEmpty() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center text-center">
      <CalendarDays className="text-subtle mb-3 h-8 w-8" />
      <h2 className="font-bold">Guide indisponible</h2>
      <p className="text-subtle mt-1 max-w-xs text-sm">
        Aucun programme n’est renseigné pour cette chaîne. La lecture reste disponible.
      </p>
    </div>
  );
}
