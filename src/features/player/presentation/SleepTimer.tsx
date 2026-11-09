"use client";

import { useEffect, useState } from "react";
import { Moon, X } from "lucide-react";
import { useAppStore } from "@/lib/utils/app-store";
import { SLEEP_DURATIONS, useSleepTimer } from "../application/sleep-timer";

export function SleepTimerControl() {
  const deadline = useSleepTimer((state) => state.deadline);
  const minutes = useSleepTimer((state) => state.minutes);
  const start = useSleepTimer((state) => state.start);
  const cancel = useSleepTimer((state) => state.cancel);
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () =>
      setRemaining(deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 60_000)) : null);
    tick();
    if (!deadline) return;
    const interval = window.setInterval(tick, 15_000);
    return () => window.clearInterval(interval);
  }, [deadline]);
  return (
    <div className="md-sleep-control">
      <label>
        <Moon size={16} aria-hidden />
        <span>Arrêt automatique</span>
        <select
          aria-label="Arrêt automatique"
          value={minutes}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (value) start(value);
            else cancel();
          }}
        >
          <option value={0}>Désactivé</option>
          {SLEEP_DURATIONS.map((duration) => (
            <option key={duration} value={duration}>
              Dans {duration} min
            </option>
          ))}
        </select>
      </label>
      <span className="text-muted text-xs">
        {deadline
          ? `Fin de lecture dans ${remaining ?? minutes} min · actif aussi en mini-lecteur.`
          : "Le lecteur se fermera à la fin du délai, même en mini-lecteur."}
      </span>
    </div>
  );
}

/** Mounted once in the shell so a source switch or navigation cannot reset the deadline. */
export function SleepTimerLifecycle() {
  const deadline = useSleepTimer((state) => state.deadline);
  const finished = useSleepTimer((state) => state.finished);
  const dismiss = useSleepTimer((state) => state.dismiss);
  const activeChannel = useAppStore((state) => state.activePlayerChannelId);
  const closePlayer = useAppStore((state) => state.closePlayer);
  useEffect(() => {
    if (!activeChannel) {
      useSleepTimer.getState().cancel();
      return;
    }
    if (!deadline) return;
    const check = () => {
      if (useSleepTimer.getState().expire()) closePlayer();
    };
    check();
    const timer = window.setTimeout(check, Math.max(0, deadline - Date.now()));
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [activeChannel, closePlayer, deadline]);
  if (!finished) return null;
  return (
    <div className="md-sleep-notice" role="status">
      <Moon size={18} aria-hidden />
      <span>La minuterie a fermé le lecteur. À bientôt sur MJTV.</span>
      <button type="button" onClick={dismiss} aria-label="Fermer le message de minuterie">
        <X size={18} />
      </button>
    </div>
  );
}
