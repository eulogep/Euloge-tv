"use client";

import Link from "next/link";
import Image, { type ImageLoaderProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  readSourceReports,
  type SourceReport,
} from "@/features/catalog/application/source-reports";
import type { AdminChannelFilters, AdminSnapshot } from "../domain/types";
import { filterAdminChannels } from "../application/projections";

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

export type AdminViewKind = "dashboard" | "channels" | "sources" | "epg" | "health" | "reports";

export function AdminRouteView({ kind }: { kind: AdminViewKind }) {
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (kind === "reports") return;
    const controller = new AbortController();
    fetch("/api/admin/snapshot", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("admin_snapshot_unavailable");
        return response.json() as Promise<AdminSnapshot>;
      })
      .then(setSnapshot)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    return () => controller.abort();
  }, [kind]);
  if (kind === "reports") return <AdminReportsView />;
  if (failed)
    return (
      <p className="admin-empty" role="alert">
        Les données administratives sont indisponibles.
      </p>
    );
  if (!snapshot)
    return (
      <p className="admin-empty" role="status">
        Chargement des données administratives…
      </p>
    );
  if (kind === "dashboard") return <AdminDashboardView snapshot={snapshot} />;
  if (kind === "channels") return <AdminChannelsView snapshot={snapshot} />;
  if (kind === "sources") return <AdminSourcesView snapshot={snapshot} />;
  if (kind === "epg") return <AdminEpgView snapshot={snapshot} />;
  return <AdminHealthView snapshot={snapshot} />;
}

const Heading = ({ title, description }: { title: string; description: string }) => (
  <header className="admin-heading">
    <h1>{title}</h1>
    <p>{description}</p>
  </header>
);

const Badge = ({ value }: { value: string }) => (
  <span className="admin-badge" data-state={value}>
    {value}
  </span>
);

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(value),
      )
    : "—";

export function AdminDashboardView({ snapshot }: { snapshot: AdminSnapshot }) {
  const [localReportCount, setLocalReportCount] = useState(0);
  useEffect(() => setLocalReportCount(readSourceReports().length), []);
  const labels: Array<[keyof AdminSnapshot["stats"], string]> = [
    ["totalChannels", "Total channels"],
    ["openableChannels", "Openable"],
    ["featureableChannels", "Featureable"],
    ["recommendableChannels", "Recommendable"],
    ["unavailableChannels", "Unavailable"],
    ["degradedChannels", "Degraded"],
    ["offlineChannels", "Offline"],
    ["archivedChannels", "Archived"],
    ["channelsWithoutUsableSource", "Without usable source"],
    ["epgAvailable", "EPG available"],
    ["epgStale", "EPG stale"],
    ["epgUnavailable", "EPG unavailable"],
    ["countries", "Countries"],
    ["languages", "Languages"],
    ["categories", "Categories"],
  ];
  return (
    <>
      <Heading
        title="Dashboard"
        description={`Projection calculée le ${formatDate(snapshot.generatedAt)}.`}
      />
      <div className="admin-grid" aria-label="Métriques catalogue">
        {labels.map(([key, label]) => (
          <article className="admin-card" key={key}>
            <span className="admin-stat-label">{label}</span>
            <strong className="admin-stat-value">{snapshot.stats[key]}</strong>
          </article>
        ))}
        <article className="admin-card">
          <span className="admin-stat-label">Source reports (cet appareil)</span>
          <strong className="admin-stat-value">{localReportCount}</strong>
        </article>
      </div>
    </>
  );
}

export function AdminChannelsView({ snapshot }: { snapshot: AdminSnapshot }) {
  const [filters, setFilters] = useState<AdminChannelFilters>({ availability: "all" });
  const channels = useMemo(
    () => filterAdminChannels(snapshot.channels, filters),
    [snapshot.channels, filters],
  );
  const update = (key: keyof AdminChannelFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  return (
    <>
      <Heading title="Channels" description={`${channels.length} chaîne(s) dans la vue filtrée.`} />
      <div className="admin-controls" aria-label="Filtres chaînes">
        <input
          className="admin-control"
          type="search"
          placeholder="Nom ou ID"
          aria-label="Rechercher une chaîne"
          onChange={(event) => update("query", event.target.value)}
        />
        <Select
          label="Pays"
          values={snapshot.options.countries}
          onChange={(value) => update("country", value)}
        />
        <Select
          label="Langue"
          values={snapshot.options.languages}
          onChange={(value) => update("language", value)}
        />
        <Select
          label="Catégorie"
          values={snapshot.options.categories}
          onChange={(value) => update("category", value)}
        />
        <Select
          label="Health"
          values={snapshot.options.health}
          onChange={(value) => update("health", value)}
        />
        <Select
          label="EPG"
          values={snapshot.options.epg}
          onChange={(value) => update("epg", value)}
        />
        <Select
          label="Disponibilité"
          values={["openable", "featureable", "recommendable", "unavailable"]}
          onChange={(value) => update("availability", value || "all")}
        />
      </div>
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Table des chaînes">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Chaîne</th>
              <th>Pays</th>
              <th>Langues</th>
              <th>Catégories</th>
              <th>Sources</th>
              <th>Éligibilité</th>
              <th>Health</th>
              <th>EPG</th>
              <th>Archived</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel) => (
              <tr key={channel.id} id={`channel-${channel.id}`}>
                <td>
                  {channel.logoUrl ? (
                    <Image
                      className="admin-logo"
                      src={channel.logoUrl}
                      alt=""
                      width={36}
                      height={36}
                      loader={passthroughImageLoader}
                      unoptimized
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <strong>{channel.name}</strong>
                  <br />
                  <code>{channel.id}</code>
                </td>
                <td>{channel.countryName ?? channel.countryCode ?? "—"}</td>
                <td>{channel.languageCodes.join(", ") || "—"}</td>
                <td>{channel.categories.join(", ") || "—"}</td>
                <td>{channel.sourceCount}</td>
                <td>
                  Open {channel.canOpen ? "oui" : "non"}
                  <br />
                  Feature {channel.canFeature ? "oui" : "non"}
                  <br />
                  Recommend {channel.canRecommend ? "oui" : "non"}
                </td>
                <td>
                  <Badge value={channel.operationalHealth} />
                  <br />
                  <span className="admin-muted">{channel.health}</span>
                </td>
                <td>
                  <Badge value={channel.epgStatus} />
                </td>
                <td>{channel.archived ? "oui" : "non"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const Select = ({
  label,
  values,
  onChange,
}: {
  label: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) => (
  <select
    className="admin-control"
    aria-label={label}
    defaultValue=""
    onChange={(event) => onChange(event.target.value)}
  >
    <option value="">{label}: tous</option>
    {values.map((value) => (
      <option key={value} value={value}>
        {value}
      </option>
    ))}
  </select>
);

export function AdminSourcesView({ snapshot }: { snapshot: AdminSnapshot }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return needle
      ? snapshot.sources.filter((row) =>
          `${row.channelName} ${row.channelId} ${row.displayUrl}`
            .toLocaleLowerCase("fr")
            .includes(needle),
        )
      : snapshot.sources;
  }, [query, snapshot.sources]);
  return (
    <>
      <Heading
        title="Sources"
        description="URLs opérationnelles sans informations d’authentification, query string ni fragment."
      />
      <div className="admin-controls">
        <input
          className="admin-control"
          type="search"
          aria-label="Rechercher une source"
          placeholder="Chaîne, ID ou URL"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Table des sources">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Chaîne</th>
              <th>Type</th>
              <th>Priorité</th>
              <th>Éligible</th>
              <th>Health</th>
              <th>Dernier check</th>
              <th>Dernier succès</th>
              <th>Échec</th>
              <th>URL masquée</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.channelName}
                  <br />
                  <code>{row.channelId}</code>
                </td>
                <td>{row.kind}</td>
                <td>{row.priority}</td>
                <td>{row.eligible ? "oui" : "non"}</td>
                <td>
                  <Badge value={row.operationalHealth} />
                  <br />
                  {row.health}
                </td>
                <td>{formatDate(row.lastCheckedAt)}</td>
                <td>{formatDate(row.lastSuccessAt)}</td>
                <td>{row.failureReason ?? formatDate(row.lastFailureAt)}</td>
                <td>
                  <code className="admin-url">{row.displayUrl}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AdminEpgView({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <>
      <Heading
        title="EPG"
        description="L’indisponibilité EPG reste indépendante de la disponibilité du playback."
      />
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Table EPG">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Chaîne</th>
              <th>Provider</th>
              <th>Mapping</th>
              <th>Status</th>
              <th>Current</th>
              <th>Next</th>
              <th>Later</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.channels.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.name}
                  <br />
                  <code>{row.id}</code>
                </td>
                <td>{row.epgProvider ?? "—"}</td>
                <td>
                  <code>{row.epgMapping ?? "—"}</code>
                </td>
                <td>
                  <Badge value={row.epgStatus} />
                </td>
                <td>{row.currentProgram?.title ?? "—"}</td>
                <td>{row.nextProgram?.title ?? "—"}</td>
                <td>{row.laterPrograms.map((program) => program.title).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AdminHealthView({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <>
      <Heading
        title="Health"
        description="États issus des observations existantes; aucune disponibilité n’est déduite de la seule présence d’une URL."
      />
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Table health">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Chaîne</th>
              <th>État admin</th>
              <th>État catalogue</th>
              <th>Sources</th>
              <th>Openable</th>
              <th>Dernier check</th>
              <th>Dernier succès</th>
              <th>Échecs</th>
              <th>Raison</th>
              <th>EPG (indépendant)</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.channels.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.name}
                  <br />
                  <code>{row.id}</code>
                </td>
                <td>
                  <Badge value={row.operationalHealth} />
                </td>
                <td>{row.health}</td>
                <td>{row.sourceCount}</td>
                <td>{row.canOpen ? "oui" : "non"}</td>
                <td>{formatDate(row.checkedAt)}</td>
                <td>{formatDate(row.lastSuccessAt)}</td>
                <td>{row.failureCount}</td>
                <td>{row.healthReasonCode}</td>
                <td>
                  <Badge value={row.epgStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AdminReportsView() {
  const [reports, setReports] = useState<SourceReport[]>([]);
  const [query, setQuery] = useState("");
  useEffect(() => setReports(readSourceReports()), []);
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return needle
      ? reports.filter((report) =>
          `${report.channelId} ${report.reason} ${report.message ?? ""}`
            .toLocaleLowerCase("fr")
            .includes(needle),
        )
      : reports;
  }, [query, reports]);
  return (
    <>
      <Heading
        title="Reports"
        description="Signalements en lecture seule stockés dans ce navigateur uniquement; aucun registre serveur n’existe en V1."
      />
      <div className="admin-controls">
        <input
          className="admin-control"
          type="search"
          aria-label="Rechercher un signalement"
          placeholder="Chaîne, motif ou message"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {rows.length === 0 ? (
        <p className="admin-empty">Aucun signalement local ne correspond.</p>
      ) : (
        <div
          className="admin-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Table des signalements"
        >
          <table className="admin-table">
            <thead>
              <tr>
                <th>Chaîne</th>
                <th>Motif</th>
                <th>Health</th>
                <th>Date</th>
                <th>Navigateur</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((report) => (
                <tr key={report.id}>
                  <td>
                    <Link
                      className="admin-link"
                      href={`/admin/channels#channel-${encodeURIComponent(report.channelId)}`}
                    >
                      {report.channelId}
                    </Link>
                  </td>
                  <td>{report.reason}</td>
                  <td>{report.healthStatus}</td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td>{report.browserFamily}</td>
                  <td>{report.message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
