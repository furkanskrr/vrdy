#!/usr/bin/env node
/** PWA ikonlarını assets/icon.png kaynağından public/ altına kopyalar. */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets", "icon.png");
const publicDir = join(root, "public");

if (!existsSync(src)) {
  console.warn("[pwa-icons] assets/icon.png yok, atlanıyor.");
  process.exit(0);
}

mkdirSync(publicDir, { recursive: true });
for (const name of [
  "apple-touch-icon.png",
  "logo192.png",
  "logo512.png",
  "icon-maskable-512.png",
]) {
  copyFileSync(src, join(publicDir, name));
}
console.log("[pwa-icons] public ikonları güncellendi.");
