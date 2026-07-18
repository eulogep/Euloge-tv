// Generate simple PNG icons for MJTV PWA using sharp.
// Run: npm exec tsx scripts/generate-icons.ts
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ICONS_DIR = path.join(process.cwd(), "public", "icons");

const SVG = (size: number, maskable = false) => {
  const padding = maskable ? size * 0.2 : size * 0.1;
  const inner = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.18}" fill="#0a0a0f"/>
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${inner * 0.12}" fill="none" stroke="#7c3aed" stroke-width="${size * 0.02}"/>
  <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" font-size="${inner * 0.42}" font-weight="800" fill="#7c3aed" text-anchor="middle" dominant-baseline="central" letter-spacing="${inner * -0.02}">MJTV</text>
</svg>`;
};

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });
  await sharp(Buffer.from(SVG(192)))
    .png()
    .toFile(path.join(ICONS_DIR, "icon-192.png"));
  await sharp(Buffer.from(SVG(512)))
    .png()
    .toFile(path.join(ICONS_DIR, "icon-512.png"));
  await sharp(Buffer.from(SVG(512, true)))
    .png()
    .toFile(path.join(ICONS_DIR, "icon-maskable.png"));
  console.log("Generated: icon-192.png, icon-512.png, icon-maskable.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
