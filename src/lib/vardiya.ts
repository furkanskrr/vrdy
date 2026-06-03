import type { ShiftKind } from "../types";
import type { ThemeColors } from "../constants/theme";

const TAKASA_KAPALI: ShiftKind[] = ["izin", "envanter_izni", "resmi_tatil"];

/** Takas için iki tarafta da çalışma vardiyası gerekir */
export function vardiyaTakasaUygun(v: ShiftKind | undefined): v is ShiftKind {
  return Boolean(v && !TAKASA_KAPALI.includes(v));
}

export function vardiyaRenk(v: ShiftKind | undefined | null, c: ThemeColors): string {
  if (!v) return c.textMuted;
  switch (v) {
    case "sabah":
      return c.morning;
    case "ogle":
      return c.afternoon;
    case "tamgun":
      return c.fullday;
    case "izin":
      return c.off;
    case "antre":
      return c.antre;
    case "aksam":
      return c.aksam;
    case "envanter":
      return c.envanter;
    case "envanter_izni":
      return c.envanterIzni;
    case "envanter_full":
      return c.envanterFull;
    case "resmi_tatil":
      return c.resmiTatil;
    default:
      return c.textMuted;
  }
}

export function vardiyaEtiket(v: ShiftKind | undefined | null): string {
  if (!v) return "—";
  switch (v) {
    case "sabah":
      return "Sabah";
    case "ogle":
      return "Öğle";
    case "tamgun":
      return "Tam gün";
    case "izin":
      return "İzin";
    case "antre":
      return "Antre";
    case "aksam":
      return "Akşam";
    case "envanter":
      return "Envanter";
    case "envanter_izni":
      return "Envanter izni";
    case "envanter_full":
      return "Envanter (tam)";
    case "resmi_tatil":
      return "Resmi tatil";
    default:
      return "—";
  }
}

export function vardiyaKisa(v: ShiftKind | undefined | null): string {
  if (!v) return "—";
  switch (v) {
    case "sabah":
      return "S";
    case "ogle":
      return "Ö";
    case "tamgun":
      return "T";
    case "izin":
      return "İ";
    case "antre":
      return "A";
    case "aksam":
      return "Ak";
    case "envanter":
      return "E";
    case "envanter_izni":
      return "Eİ";
    case "envanter_full":
      return "EF";
    case "resmi_tatil":
      return "RT";
    default:
      return "—";
  }
}

export function vardiyaSaatAraligi(v: ShiftKind | undefined | null): string {
  if (!v) return "—";
  switch (v) {
    case "izin":
    case "envanter_izni":
    case "resmi_tatil":
      return "—";
    case "sabah":
      return "08:45 – 17:15";
    case "ogle":
      return "14:15 – 21:15";
    case "tamgun":
      return "08:45 – 21:15";
    case "antre":
      return "08:45–12:00 + 16:15–21:15";
    case "aksam":
      return "12:15 – 21:15";
    case "envanter":
      return "Sayım günü";
    case "envanter_full":
      return "Sayım tam gün";
    default:
      return "—";
  }
}

/**
 * Haftalık şema hücresinde başlık (vardiyaEtiket) altında gösterilen kısa açıklama.
 * Harf kodu yerine doğrudan anlaşılır metin / saat.
 */
export function vardiyaHucreAltMetin(v: ShiftKind | undefined | null): string | null {
  if (!v) return null;
  switch (v) {
    case "sabah":
      return "08:45 – 17:15";
    case "ogle":
      return "14:15 – 21:15";
    case "tamgun":
      return "08:45 – 21:15";
    case "aksam":
      return "12:15 – 21:15";
    case "antre":
      return "Sabah + akşam dilimi";
    case "izin":
      return "Planlı izin günü";
    case "resmi_tatil":
      return "Çalışılmıyor";
    case "envanter":
      return "Sayım günü";
    case "envanter_izni":
      return "Sayım sonrası izin";
    case "envanter_full":
      return "Tam gün sayım";
    default:
      return null;
  }
}
