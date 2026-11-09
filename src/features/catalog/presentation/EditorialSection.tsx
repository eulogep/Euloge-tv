"use client";

import type { CSSProperties } from "react";
import {
  ArrowRight,
  Baby,
  BookOpen,
  Clapperboard,
  Globe2,
  Heart,
  Landmark,
  Layers3,
  Music2,
  Newspaper,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { EditorialSection as EditorialSectionModel } from "../domain/editorial";
import { ChannelRail } from "./ChannelRail";

type VariantStyle = {
  accent: string;
  icon: LucideIcon;
};

const VARIANTS: Record<EditorialSectionModel["visualVariant"], VariantStyle> = {
  news: { accent: "var(--category-news)", icon: Newspaper },
  entertainment: { accent: "var(--category-entertainment)", icon: Clapperboard },
  music: { accent: "var(--category-music)", icon: Music2 },
  sports: { accent: "var(--category-sports)", icon: Trophy },
  kids: { accent: "var(--category-kids)", icon: Baby },
  animation: { accent: "var(--category-animation)", icon: Layers3 },
  anime: { accent: "var(--category-anime)", icon: Sparkles },
  documentaries: { accent: "var(--category-documentaries)", icon: BookOpen },
  culture: { accent: "var(--category-culture)", icon: Landmark },
  religious: { accent: "var(--category-religious)", icon: Heart },
  international: { accent: "var(--category-international)", icon: Globe2 },
  neutral: { accent: "var(--category-neutral)", icon: Sparkles },
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
      className="md-editorial min-w-0"
      style={{ "--section-accent": variant.accent } as CSSProperties}
    >
      <header className="md-editorial-head">
        <span className="md-editorial-icon" aria-hidden>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="md-editorial-title text-balance">
            {section.title}
          </h2>
          <p className="text-muted mt-1 max-w-2xl text-sm leading-5">{section.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => onSeeAll(section)}
          className="premium-button-secondary min-h-11 shrink-0 gap-1 px-3 text-xs sm:px-4 sm:text-sm"
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
