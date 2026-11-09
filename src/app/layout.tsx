import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@fontsource-variable/anybody/wdth.css";
import "@fontsource-variable/instrument-sans/wdth.css";
import "@fontsource-variable/martian-mono";
import "./meridien.css";
import { APP_CONFIG } from "@/config/app";
import { ServiceWorkerRegister } from "@/components/app-shell/ServiceWorkerRegister";
import { ThemeBoot } from "@/components/app-shell/ThemeBoot";

const THEME_PRELOAD = `try{var t=(JSON.parse(localStorage.getItem("mjtv:settings:v1"))||{}).theme||"sun",h=new Date().getHours(),l=t==="sun"?h>=7&&h<19:t==="system"?matchMedia("(prefers-color-scheme: light)").matches:t==="light";document.documentElement.className=l?"light":"dark"}catch(e){}`;

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Il est toujours 20 h quelque part`,
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
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: APP_CONFIG.accentColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className="dark">
      <head>
        {/* Pick the theme before first paint so a daytime visit never flashes dark. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_PRELOAD }} />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ThemeBoot />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
