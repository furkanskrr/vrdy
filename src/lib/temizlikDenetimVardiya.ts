import { uyeVardiyasiAl } from "../data/mockSchedule";
import type { IzinGunuMap, ManualOverrides } from "../context/ScheduleContext";
import type { ShiftKind, TeamMember } from "../types";

const CALISMA_DISI: ShiftKind[] = ["izin", "envanter_izni", "resmi_tatil"];

export function vardiyaCalisiyorMu(v: ShiftKind | undefined): boolean {
  return Boolean(v && !CALISMA_DISI.includes(v));
}

/**
 * O gün vardiyada çalışan müdür veya müdür yardımcısı denetim onayı verebilir.
 * Vardiya tablosunda atanmamış (boş) hücre = çalışmıyor sayılır.
 */
export function temizlikDenetimiVerilebilirMi(params: {
  tarihIso: string;
  uyeId: string;
  rol: TeamMember["rol"];
  ekip: TeamMember[];
  izinGunu: IzinGunuMap;
  overrides: ManualOverrides;
  resmiTatilTarihleri: Set<string>;
}): boolean {
  if (params.rol !== "mudur" && params.rol !== "yardimci") return false;
  const v = uyeVardiyasiAl(
    params.tarihIso,
    params.uyeId,
    params.ekip,
    params.izinGunu,
    params.overrides,
    params.resmiTatilTarihleri
  );
  return vardiyaCalisiyorMu(v);
}
