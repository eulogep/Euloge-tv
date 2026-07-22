"use client";

import { WifiOff } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

export function OfflineScreen() {
  return (
    <div
      className="premium-surface flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5 py-10 text-center"
      role="status"
      data-system-state="offline"
    >
      <span className="border-border bg-surface-elevated text-muted flex h-16 w-16 items-center justify-center rounded-2xl border">
        <WifiOff className="h-7 w-7" aria-hidden />
      </span>
      <div>
        <h1 className="type-title">Hors ligne</h1>
        <p className="text-muted mt-3 max-w-md text-sm leading-6">
          {APP_CONFIG.name} nécessite une connexion Internet pour récupérer le catalogue des
          chaînes. Les vidéos ne sont jamais mises en cache.
        </p>
      </div>
    </div>
  );
}
