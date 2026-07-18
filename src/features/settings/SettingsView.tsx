"use client";

import { useSettings, type ThemeMode } from "@/features/settings/settings";
import { useFavorites } from "@/features/favorites/favorites";
import { useHistory } from "@/features/history/history";
import { APP_CONFIG } from "@/config/app";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RotateCcw, Info } from "lucide-react";

export function SettingsView() {
  const { state, hydrated, update, reset } = useSettings();
  const { clear: clearFavorites } = useFavorites();
  const { clear: clearHistory } = useHistory();

  if (!hydrated) return null;

  return (
    <section className="space-y-6" aria-label="Réglages">
      <h1 className="text-2xl font-bold">Réglages</h1>

      <Group title="Apparence">
        <Row label="Thème">
          <select
            value={state.theme}
            onChange={(e) => update("theme", e.target.value as ThemeMode)}
            className="border-border bg-surface h-10 rounded-lg border px-2 text-sm"
          >
            <option value="dark">Sombre</option>
            <option value="light">Clair</option>
            <option value="system">Système</option>
          </select>
        </Row>
        <ToggleRow
          label="Réduire les animations"
          description="Désactive les transitions et les animations."
          checked={state.reduceAnimations}
          onChange={(v) => update("reduceAnimations", v)}
        />
      </Group>

      <Group title="Lecture">
        <ToggleRow
          label="Reprise automatique"
          description="Reprendre la dernière source utilisée à l'ouverture d'une chaîne."
          checked={state.autoplayLastSource}
          onChange={(v) => update("autoplayLastSource", v)}
        />
        <ToggleRow
          label="Afficher les flux HTTP incompatibles"
          description="Les flux HTTP sont bloqués en HTTPS par mixed-content."
          checked={state.showIncompatibleHttpStreams}
          onChange={(v) => update("showIncompatibleHttpStreams", v)}
        />
      </Group>

      <Group title="Préférences">
        <Row label="Pays préféré">
          <input
            type="text"
            value={state.preferredCountry ?? ""}
            onChange={(e) => update("preferredCountry", e.target.value || null)}
            placeholder="FR"
            className="border-border bg-surface h-10 w-24 rounded-lg border px-2 text-sm"
            maxLength={3}
          />
        </Row>
        <Row label="Langue préférée">
          <input
            type="text"
            value={state.preferredLanguage ?? ""}
            onChange={(e) => update("preferredLanguage", e.target.value || null)}
            placeholder="fra"
            className="border-border bg-surface h-10 w-24 rounded-lg border px-2 text-sm"
            maxLength={5}
          />
        </Row>
      </Group>

      <Group title="Diagnostic">
        <ToggleRow
          label="Mode diagnostic"
          description="Affiche un panneau de diagnostic sur le lecteur."
          checked={state.diagnosticMode}
          onChange={(v) => update("diagnosticMode", v)}
        />
      </Group>

      <Group title="Données locales">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearFavorites}
            className="border-border hover:bg-surface-elevated rounded-full border px-3 py-1.5 text-xs"
          >
            Vider les favoris
          </button>
          <button
            type="button"
            onClick={clearHistory}
            className="border-border hover:bg-surface-elevated rounded-full border px-3 py-1.5 text-xs"
          >
            Vider l'historique
          </button>
          <button
            type="button"
            onClick={reset}
            className="border-border hover:bg-surface-elevated inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
          >
            <RotateCcw className="h-3 w-3" /> Réinitialiser les réglages
          </button>
        </div>
      </Group>

      <Group title="À propos">
        <div className="text-muted space-y-1 text-sm">
          <p>
            {APP_CONFIG.name} — version {APP_CONFIG.version}
          </p>
          <p className="inline-flex items-start gap-1.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              MJTV référence des sources externes. Disponibilité non garantie. Aucune vidéo n'est
              hébergée, téléchargée ou retransmise par le serveur.
            </span>
          </p>
        </div>
      </Group>

      <EmptyState className="hidden" title="" />
    </section>
  );
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-border bg-surface space-y-3 rounded-xl border p-4">
    <h2 className="text-muted text-sm font-semibold tracking-wide uppercase">{title}</h2>
    <div className="space-y-3">{children}</div>
  </div>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm">{label}</span>
    {children}
  </div>
);

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <p className="text-sm">{label}</p>
      {description && <p className="text-muted mt-0.5 text-xs">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[var(--accent)]" : "bg-surface-elevated"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  </div>
);
