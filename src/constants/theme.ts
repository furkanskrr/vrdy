export type ThemeColors = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryMuted: string;
  morning: string;
  afternoon: string;
  fullday: string;
  off: string;
  antre: string;
  aksam: string;
  envanter: string;
  envanterIzni: string;
  envanterFull: string;
  resmiTatil: string;
  danger: string;
  tabBar: string;
};

export const darkTheme: ThemeColors = {
  bg: "#0f1419",
  surface: "#1a222c",
  surface2: "#242e3a",
  border: "#2d3a47",
  text: "#f0f4f8",
  textMuted: "#8b9aab",
  primary: "#3d8bfd",
  primaryMuted: "#2a5fbf",
  morning: "#2d9d78",
  afternoon: "#d4a024",
  fullday: "#8b5cf6",
  off: "#64748b",
  antre: "#e0605e",
  aksam: "#0ea5e9",
  envanter: "#f97316",
  envanterIzni: "#94a3b8",
  envanterFull: "#c2410c",
  resmiTatil: "#be185d",
  danger: "#ef4444",
  tabBar: "#151c24",
};

/** Açık tema — vardiya / marka renkleri koyu temayla uyumlu bırakıldı */
export const lightTheme: ThemeColors = {
  bg: "#eef2f7",
  surface: "#ffffff",
  surface2: "#e8edf4",
  border: "#cfd8e3",
  text: "#0f172a",
  textMuted: "#64748b",
  primary: "#2563eb",
  primaryMuted: "#1d4ed8",
  morning: "#2d9d78",
  afternoon: "#d4a024",
  fullday: "#8b5cf6",
  off: "#64748b",
  antre: "#e0605e",
  aksam: "#0ea5e9",
  envanter: "#f97316",
  envanterIzni: "#94a3b8",
  envanterFull: "#c2410c",
  resmiTatil: "#be185d",
  danger: "#ef4444",
  tabBar: "#ffffff",
};

export const THEME_STORAGE_KEY = "@vrdy_theme_mode";
