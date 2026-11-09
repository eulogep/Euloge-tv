"use client";

import { useMemo, useState } from "react";
import { Check, Laptop, X } from "lucide-react";
import { useFavorites } from "@/features/favorites/favorites";
import { useSettings } from "@/features/settings/settings";
import { useAppStore } from "@/lib/utils/app-store";
import {
  applyTransfer,
  collectTransfer,
  decodeTransfer,
  transferJourneys,
  transferUrl,
} from "./transfer";

const plural = (count: number, word: string): string => `${count} ${word}${count > 1 ? "s" : ""}`;

/** Profile card: makes the link. */
export function TransferCard() {
  const { state: favorites } = useFavorites();
  const { state: settings } = useSettings();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const send = async () => {
    const url = transferUrl(
      window.location.origin,
      collectTransfer({
        favorites: favorites.channelIds,
        country: settings.preferredCountry,
        languages: settings.preferredLanguages,
        categories: settings.favoriteCategories,
      }),
    );
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mes préréglages MJTV", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("failed");
    }
  };

  return (
    <div className="md-transfer-card">
      <Laptop size={18} aria-hidden />
      <div>
        <p className="md-transfer-title">Emporter sur un autre appareil</p>
        <p className="text-muted text-xs leading-5">
          Un lien copie vos favoris, préférences et escales. Il ne passe par aucun serveur, et ne
          synchronise pas les changements suivants.
        </p>
        {status === "copied" && (
          <p className="mt-1 text-xs font-semibold" role="status">
            Lien copié. Ouvrez-le sur l’autre appareil.
          </p>
        )}
        {status === "failed" && (
          <p className="mt-1 text-xs font-semibold" role="status">
            Le lien n’a pas pu être copié sur ce navigateur.
          </p>
        )}
      </div>
      <button
        type="button"
        className="premium-button-secondary shrink-0 px-3 text-xs"
        onClick={() => void send()}
      >
        Créer le lien
      </button>
    </div>
  );
}

/** Shell prompt: nothing is imported until the viewer says so. */
export function TransferPrompt() {
  const pending = useAppStore((state) => state.pendingTransfer);
  const clear = useAppStore((state) => state.clearPendingTransfer);
  const payload = useMemo(() => (pending ? decodeTransfer(pending) : null), [pending]);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="md-sleep-notice" role="status">
        <Check size={18} aria-hidden />
        <span>Vos préréglages sont sur cet appareil.</span>
        <button type="button" onClick={() => setDone(false)} aria-label="Fermer ce message">
          <X size={18} aria-hidden />
        </button>
      </div>
    );
  }
  if (!pending) return null;
  if (!payload) {
    return (
      <div className="md-sleep-notice" role="alert">
        <span>Ce lien de transfert est illisible. Rien n’a été modifié.</span>
        <button type="button" onClick={clear} aria-label="Fermer ce message">
          <X size={18} aria-hidden />
        </button>
      </div>
    );
  }

  const journeys = transferJourneys(payload).length;
  return (
    <section className="md-transfer-prompt" aria-labelledby="md-transfer-prompt-title">
      <h2 id="md-transfer-prompt-title">Importer ces préréglages ?</h2>
      <p>
        {plural(payload.favorites.length, "chaîne")}, {plural(journeys, "escale")} et vos
        préférences de pays et de langue. Ce qui existe déjà ici reste en place.
      </p>
      <div>
        <button
          type="button"
          className="premium-button-primary px-4 text-sm"
          onClick={() => {
            applyTransfer(payload);
            clear();
            setDone(true);
          }}
        >
          Importer
        </button>
        <button type="button" className="premium-button-secondary px-4 text-sm" onClick={clear}>
          Ignorer
        </button>
      </div>
    </section>
  );
}
