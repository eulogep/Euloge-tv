"use client";

import { WifiOff } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

export function OfflineScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <WifiOff className="text-muted h-16 w-16" aria-hidden />
      <div>
        <h1 className="text-xl font-semibold">Hors ligne</h1>
        <p className="text-muted mt-2 max-w-md text-sm">
          {APP_CONFIG.name} nécessite une connexion Internet pour récupérer le catalogue des
          chaînes. Les vidéos ne sont jamais mises en cache.
        </p>
      </div>
    </div>
  );
}
