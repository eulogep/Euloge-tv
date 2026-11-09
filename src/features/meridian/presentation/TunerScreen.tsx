"use client";

import { useEffect, useRef } from "react";
import { channelHealthLabel } from "@/features/catalog/application/source-health";
import type { AtlasStation } from "../domain/atlas";
import { ChannelMire } from "./ChannelMire";
import { useScreenPreview } from "./use-screen-preview";

type Props = {
  station: AtlasStation | null;
  position: { index: number; total: number } | null;
  /** The needle is moving: the set shows snow, as it should between two stations. */
  searching: boolean;
  power: boolean;
  reduceMotion: boolean;
};

/** Real snow, a few frames per second, painted only while something is searching. */
function Snow({ active, frozen }: { active: boolean; frozen: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !active) return;
    canvas.width = 160;
    canvas.height = 90;
    const image = context.createImageData(160, 90);
    let lastPaint = 0;
    let frame = 0;
    const draw = (time: number) => {
      if (time - lastPaint > 45) {
        lastPaint = time;
        for (let offset = 0; offset < image.data.length; offset += 4) {
          const value = Math.random() * 255;
          image.data[offset] = value;
          image.data[offset + 1] = value;
          image.data[offset + 2] = value;
          image.data[offset + 3] = 255;
        }
        context.putImageData(image, 0, 0);
      }
      if (!frozen) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, frozen]);

  return <canvas ref={canvasRef} className="md-snow" data-active={active} aria-hidden />;
}

export function TunerScreen({ station, position, searching, power, reduceMotion }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const preview = useScreenPreview(videoRef, searching ? null : (station?.id ?? null), power);

  return (
    <div className="md-screen" data-testid="tuner-screen" data-preview={preview}>
      {station && (
        <ChannelMire
          channelId={station.id}
          name={station.name}
          logoUrl={station.logoUrl}
          category={station.category}
          className="md-screen-mire"
        />
      )}
      {/* Mounted only once switched on: an unlit screen holds no media element at all. */}
      {power && (
        <video
          ref={videoRef}
          className="md-screen-video"
          data-visible={preview === "playing"}
          muted
          playsInline
          preload="none"
          aria-hidden
          tabIndex={-1}
        />
      )}
      <Snow active={searching || !station} frozen={reduceMotion} />
      <div className="md-osd">
        <span>
          {position
            ? `P ${String(position.index + 1).padStart(2, "0")}/${String(position.total).padStart(2, "0")}`
            : "RECHERCHE"}
        </span>
        {station && !searching && (
          <span data-healthy={station.health === "healthy"}>
            {station.health === "healthy" ? "DIRECT" : channelHealthLabel(station.health)}
          </span>
        )}
      </div>
      {power && !searching && preview === "loading" && (
        <p className="md-screen-note" role="status">
          Réception…
        </p>
      )}
      {power && !searching && preview === "failed" && (
        <p className="md-screen-note" role="status">
          Pas d’aperçu ici. La lecture complète essaiera chaque source.
        </p>
      )}
    </div>
  );
}
