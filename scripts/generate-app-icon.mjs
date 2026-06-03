#!/usr/bin/env node
/**
 * LoginScreen logoCircle ile birebir oran:
 * - 64×64 kutu, borderRadius 20, Ionicons "calendar" size 32 (kutunun %50'si)
 * Ana ekran ikonu: tam mavi zemin (köşede siyah/şeffaf yok) + aynı takvim glifi.
 */
import opentype from "opentype.js";
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "assets");
const publicDir = join(root, "public");

const PRIMARY = "#3d8bfd";
const CALENDAR_IN_BOX = 32 / 64;
const IONICONS_CALENDAR = 61903;

const ionFont = opentype.parse(
  readFileSync(
    join(root, "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
  ),
);
const calendarGlyph = ionFont.charToGlyph(String.fromCodePoint(IONICONS_CALENDAR));

function calendarPathSvg(iconPx) {
  const path = calendarGlyph.getPath(0, 0, iconPx);
  const bb = path.getBoundingBox();
  const tx = -bb.x1 + (iconPx - (bb.x2 - bb.x1)) / 2;
  const ty = -bb.y1 + (iconPx - (bb.y2 - bb.y1)) / 2;
  return { pathD: path.toPathData(2), tx, ty, bbW: bb.x2 - bb.x1, bbH: bb.y2 - bb.y1 };
}

function loginLogoSvg(size, { maskable = false } = {}) {
  /**
   * Login'deki mavi kare ekranda ~%72 alan kaplar; ana ekranda tam mavi zemin kullanıyoruz
   * (iOS/Android kendi yuvarlatmasını uygular — köşede siyah kalmaz).
   * Takvim boyutu: login'deki gibi kutunun tam %50'si.
   */
  const usable = maskable ? size * 0.66 : size;
  const offset = (size - usable) / 2;
  const iconPx = usable * CALENDAR_IN_BOX;
  const { pathD, tx, ty } = calendarPathSvg(iconPx);
  const cx = offset + (usable - iconPx) / 2;
  const cy = offset + (usable - iconPx) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PRIMARY}"/>
  <path d="${pathD}" fill="#ffffff" transform="translate(${(cx + tx).toFixed(2)} ${(cy + ty).toFixed(2)})"/>
</svg>`;
}

async function writePng(svg, outPath, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
}

async function main() {
  mkdirSync(assetsDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });

  const jobs = [
    { file: "icon.png", size: 1024, dir: assetsDir, maskable: false },
    { file: "adaptive-icon.png", size: 1024, dir: assetsDir, maskable: true },
    { file: "splash-icon.png", size: 512, dir: assetsDir, maskable: false },
    { file: "favicon.png", size: 192, dir: assetsDir, maskable: false },
    { file: "apple-touch-icon.png", size: 180, dir: publicDir, maskable: false },
    { file: "logo192.png", size: 192, dir: publicDir, maskable: false },
    { file: "logo512.png", size: 512, dir: publicDir, maskable: false },
    { file: "icon-maskable-512.png", size: 512, dir: publicDir, maskable: true },
  ];

  for (const job of jobs) {
    await writePng(loginLogoSvg(job.size, { maskable: job.maskable }), join(job.dir, job.file), job.size);
  }

  console.log("[app-icon] Login Ionicons calendar ikonları üretildi.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
