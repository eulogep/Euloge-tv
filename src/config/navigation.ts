import { Clapperboard, Compass, Home, Radio, Star, UserRound, type LucideIcon } from "lucide-react";

export type NavView = "home" | "explore" | "live" | "streaming" | "my-list" | "profile";

export type NavItem = {
  view: NavView;
  label: string;
  icon: LucideIcon;
};

/** Primary consumer destinations for MJTV. */
export const NAV_ITEMS: readonly NavItem[] = [
  { view: "home", label: "Accueil", icon: Home },
  { view: "explore", label: "Explorer", icon: Compass },
  { view: "live", label: "Live", icon: Radio },
  { view: "streaming", label: "Streaming", icon: Clapperboard },
  { view: "my-list", label: "Ma liste", icon: Star },
  { view: "profile", label: "Profil", icon: UserRound },
] as const;
