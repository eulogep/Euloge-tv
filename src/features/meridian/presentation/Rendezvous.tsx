"use client";

import { useState } from "react";
import { CalendarPlus, Check, Share2, Users } from "lucide-react";
import { useAppStore } from "@/lib/utils/app-store";
import { useNow } from "../application/use-now";
import {
  formatDelay,
  formatInstant,
  nextOccurrence,
  rendezvousIcs,
  rendezvousPhase,
  rendezvousUrl,
} from "../domain/rendezvous";

/** Shown to whoever opens an invitation, in their own time zone. */
export function RendezvousBanner({ placeLabel, timeZone }: RendezvousPlace) {
  const now = useNow();
  const instant = useAppStore((state) =>
    state.view.view === "watch" ? state.view.rendezvous : undefined,
  );
  if (!instant || !now) return null;
  const phase = rendezvousPhase(instant, now);
  return (
    <p className="md-rendezvous" data-testid="rendezvous" data-phase={phase} role="status">
      <Users size={16} aria-hidden />
      {phase === "upcoming" && (
        <span>
          <strong>Rendez-vous {formatDelay(instant - now)}</strong> : {formatInstant(instant)} chez
          vous
          {timeZone && `, ${formatInstant(instant, timeZone)} à ${placeLabel}`}.
        </span>
      )}
      {phase === "ongoing" && (
        <span>
          <strong>C’est l’heure du rendez-vous.</strong> Chacun regarde de son côté : le direct peut
          avoir quelques secondes d’écart.
        </span>
      )}
      {phase === "past" && <span>Ce rendez-vous est passé. La chaîne reste à l’antenne.</span>}
    </p>
  );
}

type RendezvousPlace = { placeLabel: string; timeZone: string | null };

/** Picks an instant and turns it into a link. Holds nothing once the panel closes. */
export function RendezvousInvite({
  channelId,
  channelName,
  placeLabel,
  timeZone,
}: RendezvousPlace & { channelId: string; channelName: string }) {
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const pick = (value: number) => {
    setInstant(value);
    setCopied(false);
  };

  const url = instant ? rendezvousUrl(window.location.origin, channelId, instant) : "";
  const share = async () => {
    if (!instant) return;
    const text = `Regardons ${channelName} ensemble : ${formatInstant(instant)} chez moi${
      timeZone ? `, ${formatInstant(instant, timeZone)} à ${placeLabel}` : ""
    }.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${channelName} sur MJTV`, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      // Sharing dismissed or clipboard refused: the link stays on screen to copy by hand.
    }
  };

  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Users size={16} aria-hidden /> <span>Inviter</span>
      </button>
      {open && (
        <div className="md-invite" role="group" aria-label="Inviter à regarder ensemble">
          <div className="md-invite-choices">
            {timeZone && (
              <button
                type="button"
                onClick={() => pick(nextOccurrence(new Date(), 20, 0, timeZone))}
              >
                À 20 h à {placeLabel}
              </button>
            )}
            <button type="button" onClick={() => pick(Date.now() + 30 * 60_000)}>
              Dans 30 min
            </button>
            <label>
              <span>À mon heure</span>
              <input
                type="time"
                onChange={(event) => {
                  const [hour, minute] = event.target.value.split(":").map(Number);
                  if (hour === undefined || minute === undefined) return;
                  pick(
                    nextOccurrence(
                      new Date(),
                      hour,
                      minute,
                      Intl.DateTimeFormat().resolvedOptions().timeZone,
                    ),
                  );
                }}
              />
            </label>
          </div>
          {instant && (
            <div className="md-invite-result">
              <p data-testid="invite-summary">
                {formatInstant(instant)} chez vous
                {timeZone && `, ${formatInstant(instant, timeZone)} à ${placeLabel}`}.
              </p>
              <button type="button" onClick={() => void share()}>
                {copied ? <Check size={15} aria-hidden /> : <Share2 size={15} aria-hidden />}
                {copied ? "Invitation copiée" : "Envoyer l’invitation"}
              </button>
              <a
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(
                  rendezvousIcs({ channelId, channelName, instant, url, now: Date.now() }),
                )}`}
                download="rendez-vous-mjtv.ics"
              >
                <CalendarPlus size={15} aria-hidden /> Ajouter à l’agenda
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}
