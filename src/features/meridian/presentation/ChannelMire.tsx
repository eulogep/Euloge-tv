"use client";

import { useEffect, useState } from "react";
import { initialsOf } from "@/lib/utils";
import type { CatalogCategory } from "@/features/catalog/domain/types";
import { mireStyle } from "../domain/mire";

type Props = {
  channelId: string;
  name: string;
  logoUrl: string | null;
  category?: CatalogCategory;
  className?: string;
  /** Exposes the fallback for assertions, without changing its rendering. */
  fallbackTestId?: string;
  alt?: string;
};

/**
 * A channel's test card with its logo on a paper label. Logos are drawn for every
 * background imaginable, so they all get the same neutral one; a channel without
 * a logo, or whose logo is slow or broken, gets its initials there: never an empty hole.
 */
export function ChannelMire({
  channelId,
  name,
  logoUrl,
  category,
  className,
  fallbackTestId,
  alt,
}: Props) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  useEffect(() => setStatus("loading"), [channelId, logoUrl]);
  const noLogo = !logoUrl || status === "failed";

  return (
    <span className={`md-mire ${className ?? ""}`} style={mireStyle(channelId, category)}>
      <span className="md-mire-label">
        {status !== "loaded" && (
          <span className="md-mire-initials" data-testid={noLogo ? fallbackTestId : undefined}>
            {initialsOf(name)}
          </span>
        )}
        {!noLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={alt ?? `Logo ${name}`}
            loading="lazy"
            data-loaded={status === "loaded"}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("failed")}
          />
        )}
      </span>
    </span>
  );
}
