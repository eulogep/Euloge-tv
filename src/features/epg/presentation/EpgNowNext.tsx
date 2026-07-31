"use client";

import type { PublicEpgSchedule } from "../domain/types";
import { calculateProgramProgress } from "../application/programs";
import { cn } from "@/lib/utils";

type Props = {
  epg?: PublicEpgSchedule;
  compact?: boolean;
};

const formatTime = (value: string): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "–";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function EpgNowNext({ epg, compact = false }: Props) {
  const current = epg?.currentProgram;
  if (!epg || !current || !["available", "stale"].includes(epg.status)) {
    return (
      <p className="text-muted text-xs" data-testid="epg-unavailable">
        Programme non disponible
      </p>
    );
  }

  const progress = calculateProgramProgress(current.startAt, current.endAt, new Date());
  const schedule = `${formatTime(current.startAt)}–${formatTime(current.endAt)}`;

  return (
    <section
      className={cn("min-w-0", compact ? "mt-2 space-y-1.5" : "premium-surface space-y-3 p-4")}
      aria-label="Programme de la chaîne"
      data-testid="epg-now-next"
    >
      <div className="min-w-0">
        <p className={cn("font-semibold", compact ? "line-clamp-2 text-xs" : "text-sm")}>
          <span className="text-accent-bright">En direct :</span> {current.title}
        </p>
        <p className="text-muted mt-0.5 text-xs">{schedule}</p>
      </div>
      <div
        role="progressbar"
        aria-label={`Progression de ${current.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
      >
        <span
          className="bg-accent-bright block h-full rounded-full transition-[width] duration-[var(--duration-base)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      {epg.nextProgram && (
        <p className={cn("text-muted", compact ? "line-clamp-2 text-xs" : "text-sm")}>
          <span className="font-medium text-[var(--foreground)]">À suivre :</span>{" "}
          {epg.nextProgram.title}
        </p>
      )}
      {epg.status === "stale" && (
        <p className="text-muted text-[10px]" data-testid="epg-stale">
          Guide à actualiser
        </p>
      )}
    </section>
  );
}
