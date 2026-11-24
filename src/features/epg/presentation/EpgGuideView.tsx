"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
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
    <section className="mx-auto max-w-3xl space-y-6" aria-labelledby="epg-title">
      <header className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={goBack}
          className="premium-icon-button border-border bg-card h-11 w-11 border shadow-[var(--shadow-card)]"
          aria-label="Retour"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <p className="md-kicker">Programmes en direct</p>
          <h1 id="epg-title" className="type-title mt-0.5">
            Guide TV
          </h1>
        </div>
      </header>
      <div
        className="scroll-area -mx-[var(--space-page-x)] flex gap-2.5 overflow-x-auto px-[var(--space-page-x)] py-1 pb-2"
        aria-label="Chaînes du guide"
      >
        {items.slice(0, 24).map((channel) => {
          const isSelected = selected?.id === channel.id;
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => setSelectedId(channel.id)}
              aria-pressed={isSelected}
              className="group flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-xs font-extrabold tracking-tight transition-all ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--state-selected)] text-[var(--accent)] shadow-[var(--shadow-accent)]"
                    : "border-border bg-card text-foreground group-hover:border-[var(--border-strong)] group-hover:bg-[var(--surface-elevated)]"
                }`}
              >
                {channel.name.slice(0, 3).toUpperCase()}
              </span>
              <span
                className={`w-full truncate text-[11px] font-medium ${
                  isSelected ? "text-foreground font-semibold" : "text-muted"
                }`}
              >
                {channel.name}
              </span>
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="bg-card h-44 animate-pulse rounded-2xl" />
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
          <article className="premium-surface relative overflow-hidden p-5">
            <div
              className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-[var(--live)]/15 blur-2xl"
              aria-hidden
            />
            <div className="relative mb-2.5 flex items-center gap-2.5">
              <span className="live-badge">DIRECT</span>
              <span className="text-muted inline-flex items-center gap-1 font-mono text-xs">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {formatEpgTime(current.startAt)}–{formatEpgTime(current.endAt)}
              </span>
            </div>
            <h2 className="relative text-lg font-bold tracking-tight">{current.title}</h2>
            <div className="program-progress relative mt-4">
              <span style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
          </article>
        </EpgSection>
      )}
      {epg.status === "stale" && (
        <p className="text-warning text-xs font-medium">Guide à actualiser</p>
      )}
      {epg.nextProgram && (
        <EpgSection title="À suivre">
          <div className="premium-surface px-4 py-1">
            <ProgramRow program={epg.nextProgram} />
          </div>
        </EpgSection>
      )}
      <EpgSection title="Plus tard aujourd’hui">
        {epg.laterPrograms?.length ? (
          <div className="premium-surface divide-border divide-y px-4">
            {epg.laterPrograms.map((program) => (
              <ProgramRow key={`${program.startAt}-${program.title}`} program={program} />
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">Aucun autre programme renseigné.</p>
        )}
      </EpgSection>
    </div>
  );
}

function ProgramRow({ program }: { program: { startAt: string; title: string } }) {
  return (
    <div className="flex min-h-13 items-center gap-4 py-2.5">
      <time className="text-accent w-12 shrink-0 font-mono text-xs font-semibold">
        {formatEpgTime(program.startAt)}
      </time>
      <span className="text-sm font-semibold">{program.title}</span>
    </div>
  );
}
function EpgSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="md-kicker mb-3">{title}</h2>
      {children}
    </section>
  );
}
function EpgEmpty() {
  return (
    <div className="premium-surface flex min-h-56 flex-col items-center justify-center p-6 text-center">
      <span className="bg-surface-elevated text-muted mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
        <CalendarDays className="h-6 w-6" />
      </span>
      <h2 className="font-bold">Guide indisponible</h2>
      <p className="text-muted mt-1.5 max-w-xs text-sm">
        Aucun programme n’est renseigné pour cette chaîne. La lecture reste disponible.
      </p>
    </div>
  );
}
