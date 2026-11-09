"use client";

import { useState } from "react";
import { ArrowUpRight, Bookmark, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAppStore, type ExplorerFilters } from "@/lib/utils/app-store";
import { categoryLabelFr } from "@/features/catalog/application/taxonomy";
import {
  countryDisplayName,
  languageDisplayName,
} from "@/features/catalog/presentation/display-names";
import { useJourneys } from "../application/use-journeys";
import { journeyFingerprint, type Journey } from "../domain/journey";
import styles from "./journeys.module.css";

export function describeJourney(filters: ExplorerFilters): string {
  return (
    [
      filters.country && countryDisplayName(filters.country, filters.country),
      filters.category && categoryLabelFr(filters.category),
      filters.language && languageDisplayName(filters.language, filters.language),
      filters.q && `« ${filters.q} »`,
    ]
      .filter(Boolean)
      .join(" · ") || "Toutes les chaînes"
  );
}

export function SaveJourney({ filters }: { filters: ExplorerFilters }) {
  const { items, ready, error, save } = useJourneys();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const existing = items.find(
    (item) => journeyFingerprint(item.filters) === journeyFingerprint(filters),
  );
  return (
    <div className={styles.save}>
      <button
        type="button"
        className="premium-button-secondary gap-2 px-4 text-sm"
        disabled={!ready}
        aria-expanded={editing}
        onClick={() => {
          setName(existing?.name ?? describeJourney(filters).slice(0, 48));
          setEditing(!editing);
          setSaved(false);
        }}
      >
        <Bookmark size={16} aria-hidden /> {existing ? "Escale enregistrée" : "Garder cette escale"}
      </button>
      {editing && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            if (save(name, filters)) {
              setEditing(false);
              setSaved(true);
            }
          }}
        >
          <label>
            Nom de l’escale
            <input
              autoFocus
              value={name}
              maxLength={48}
              required
              onChange={(event) => setName(event.target.value)}
              placeholder="Mes chaînes du Sénégal"
            />
          </label>
          <button type="submit" className="premium-button-primary gap-2 px-4">
            <Check size={16} aria-hidden /> Enregistrer
          </button>
          <button
            type="button"
            className="premium-button-secondary px-3"
            onClick={() => setEditing(false)}
          >
            Annuler
          </button>
          <p>Vos filtres seront conservés dans votre carnet, sur cet appareil.</p>
        </form>
      )}
      {saved && (
        <p role="status" className={styles.message}>
          Escale enregistrée dans votre carnet.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.message}>
          {error}
        </p>
      )}
    </div>
  );
}

export function JourneyNotebook() {
  const { items, ready, error, rename, remove } = useJourneys();
  const openExplorer = useAppStore((state) => state.openExplorer);
  const [notice, setNotice] = useState("");
  return (
    <section className={styles.notebook} aria-label="Carnet d’escales">
      <header className={styles.heading}>
        <div>
          <p className="md-kicker">
            <Bookmark size={14} aria-hidden /> VOTRE CARNET /{" "}
            {String(items.length).padStart(2, "0")}
          </p>
          <h2>
            Les chemins <em>que vous aimez.</em>
          </h2>
        </div>
        <p>
          Vos recherches, à retrouver.
          <br />
          Enregistrées sur cet appareil.
        </p>
      </header>
      <div className={styles.grid}>
        {items.map((item) => (
          <JourneyCard
            key={item.id}
            item={item}
            onOpen={() => openExplorer(item.filters)}
            onRename={(name) => rename(item.id, name)}
            onRemove={() => {
              if (remove(item.id)) setNotice(`L’escale « ${item.name} » a été retirée.`);
            }}
          />
        ))}
        <button type="button" className={styles.newCard} onClick={() => openExplorer()}>
          <Plus size={25} aria-hidden />
          <strong>{items.length ? "Une nouvelle escale" : "Votre première escale"}</strong>
          <span>Explorez, choisissez vos filtres, puis gardez votre sélection.</span>
          <span className={styles.cardLink}>
            Ouvrir le catalogue <ArrowUpRight size={15} aria-hidden />
          </span>
        </button>
      </div>
      {!ready && <p role="status">Ouverture du carnet…</p>}
      {error && (
        <p role="alert" className={styles.message}>
          {error}
        </p>
      )}
      <p role="status" className={notice ? styles.message : "sr-only"}>
        {notice}
      </p>
    </section>
  );
}

function JourneyCard({
  item,
  onOpen,
  onRename,
  onRemove,
}: {
  item: Journey;
  onOpen: () => void;
  onRename: (name: string) => boolean;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  return (
    <article className={styles.card} aria-label={`Escale ${item.name}`}>
      <div className={styles.cardTop}>
        <span>{item.filters.country ?? "MONDE"}</span>
        <Bookmark size={15} aria-hidden />
      </div>
      {editing ? (
        <form
          className={styles.rename}
          onSubmit={(event) => {
            event.preventDefault();
            if (onRename(name)) setEditing(false);
          }}
        >
          <label className="sr-only" htmlFor={`rename-${item.id}`}>
            Nouveau nom
          </label>
          <input
            id={`rename-${item.id}`}
            autoFocus
            maxLength={48}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" aria-label="Confirmer le nom">
            <Check size={17} />
          </button>
          <button type="button" aria-label="Annuler le renommage" onClick={() => setEditing(false)}>
            <X size={17} />
          </button>
        </form>
      ) : (
        <button type="button" className={styles.open} onClick={onOpen}>
          <h3>{item.name}</h3>
          <span>{describeJourney(item.filters)}</span>
          <span className={styles.cardLink}>
            Retrouver cette escale <ArrowUpRight size={15} aria-hidden />
          </span>
        </button>
      )}
      <div className={styles.cardActions}>
        <button
          type="button"
          onClick={() => {
            setName(item.name);
            setEditing(true);
          }}
          aria-label={`Renommer ${item.name}`}
        >
          <Pencil size={14} aria-hidden /> Renommer
        </button>
        <button type="button" onClick={onRemove} aria-label={`Retirer ${item.name}`}>
          <Trash2 size={14} aria-hidden /> Retirer
        </button>
      </div>
    </article>
  );
}
