"use client";

import { AppShell } from "@/components/app-shell/AppShell";
import { useAppStore } from "@/lib/utils/app-store";
import { HomeView } from "@/features/catalog/presentation/HomeView";
import { ChannelsView } from "@/features/catalog/presentation/ChannelsView";
import { FavoritesView } from "@/features/favorites/FavoritesView";
import { HistoryView } from "@/features/history/HistoryView";
import { SettingsView } from "@/features/settings/SettingsView";
import { ImportView } from "@/features/imported-playlists/presentation/ImportView";
import { WatchView } from "@/features/player/presentation/WatchView";

export default function Page() {
  const view = useAppStore((s) => s.view);

  return (
    <AppShell>
      {view.view === "home" && <HomeView />}
      {view.view === "channels" && <ChannelsView />}
      {view.view === "favorites" && <FavoritesView />}
      {view.view === "history" && <HistoryView />}
      {view.view === "settings" && <SettingsView />}
      {view.view === "import" && <ImportView />}
      {view.view === "watch" && <WatchView channelId={view.channelId} />}
    </AppShell>
  );
}
