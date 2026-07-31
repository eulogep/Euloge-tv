"use client";

import Image from "next/image";
import { useState } from "react";

const CREATOR_IMAGE_ALT = "Portrait d’Euloge Mabiala, créateur de MJTV";

export function CreatorCredit() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section
      className="premium-surface relative min-w-0 overflow-hidden p-5 sm:p-6"
      aria-labelledby="creator-credit-title"
      data-testid="creator-credit"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgb(214_32_133_/_0.14),transparent_34%),radial-gradient(circle_at_88%_80%,rgb(255_67_67_/_0.1),transparent_32%)]"
        aria-hidden
      />
      <div className="relative flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:gap-5 sm:text-left">
        <div className="border-border bg-surface-elevated relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] sm:h-28 sm:w-28">
          {!imageFailed ? (
            <Image
              src="/images/euloge-mabiala.webp"
              alt={CREATOR_IMAGE_ALT}
              fill
              sizes="(max-width: 639px) 96px, 112px"
              quality={82}
              className="object-cover object-[50%_30%]"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,rgb(214_32_133_/_0.22),rgb(255_67_67_/_0.12))] text-xl font-black tracking-[-0.04em] text-white"
              role="img"
              aria-label={CREATOR_IMAGE_ALT}
              data-testid="creator-image-fallback"
            >
              EM
            </span>
          )}
        </div>
        <div className="max-w-2xl min-w-0">
          <p className="type-eyebrow">Créateur</p>
          <h2 id="creator-credit-title" className="type-section mt-1 text-balance">
            Euloge Mabiala
          </h2>
          <p className="text-muted mt-1 text-sm leading-6">
            Conception, développement et direction du projet MJTV
          </p>
          <p className="text-muted mt-3 text-xs leading-5">
            © 2026 Euloge Mabiala — Tous droits réservés
          </p>
        </div>
      </div>
    </section>
  );
}
