"use client";

import {
  ChevronRight,
  Clock,
  Globe2,
  Info,
  Library,
  Monitor,
  Moon,
  Settings,
  Star,
  Sun,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { MjtvLogo } from "@/components/branding/MjtvLogo";
import { useFavorites } from "@/features/favorites/favorites";
import { useHistory } from "@/features/history/history";
import { useSettings, type ThemeMode } from "@/features/settings/settings";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/utils/app-store";

const THEMES: readonly { value: ThemeMode; label: string; icon: LucideIcon }[] = [
  { value: "sun", label: "Soleil", icon: Sunrise },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "light", label: "Clair", icon: Sun },
  { value: "system", label: "Système", icon: Monitor },
];

export function ProfileView() {
  const setView = useAppStore((state) => state.setView);
  const goFavorites = useAppStore((state) => state.goFavorites);
  const goHistory = useAppStore((state) => state.goHistory);
  const { state, update } = useSettings();
  const { state: favorites } = useFavorites();
  const { state: history } = useHistory();
  const french = !state.preferredLanguages.includes("eng");
  const favoriteCount = favorites.channelIds.length;
  const historyCount = history.entries.length;

  return (
    <section className="mx-auto max-w-3xl space-y-6" aria-labelledby="profile-title">
      <header className="premium-surface relative flex items-center gap-4 overflow-hidden p-5 sm:p-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
          <MjtvLogo variant="mark" className="h-12 w-12" />
        </span>
        <div className="relative min-w-0">
          <h1 id="profile-title" className="type-title">
            Profil
          </h1>
          <p className="text-muted mt-1 text-sm">
            Vos préférences, votre liste et votre historique restent sur cet appareil.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={goFavorites}
          className="stat-tile"
          style={{ "--tile-accent": "var(--accent-bright)" } as React.CSSProperties}
          aria-label={`Favoris : ${favoriteCount}`}
        >
          <Star className="h-5 w-5 text-[var(--foreground)]" aria-hidden />
          <span className="md-stat-value mt-3 block">{favoriteCount}</span>
          <span className="text-muted mt-1 block text-xs font-semibold">
            {favoriteCount === 1 ? "chaîne favorite" : "chaînes favorites"}
          </span>
        </button>
        <button
          type="button"
          onClick={goHistory}
          className="stat-tile"
          style={{ "--tile-accent": "var(--secondary)" } as React.CSSProperties}
          aria-label={`Historique : ${historyCount}`}
        >
          <Clock className="h-5 w-5 text-[var(--foreground)]" aria-hidden />
          <span className="md-stat-value mt-3 block">{historyCount}</span>
          <span className="text-muted mt-1 block text-xs font-semibold">
            {historyCount === 1 ? "chaîne regardée" : "chaînes regardées"}
          </span>
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="md-kicker">Apparence</h2>
        <div
          className="border-border bg-card grid grid-cols-2 gap-1 rounded-lg border p-1 sm:grid-cols-4"
          role="group"
          aria-label="Thème rapide"
        >
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={state.theme === value}
              onClick={() => update("theme", value)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-md text-xs font-bold transition-colors",
                state.theme === value
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="md-kicker">Application</h2>
        <ProfileButton
          icon={Globe2}
          label="Langue"
          value={french ? "FR" : "EN"}
          onClick={() => update("preferredLanguages", french ? ["eng"] : ["fra"])}
        />
        <ProfileButton
          icon={Settings}
          label="Réglages"
          onClick={() => setView({ view: "settings" })}
        />
        <ProfileButton
          icon={Library}
          label="Bibliothèque"
          onClick={() => setView({ view: "import" })}
        />
        <div className="border-border bg-card flex min-h-14 items-center gap-3 rounded-[var(--shape-lg)] border px-4">
          <Info className="text-subtle h-4.5 w-4.5" aria-hidden />
          <span className="flex-1 text-sm font-bold">À propos</span>
          <span className="text-subtle text-xs">
            {APP_CONFIG.name} · {APP_CONFIG.version}
          </span>
        </div>
      </div>
    </section>
  );
}

function ProfileButton({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-card flex min-h-14 w-full items-center gap-3 rounded-[var(--shape-lg)] border px-4 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--state-hover)]"
    >
      <Icon className="text-subtle h-4.5 w-4.5" aria-hidden />
      <span className="flex-1 text-sm font-bold">{label}</span>
      {value && <span className="text-secondary-accent text-xs font-bold">{value}</span>}
      <ChevronRight className="text-subtle h-4 w-4" aria-hidden />
    </button>
  );
}
