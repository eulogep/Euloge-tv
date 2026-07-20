"use client";

import { LayoutList, type LucideIcon } from "lucide-react";
import { NAV_ITEMS, type NavView } from "@/config/navigation";
import { useAppStore } from "@/lib/utils/app-store";
import { cn } from "@/lib/utils";

type View = NavView | "watch" | "import";

type NavButtonProps = {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
};

function NavButton({ icon: Icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-16 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[9px] leading-3 font-semibold tracking-tight transition-[color,background-color,transform] duration-[var(--duration-fast)] min-[390px]:text-[10px] sm:text-[11px]",
        active
          ? "text-accent-bright bg-[var(--state-selected)]"
          : "text-muted hover:text-foreground hover:bg-[var(--state-hover)] active:scale-[0.98]",
      )}
    >
      {active && (
        <span
          className="bg-accent-bright absolute top-1 h-0.5 w-5 rounded-full shadow-[0_0_10px_var(--accent)]"
          aria-hidden
        />
      )}
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

export function BottomNav() {
  const view = useAppStore((state) => state.view);
  const goHome = useAppStore((state) => state.goHome);
  const goChannels = useAppStore((state) => state.goChannels);
  const goFavorites = useAppStore((state) => state.goFavorites);
  const goHistory = useAppStore((state) => state.goHistory);
  const goSettings = useAppStore((state) => state.goSettings);
  const goImport = useAppStore((state) => state.goImport);
  const navigate: Record<NavView, () => void> = {
    home: goHome,
    channels: goChannels,
    favorites: goFavorites,
    history: goHistory,
    settings: goSettings,
  };

  const activeView: View =
    view.view === "watch" || view.view === "import" ? view.view : (view.view as NavView);

  return (
    <nav
      role="navigation"
      aria-label="Navigation principale"
      className="border-border bg-surface/96 supports-[backdrop-filter]:bg-surface/82 fixed inset-x-0 bottom-0 z-[var(--z-navigation)] border-t shadow-[var(--shadow-nav)] backdrop-blur-xl"
      style={{
        paddingBottom: "var(--safe-bottom, env(safe-area-inset-bottom))",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
      data-testid="bottom-navigation"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch gap-0.5 px-1.5 py-1.5">
        {NAV_ITEMS.map((item) => (
          <li key={item.view} className="min-w-0 flex-1">
            <NavButton
              icon={item.icon}
              label={item.label}
              active={activeView === item.view}
              onClick={navigate[item.view]}
            />
          </li>
        ))}
        <li className="min-w-0 flex-1">
          <NavButton
            icon={LayoutList}
            label="Bibliothèque"
            active={activeView === "import"}
            onClick={goImport}
          />
        </li>
      </ul>
    </nav>
  );
}
