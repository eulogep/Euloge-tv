"use client";

import { Search } from "lucide-react";
import { MjtvLogo } from "@/components/branding/MjtvLogo";
import { useAppStore } from "@/lib/utils/app-store";

export function TopBar() {
  const goHome = useAppStore((state) => state.goHome);
  const goSearch = useAppStore((state) => state.goSearch);
  return (
    <header className="sticky top-[var(--safe-top)] z-30 -mx-[var(--space-page-x)] mb-3 flex h-14 items-center justify-between bg-[linear-gradient(to_bottom,var(--background)_70%,transparent)] px-[var(--space-page-x)]">
      <button
        type="button"
        onClick={goHome}
        className="flex min-h-11 min-w-11 items-center"
        aria-label="Accueil MJTV"
      >
        <MjtvLogo variant="mark" className="h-10 w-10 object-contain sm:hidden" priority />
        <MjtvLogo
          variant="horizontal"
          className="hidden h-9 w-auto max-w-28 object-contain sm:block"
          priority
        />
      </button>
      <button
        type="button"
        onClick={goSearch}
        className="premium-icon-button bg-card h-11 w-11"
        aria-label="Rechercher"
      >
        <Search className="h-4.5 w-4.5" aria-hidden />
      </button>
    </header>
  );
}
