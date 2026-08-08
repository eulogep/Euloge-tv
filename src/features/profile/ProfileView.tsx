"use client";

import { ChevronRight, Globe2, Info, Library, Settings } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { useSettings } from "@/features/settings/settings";
import { useAppStore } from "@/lib/utils/app-store";

export function ProfileView() {
  const setView = useAppStore((state) => state.setView);
  const { state, update } = useSettings();
  const french = !state.preferredLanguages.includes("eng");
  return (
    <section className="space-y-5" aria-labelledby="profile-title">
      <h1 id="profile-title" className="type-title">
        Profil
      </h1>
      <div className="space-y-2">
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
  icon: typeof Globe2;
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
