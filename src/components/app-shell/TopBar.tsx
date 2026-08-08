"use client";

import { Search } from "lucide-react";
import { useAppStore } from "@/lib/utils/app-store";

export function TopBar() {
  const goHome = useAppStore((state) => state.goHome);
  const goSearch = useAppStore((state) => state.goSearch);
  return (
    <header className="sticky top-[var(--safe-top)] z-30 -mx-[var(--space-page-x)] mb-3 flex h-14 items-center justify-between bg-[linear-gradient(to_bottom,var(--background)_70%,transparent)] px-[var(--space-page-x)]">
      <button
        type="button"
        onClick={goHome}
        className="flex min-h-11 items-center gap-2"
        aria-label="Accueil MJTV"
      >
        <span
          className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] shadow-[0_0_16px_var(--accent)]"
          aria-hidden
        />
        <span className="text-[17px] font-extrabold tracking-[-0.03em]">MJTV</span>
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
