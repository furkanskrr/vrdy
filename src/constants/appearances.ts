import type { ThemeColors } from "./theme";
import { darkTheme, lightTheme } from "./theme";

export type AppearanceId = "classic" | "noir" | "aurora" | "dawn" | "studio";

export type AppearanceMeta = {
  id: AppearanceId;
  name: string;
  tagline: string;
  /** Kısa tasarım notu — vitrin kartında */
  curatorNote: string;
  accentPreview: [string, string, string];
};

export const APPEARANCE_CATALOG: AppearanceMeta[] = [
  {
    id: "classic",
    name: "Kurumsal",
    tagline: "Vardiyam? imza paleti",
    curatorNote: "Üretim ortamı için dengeli kontrast; vardiya renkleri birebir korunur.",
    accentPreview: ["#3d8bfd", "#2d9d78", "#8b5cf6"],
  },
  {
    id: "noir",
    name: "Gece sineması",
    tagline: "OLED dostu, amber vurgu",
    curatorNote: "Derin siyah zemin; düşük parlaklıkta göz yormayan sıcak vurgular.",
    accentPreview: ["#f59e0b", "#fbbf24", "#1c1917"],
  },
  {
    id: "aurora",
    name: "Kutup ışığı",
    tagline: "Teal & mor derinlik",
    curatorNote: "Gece vardiyası hissi; soğuk zemin üzerinde net okunabilirlik.",
    accentPreview: ["#2dd4bf", "#a78bfa", "#0f766e"],
  },
  {
    id: "dawn",
    name: "Şafak",
    tagline: "Terrakota & krem",
    curatorNote: "Açık modda kağıt hissi; koyu modda gece mavisi ile çift yüz.",
    accentPreview: ["#c2410c", "#ea580c", "#fef3c7"],
  },
  {
    id: "studio",
    name: "Stüdyo",
    tagline: "Nötr gri, ürün odası",
    curatorNote: "Figma / IDE estetiğine yakın; dikkat dağıtmayan arayüz.",
    accentPreview: ["#6366f1", "#64748b", "#94a3b8"],
  },
];

const noirDark: ThemeColors = {
  bg: "#09090b",
  surface: "#18181b",
  surface2: "#27272a",
  border: "#3f3f46",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  primary: "#f59e0b",
  primaryMuted: "#d97706",
  morning: "#34d399",
  afternoon: "#fbbf24",
  fullday: "#a78bfa",
  off: "#71717a",
  antre: "#fb7185",
  aksam: "#38bdf8",
  envanter: "#fb923c",
  envanterIzni: "#94a3b8",
  envanterFull: "#ea580c",
  resmiTatil: "#f472b6",
  danger: "#f87171",
  tabBar: "#0c0c0e",
};

const noirLight: ThemeColors = {
  bg: "#fafaf9",
  surface: "#ffffff",
  surface2: "#f5f5f4",
  border: "#e7e5e4",
  text: "#1c1917",
  textMuted: "#57534e",
  primary: "#b45309",
  primaryMuted: "#92400e",
  morning: "#059669",
  afternoon: "#ca8a04",
  fullday: "#7c3aed",
  off: "#64748b",
  antre: "#dc2626",
  aksam: "#0284c7",
  envanter: "#ea580c",
  envanterIzni: "#94a3b8",
  envanterFull: "#9a3412",
  resmiTatil: "#be185d",
  danger: "#dc2626",
  tabBar: "#ffffff",
};

const auroraDark: ThemeColors = {
  bg: "#0c1220",
  surface: "#151b2e",
  surface2: "#1e2740",
  border: "#2d3f5c",
  text: "#e8f4f8",
  textMuted: "#8da4b8",
  primary: "#2dd4bf",
  primaryMuted: "#14b8a6",
  morning: "#4ade80",
  afternoon: "#facc15",
  fullday: "#c084fc",
  off: "#64748b",
  antre: "#fb7185",
  aksam: "#38bdf8",
  envanter: "#fb923c",
  envanterIzni: "#94a3b8",
  envanterFull: "#ea580c",
  resmiTatil: "#f472b6",
  danger: "#f87171",
  tabBar: "#0a0f18",
};

const auroraLight: ThemeColors = {
  bg: "#eef6f6",
  surface: "#ffffff",
  surface2: "#e0f2f1",
  border: "#b2dfdb",
  text: "#0f172a",
  textMuted: "#546e7a",
  primary: "#0d9488",
  primaryMuted: "#0f766e",
  morning: "#16a34a",
  afternoon: "#ca8a04",
  fullday: "#7c3aed",
  off: "#64748b",
  antre: "#dc2626",
  aksam: "#0284c7",
  envanter: "#ea580c",
  envanterIzni: "#94a3b8",
  envanterFull: "#9a3412",
  resmiTatil: "#be185d",
  danger: "#dc2626",
  tabBar: "#ffffff",
};

const dawnDark: ThemeColors = {
  bg: "#0d1520",
  surface: "#152535",
  surface2: "#1e3347",
  border: "#2d4a63",
  text: "#f1f5f9",
  textMuted: "#8ba3b8",
  primary: "#fb7185",
  primaryMuted: "#f43f5e",
  morning: "#34d399",
  afternoon: "#fbbf24",
  fullday: "#a78bfa",
  off: "#64748b",
  antre: "#fb923c",
  aksam: "#38bdf8",
  envanter: "#f97316",
  envanterIzni: "#94a3b8",
  envanterFull: "#c2410c",
  resmiTatil: "#f472b6",
  danger: "#f87171",
  tabBar: "#0a1219",
};

const dawnLight: ThemeColors = {
  bg: "#faf6f0",
  surface: "#fffdfb",
  surface2: "#fff1e6",
  border: "#e8d5c4",
  text: "#292524",
  textMuted: "#78716c",
  primary: "#c2410c",
  primaryMuted: "#9a3412",
  morning: "#15803d",
  afternoon: "#a16207",
  fullday: "#6d28d9",
  off: "#64748b",
  antre: "#b91c1c",
  aksam: "#0369a1",
  envanter: "#c2410c",
  envanterIzni: "#94a3b8",
  envanterFull: "#9a3412",
  resmiTatil: "#be185d",
  danger: "#dc2626",
  tabBar: "#ffffff",
};

const studioDark: ThemeColors = {
  bg: "#121214",
  surface: "#1a1a1d",
  surface2: "#242428",
  border: "#34343a",
  text: "#f4f4f5",
  textMuted: "#a1a1aa",
  primary: "#818cf8",
  primaryMuted: "#6366f1",
  morning: "#4ade80",
  afternoon: "#facc15",
  fullday: "#c084fc",
  off: "#71717a",
  antre: "#fb7185",
  aksam: "#38bdf8",
  envanter: "#fb923c",
  envanterIzni: "#94a3b8",
  envanterFull: "#ea580c",
  resmiTatil: "#f472b6",
  danger: "#f87171",
  tabBar: "#0f0f12",
};

const studioLight: ThemeColors = {
  bg: "#f4f4f5",
  surface: "#ffffff",
  surface2: "#e4e4e7",
  border: "#d4d4d8",
  text: "#18181b",
  textMuted: "#71717a",
  primary: "#4f46e5",
  primaryMuted: "#4338ca",
  morning: "#16a34a",
  afternoon: "#ca8a04",
  fullday: "#7c3aed",
  off: "#64748b",
  antre: "#dc2626",
  aksam: "#0284c7",
  envanter: "#ea580c",
  envanterIzni: "#94a3b8",
  envanterFull: "#9a3412",
  resmiTatil: "#be185d",
  danger: "#dc2626",
  tabBar: "#ffffff",
};

const PRESETS: Record<AppearanceId, { dark: ThemeColors; light: ThemeColors }> = {
  classic: { dark: darkTheme, light: lightTheme },
  noir: { dark: noirDark, light: noirLight },
  aurora: { dark: auroraDark, light: auroraLight },
  dawn: { dark: dawnDark, light: dawnLight },
  studio: { dark: studioDark, light: studioLight },
};

export function resolveAppearanceColors(id: AppearanceId, isDark: boolean): ThemeColors {
  const p = PRESETS[id] ?? PRESETS.classic;
  return isDark ? p.dark : p.light;
}
