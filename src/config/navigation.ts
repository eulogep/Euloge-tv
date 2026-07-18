import { Home, LayoutGrid, Star, History, Settings, type LucideIcon } from "lucide-react";

export type NavView = "home" | "channels" | "favorites" | "history" | "settings";

export type NavItem = {
  view: NavView;
  label: string;
  icon: LucideIcon;
};

/**
 * Bottom navigation items used by the mobile-first app shell.
 * Order matters — it matches the iOS tab bar convention.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { view: "home", label: "Accueil", icon: Home },
  { view: "channels", label: "Chaînes", icon: LayoutGrid },
  { view: "favorites", label: "Favoris", icon: Star },
  { view: "history", label: "Historique", icon: History },
  { view: "settings", label: "Réglages", icon: Settings },
] as const;
