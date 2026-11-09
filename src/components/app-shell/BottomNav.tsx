"use client";

import { NAV_ITEMS, type NavView } from "@/config/navigation";
import { useAppStore } from "@/lib/utils/app-store";

/**
 * Primary navigation. Bottom tab bar on phones and tablets, a strip docked into
 * the top bar on desktop. One DOM tree, CSS-only switch.
 */
export function BottomNav() {
  const view = useAppStore((state) => state.view);
  const navigate = useAppStore((state) => state.navigatePrimary);
  const activeView: NavView | null =
    view.view === "settings" || view.view === "import"
      ? "profile"
      : view.view === "channels"
        ? "explore"
        : ["search", "epg", "watch"].includes(view.view)
          ? null
          : (view.view as NavView);

  return (
    <nav
      aria-label="Navigation principale"
      className="md-nav"
      style={{
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
      data-testid="bottom-navigation"
    >
      <ul className="md-nav-list">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.view;
          return (
            <li key={item.view} className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(item.view)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className="md-nav-item"
              >
                <Icon className="md-nav-icon" strokeWidth={active ? 2.4 : 1.7} aria-hidden />
                <span className="line-clamp-2 text-center break-words" data-nav-label>
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
