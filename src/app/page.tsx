"use client";

import { AppShell } from "@/components/app-shell/AppShell";
import { useAppStore } from "@/lib/utils/app-store";
import { HomeView } from "@/features/catalog/presentation/HomeView";
import { ChannelsView } from "@/features/catalog/presentation/ChannelsView";
import { SettingsView } from "@/features/settings/SettingsView";
import { ImportView } from "@/features/imported-playlists/presentation/ImportView";
import { WatchView } from "@/features/player/presentation/WatchView";
import { ExploreView } from "@/features/catalog/presentation/ExploreView";
import { LiveView } from "@/features/catalog/presentation/LiveView";
import { SearchView } from "@/features/search/SearchView";
import { MyListView } from "@/features/favorites/MyListView";
import { ProfileView } from "@/features/profile/ProfileView";
import { EpgGuideView } from "@/features/epg/presentation/EpgGuideView";

export default function Page() {
  const view = useAppStore((s) => s.view);
  const activePlayerChannelId = useAppStore((s) => s.activePlayerChannelId);
  const playerMode = useAppStore((s) => s.playerMode);

  return (
    <AppShell>
      <div className={view.view === "watch" ? "hidden" : undefined}>
        {view.view === "home" && <HomeView />}
        {view.view === "explore" && <ExploreView />}
        {view.view === "channels" && <ChannelsView />}
        {view.view === "live" && <LiveView />}
        {view.view === "search" && <SearchView />}
        {view.view === "my-list" && <MyListView />}
        {view.view === "profile" && <ProfileView />}
        {view.view === "epg" && <EpgGuideView />}
        {view.view === "settings" && <SettingsView />}
        {view.view === "import" && <ImportView />}
      </div>
      {activePlayerChannelId && playerMode && (
        <WatchView channelId={activePlayerChannelId} mode={playerMode} />
      )}
    </AppShell>
  );
}
