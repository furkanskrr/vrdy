import type { ThemeColors } from "../constants/theme";

function isValidHex6(s: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(s.trim());
}

/** #RGB veya #RRGGBB → #RRGGBB */
function normalizeHex(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const h = t.startsWith("#") ? t : `#${t}`;
  if (isValidHex6(h)) return h;
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    const r = h[1]!;
    const g = h[2]!;
    const b = h[3]!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = normalizeHex(hex);
  if (!h) return null;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Birincil rengi kullanıcı seçimine göre değiştirir; primaryMuted koyulaştırılır. */
export function applyCustomAccent(base: ThemeColors, rawHex: string): ThemeColors {
  const hex = normalizeHex(rawHex);
  if (!hex) return base;
  const rgb = hexToRgb(hex);
  if (!rgb) return base;
  const muted = rgbToHex(rgb.r * 0.72, rgb.g * 0.72, rgb.b * 0.72);
  return {
    ...base,
    primary: hex,
    primaryMuted: muted,
  };
}
