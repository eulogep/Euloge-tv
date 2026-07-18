import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_CONFIG } from "@/config/app";
import { ServiceWorkerRegister } from "@/components/app-shell/ServiceWorkerRegister";
import { ThemeBoot } from "@/components/app-shell/ThemeBoot";

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Chaînes IPTV publiques`,
  description: APP_CONFIG.description,
  applicationName: APP_CONFIG.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_CONFIG.shortName,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: APP_CONFIG.accentColor,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className="dark">
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ThemeBoot />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
