"use client";

import { useState } from "react";
import { Download, Flag, Send } from "lucide-react";
import type { ChannelHealthStatus } from "../domain/types";
import {
  createSourceReport,
  exportSourceReportsJson,
  type SourceReportReason,
} from "../application/source-reports";

const reasons: Array<{ value: SourceReportReason; label: string }> = [
  { value: "no_playback", label: "Aucune lecture" },
  { value: "wrong_channel", label: "Mauvaise chaîne" },
  { value: "wrong_logo", label: "Logo incorrect" },
  { value: "wrong_category", label: "Catégorie incorrecte" },
  { value: "wrong_language", label: "Langue incorrecte" },
  { value: "unstable_source", label: "Source instable" },
  { value: "other", label: "Autre" },
];

export const downloadSourceReports = () => {
  let url: string | null = null;
  let anchor: HTMLAnchorElement | null = null;
  try {
    const blob = new Blob([exportSourceReportsJson()], { type: "application/json" });
    url = URL.createObjectURL(blob);
    anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mjtv-source-reports.json";
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor?.remove();
    if (url) {
      const urlToRevoke = url;
      window.setTimeout(() => URL.revokeObjectURL(urlToRevoke), 0);
    }
  }
};

export function SourceReportPanel({
  channelId,
  healthStatus,
}: {
  channelId: string;
  healthStatus: ChannelHealthStatus;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<SourceReportReason>("no_playback");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = () => {
    createSourceReport({ channelId, healthStatus, reason, message });
    setMessage("");
    setSaved(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="premium-button-secondary gap-2 px-4 text-sm"
          aria-expanded={open}
        >
          <Flag className="h-4 w-4" aria-hidden /> Signaler un problème
        </button>
        <button
          type="button"
          onClick={downloadSourceReports}
          className="premium-button-secondary gap-2 px-4 text-sm"
        >
          <Download className="h-4 w-4" aria-hidden /> Exporter les signalements
        </button>
      </div>
      {open && (
        <div className="border-border bg-background/40 grid gap-3 rounded-xl border p-4">
          <label className="grid gap-1 text-sm">
            Motif
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as SourceReportReason)}
              className="border-border bg-card h-11 rounded-lg border px-3"
            >
              {reasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Message optionnel
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              className="border-border bg-card min-h-24 rounded-lg border p-3"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            className="premium-button-primary w-fit gap-2 px-4 text-sm"
          >
            <Send className="h-4 w-4" aria-hidden /> Enregistrer localement
          </button>
          {saved && (
            <p role="status" className="text-success text-sm">
              Signalement enregistré sur cet appareil, sans donnée personnelle.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
