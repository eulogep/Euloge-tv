import { Compass, Home, Radio, Star, UserRound, type LucideIcon } from "lucide-react";

export type NavView = "home" | "explore" | "live" | "my-list" | "profile";

export type NavItem = {
  view: NavView;
  label: string;
  icon: LucideIcon;
};

/** The five persistent consumer destinations approved for MJTV Mobile V3. */
export const NAV_ITEMS: readonly NavItem[] = [
  { view: "home", label: "Accueil", icon: Home },
  { view: "explore", label: "Explorer", icon: Compass },
  { view: "live", label: "Live", icon: Radio },
  { view: "my-list", label: "Ma liste", icon: Star },
  { view: "profile", label: "Profil", icon: UserRound },
] as const;
