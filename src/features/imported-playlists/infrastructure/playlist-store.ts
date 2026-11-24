"use client";

import { get, set, del, keys } from "idb-keyval";
import { uid } from "@/lib/utils";
import type { ImportedChannel, ImportedPlaylist } from "../domain/types";

const PLAYLIST_PREFIX = "mjtv:playlist:";

export const playlistStore = {
  async list(): Promise<ImportedPlaylist[]> {
    const allKeys = await keys();
    const out: ImportedPlaylist[] = [];
    for (const k of allKeys) {
      if (typeof k === "string" && k.startsWith(PLAYLIST_PREFIX)) {
        const v = await get<ImportedPlaylist>(k);
        if (v) out.push(v);
      }
    }
    return out.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  },

  async findChannel(channelId: string): Promise<ImportedChannel | null> {
    const playlists = await this.list();
    for (const playlist of playlists) {
      const match = playlist.channels.find((channel) => channel.id === channelId);
      if (match) return match;
    }
    return null;
  },

  async save(name: string, channels: ImportedPlaylist["channels"]): Promise<ImportedPlaylist> {
    const playlist: ImportedPlaylist = {
      id: uid("pl"),
      name,
      importedAt: new Date().toISOString(),
      schemaVersion: 1,
      channelCount: channels.length,
      channels,
    };
    await set(PLAYLIST_PREFIX + playlist.id, playlist);
    return playlist;
  },

  async remove(id: string): Promise<void> {
    await del(PLAYLIST_PREFIX + id);
  },

  async replace(
    id: string,
    name: string,
    channels: ImportedPlaylist["channels"],
  ): Promise<ImportedPlaylist | null> {
    const existing = await get<ImportedPlaylist>(PLAYLIST_PREFIX + id);
    if (!existing) return null;
    const updated: ImportedPlaylist = {
      ...existing,
      name,
      channels,
      channelCount: channels.length,
      importedAt: new Date().toISOString(),
    };
    await set(PLAYLIST_PREFIX + id, updated);
    return updated;
  },
};
