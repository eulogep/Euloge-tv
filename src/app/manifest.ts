import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/config/app";

export default function Manifest(): MetadataRoute.Manifest {
  return {
    name: APP_CONFIG.name,
    short_name: APP_CONFIG.shortName,
    description: APP_CONFIG.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: APP_CONFIG.accentColor,
    orientation: "portrait",
    categories: ["entertainment", "video"],
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
