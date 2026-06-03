import type { ShiftKind } from "../types";

type VardiyaDetay = { baslangic: string; bitis: string; molaDk: number; hesapSaat: number };

const SIFIR_SAAT: ShiftKind[] = ["izin", "envanter_izni", "resmi_tatil"];

export const VARDIYA_DETAY: Record<Exclude<ShiftKind, "izin" | "envanter_izni" | "resmi_tatil">, VardiyaDetay> = {
  sabah: { baslangic: "08:45", bitis: "17:15", molaDk: 60, hesapSaat: 7.5 },
  ogle: { baslangic: "14:15", bitis: "21:15", molaDk: 30, hesapSaat: 6.5 },
  tamgun: { baslangic: "08:45", bitis: "21:15", molaDk: 90, hesapSaat: 11 },
  antre: { baslangic: "08:45", bitis: "21:15", molaDk: 0, hesapSaat: 7.5 },
  aksam: { baslangic: "12:15", bitis: "21:15", molaDk: 90, hesapSaat: 7.5 },
  envanter: { baslangic: "08:45", bitis: "21:15", molaDk: 0, hesapSaat: 7.5 },
  envanter_full: { baslangic: "08:45", bitis: "21:15", molaDk: 90, hesapSaat: 7.5 },
};

export function shiftKindSaat(v: ShiftKind | undefined | null): number {
  if (!v || SIFIR_SAAT.includes(v)) return 0;
  const detay = VARDIYA_DETAY[v as keyof typeof VARDIYA_DETAY];
  return detay?.hesapSaat ?? 0;
}

/** Haftalık hedef (ileride raporlama için tutulabilir) */
export const HAFTALIK_HEDEF_SAAT = 40;

/** Aylık toplam çalışma hedefi (ana sayfa ilerleme çubuğu) */
export const AYLIK_HEDEF_SAAT = 195;
