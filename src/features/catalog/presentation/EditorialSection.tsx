"use client";

import type { CSSProperties } from "react";
import {
  ArrowRight,
  Baby,
  BookOpen,
  Clapperboard,
  Globe2,
  Landmark,
  Layers3,
  Music2,
  Newspaper,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { EditorialSection as EditorialSectionModel } from "../domain/editorial";
import { ChannelRail } from "./ChannelRail";

type VariantStyle = {
  accent: string;
  background: string;
  icon: LucideIcon;
};

const VARIANTS: Record<EditorialSectionModel["visualVariant"], VariantStyle> = {
  news: {
    accent: "#38bdf8",
    background: "from-sky-500/10 via-sky-500/[0.025] to-transparent",
    icon: Newspaper,
  },
  entertainment: {
    accent: "#c084fc",
    background: "from-fuchsia-500/10 via-fuchsia-500/[0.025] to-transparent",
    icon: Clapperboard,
  },
  music: {
    accent: "#f472b6",
    background: "from-pink-500/10 via-pink-500/[0.025] to-transparent",
    icon: Music2,
  },
  kids: {
    accent: "#fbbf24",
    background: "from-amber-400/10 via-amber-400/[0.025] to-transparent",
    icon: Baby,
  },
  animation: {
    accent: "#fb7185",
    background: "from-rose-500/10 via-rose-500/[0.025] to-transparent",
    icon: Layers3,
  },
  documentaries: {
    accent: "#34d399",
    background: "from-emerald-500/10 via-emerald-500/[0.025] to-transparent",
    icon: BookOpen,
  },
  culture: {
    accent: "#f59e0b",
    background: "from-orange-500/10 via-orange-500/[0.025] to-transparent",
    icon: Landmark,
  },
  international: {
    accent: "#60a5fa",
    background: "from-blue-500/10 via-blue-500/[0.025] to-transparent",
    icon: Globe2,
  },
  neutral: {
    accent: "#a78bfa",
    background: "from-violet-500/10 via-violet-500/[0.025] to-transparent",
    icon: Sparkles,
  },
};

type Props = {
  section: EditorialSectionModel;
  isInMyList: (channelId: string) => boolean;
  onToggleMyList: (channelId: string) => void;
  onOpen: (channelId: string) => void;
  onSeeAll: (section: EditorialSectionModel) => void;
  reduceAnimations?: boolean;
};

export function EditorialSection({
  section,
  isInMyList,
  onToggleMyList,
  onOpen,
  onSeeAll,
  reduceAnimations,
}: Props) {
  const variant = VARIANTS[section.visualVariant];
  const Icon = variant.icon;
  const headingId = `editorial-heading-${section.id}`;

  return (
    <section
      aria-labelledby={headingId}
      data-editorial-section={section.id}
      data-visual-variant={section.visualVariant}
      className={`border-border relative -mx-2 min-w-0 overflow-hidden rounded-2xl border border-t bg-gradient-to-br px-3 py-5 sm:-mx-3 sm:px-5 sm:py-6 ${variant.background}`}
      style={{ "--section-accent": variant.accent } as CSSProperties}
    >
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[var(--section-accent)]/70 to-transparent"
        aria-hidden
      />
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--section-accent)]/15 text-[var(--section-accent)]">
            <Icon className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="text-lg font-semibold sm:text-xl">
              {section.title}
            </h2>
            <p className="text-muted mt-1 max-w-2xl text-sm">{section.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSeeAll(section)}
          className="text-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium focus-visible:ring-2 sm:text-sm"
          aria-label={`Voir toutes les chaînes de ${section.title}`}
        >
          <span className="hidden sm:inline">Voir tout</span>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </header>
      <ChannelRail
        label={section.title}
        sectionId={section.id}
        items={section.items}
        isInMyList={isInMyList}
        onToggleMyList={onToggleMyList}
        onOpen={onOpen}
        reduceAnimations={reduceAnimations}
      />
    </section>
  );
}
