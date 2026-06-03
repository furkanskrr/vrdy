import type { GunlukPlan, ShiftKind, TeamMember } from "../types";
import { shiftKindSaat } from "../constants/shifts";
import type { IzinGunuMap, ManualOverrides, OverrideKey } from "../context/ScheduleContext";

export function haftaBasiPazartesi(tarih: Date = new Date()): Date {
  const d = new Date(tarih);
  const gun = d.getDay();
  const fark = gun === 0 ? -6 : 1 - gun;
  d.setDate(d.getDate() + fark);
  d.setHours(0, 0, 0, 0);
  return d;
}

function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** PostgREST bazen `date` sütununu ISO datetime string olarak döndürür; override anahtarları ve silme sorgusu YYYY-MM-DD olmalı. */
export function isoTarihGunluk(tarihStr: string): string {
  const s = String(tarihStr).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return s.slice(0, 10);
}

/** `YYYY-MM-DD__üyeId` veya tarih kısmında `T` içeren eski anahtarlar için */
export function overrideAnahtarParcala(k: string): { tarih: string; uyeId: string } | null {
  const i = k.lastIndexOf("__");
  if (i <= 0) return null;
  return { tarih: k.slice(0, i), uyeId: k.slice(i + 2) };
}

/** YYYY-MM-DD string → yerel tarih */
export function isoTarihParse(tarihStr: string): Date {
  const gun = isoTarihGunluk(tarihStr);
  const [y, m, d] = gun.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/** Tarihin düştüğü haftanın Pazartesi–Pazar ISO aralığı (YYYY-MM-DD) */
export function haftaAraligiISO(tarihStr: string): { bas: string; bit: string } {
  const pzt = haftaBasiPazartesi(isoTarihParse(tarihStr));
  const paz = new Date(pzt);
  paz.setDate(pzt.getDate() + 6);
  return { bas: yyyymmdd(pzt), bit: yyyymmdd(paz) };
}

/** Bugünün haftasının Pazartesi tarihi (YYYY-MM-DD) */
export function simdikiHaftaPazartesiStr(): string {
  return yyyymmdd(haftaBasiPazartesi(new Date()));
}

function gunIndexPt0(d: Date): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const dow = d.getDay();
  return (dow === 0 ? 6 : dow - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** ISO tarihin hafta içi günü: Pazartesi=0 … Pazar=6 (yerel saat dilimi) */
export function isoTarihHaftaGunuIndex(tarihStr: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return gunIndexPt0(isoTarihParse(tarihStr));
}

function overrideOku(overrides: ManualOverrides | undefined, tarih: string, uyeId: string) {
  if (!overrides) return undefined;
  const gun = isoTarihGunluk(tarih);
  const tek: OverrideKey = `${gun}__${uyeId}`;
  if (overrides[tek] !== undefined) return overrides[tek];
  for (const [k, val] of Object.entries(overrides)) {
    const p = overrideAnahtarParcala(k);
    if (p && p.uyeId === uyeId && isoTarihGunluk(p.tarih) === gun) return val;
  }
  return undefined;
}

function partnerCiftleriBul(ekip: TeamMember[]): [number, number][] {
  const ciftler: [number, number][] = [];
  const kullanildi = new Set<string>();
  for (let i = 0; i < ekip.length; i++) {
    if (kullanildi.has(ekip[i].id)) continue;
    const j = ekip.findIndex((u) => u.id === ekip[i].partnerId);
    if (j >= 0) {
      ciftler.push([i, j]);
      kullanildi.add(ekip[i].id);
      kullanildi.add(ekip[j].id);
    }
  }
  return ciftler;
}

function haftaVardiyaOlustur(
  pzt: Date,
  ekip: TeamMember[],
  izinGunu: IzinGunuMap | undefined,
  overrides: ManualOverrides | undefined,
  resmiTatilTarihler?: Set<string>,
): { tarih: string; atamalar: Record<string, ShiftKind> }[] {
  const rt = resmiTatilTarihler ?? new Set<string>();
  const tarihler: string[] = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(pzt);
    t.setDate(pzt.getDate() + i);
    tarihler.push(yyyymmdd(t));
  }

  if (ekip.length === 0) {
    return tarihler.map((tarih) => ({ tarih, atamalar: {} }));
  }

  const hafta: Record<string, ShiftKind>[] = tarihler.map(() => ({}));
  const partnerCiftleri = partnerCiftleriBul(ekip);

  // Sadece izin günü ve partnerin tamgün atamasını otomatik yap
  // Geri kalan günler BOŞ kalır — müdür manuel atar
  // Resmi tatil takvimindeki günlerde şablon uygulanmaz (herkes boş / müdür atar)
  for (const [ai, bi] of partnerCiftleri) {
    const a = ekip[ai];
    const b = ekip[bi];
    const offA = izinGunu?.[a.id];
    const offB = izinGunu?.[b.id];

    for (let day = 0; day < 7; day++) {
      if (rt.has(tarihler[day])) continue;
      if (offA !== undefined && day === offA) {
        hafta[day][a.id] = "izin";
        if (hafta[day][b.id] !== "izin") hafta[day][b.id] = "tamgun";
      }
      if (offB !== undefined && day === offB) {
        hafta[day][b.id] = "izin";
        if (hafta[day][a.id] !== "izin") hafta[day][a.id] = "tamgun";
      }
    }
  }

  // Partneri olmayan kişiler için de izin günü
  for (const uye of ekip) {
    const offDay = izinGunu?.[uye.id];
    if (offDay !== undefined) {
      if (rt.has(tarihler[offDay])) continue;
      hafta[offDay][uye.id] = hafta[offDay][uye.id] || "izin";
    }
  }

  // Manuel override'lar (müdürün atadığı vardiyalar)
  if (overrides) {
    for (let day = 0; day < 7; day++) {
      for (const uye of ekip) {
        const v = overrideOku(overrides, tarihler[day], uye.id);
        if (v) hafta[day][uye.id] = v;
      }
    }
  }

  return tarihler.map((tarih, i) => ({ tarih, atamalar: hafta[i] }));
}

export type PlanlamaOpts = {
  izinGunu?: IzinGunuMap;
  overrides?: ManualOverrides;
  /** YYYY-MM-DD — bu takvim günlerinde haftalık izin şablonu uygulanmaz */
  resmiTatilTarihleri?: Set<string>;
};

export function buHaftaninGunlukPlanlari(
  ref: Date = new Date(),
  ekip: TeamMember[],
  opts?: PlanlamaOpts,
): GunlukPlan[] {
  const pzt = haftaBasiPazartesi(ref);
  return haftaVardiyaOlustur(pzt, ekip, opts?.izinGunu, opts?.overrides, opts?.resmiTatilTarihleri);
}

/** Belirli bir ISO tarihte üyenin o anki vardiyası (izin + override dahil) */
export function uyeVardiyasiAl(
  tarih: string,
  uyeId: string,
  ekip: TeamMember[],
  izinGunu?: IzinGunuMap,
  overrides?: ManualOverrides,
  resmiTatilTarihleri?: Set<string>,
): ShiftKind | undefined {
  const ref = isoTarihParse(tarih);
  const planlar = buHaftaninGunlukPlanlari(ref, ekip, { izinGunu, overrides, resmiTatilTarihleri });
  const gun = planlar.find((p) => p.tarih === tarih);
  return gun?.atamalar[uyeId];
}

export function bugununPlani(
  ref: Date = new Date(),
  ekip: TeamMember[],
  opts?: PlanlamaOpts,
): GunlukPlan | undefined {
  const bugun = yyyymmdd(ref);
  return buHaftaninGunlukPlanlari(ref, ekip, opts).find((g) => g.tarih === bugun);
}

export function haftalikSatirlar(
  ref: Date = new Date(),
  ekip: TeamMember[],
  opts?: PlanlamaOpts,
): {
  uye: TeamMember;
  gunler: (ShiftKind | undefined)[];
}[] {
  const planlar = buHaftaninGunlukPlanlari(ref, ekip, opts);
  return ekip.map((uye) => ({
    uye,
    gunler: planlar.map((p) => p.atamalar[uye.id]),
  }));
}

export function saatOzet(
  planlar: GunlukPlan[],
  ekip: TeamMember[],
): { uye: TeamMember; saat: number }[] {
  return ekip.map((uye) => {
    let toplam = 0;
    for (const g of planlar) {
      const v = g.atamalar[uye.id];
      if (v) toplam += shiftKindSaat(v);
    }
    return { uye, saat: Math.round(toplam * 10) / 10 };
  });
}

export function ayGunlukPlanlari(
  yil: number,
  ay: number,
  ekip: TeamMember[],
  opts?: PlanlamaOpts,
): GunlukPlan[] {
  const son = new Date(yil, ay, 0);
  const n = son.getDate();
  const cikti: GunlukPlan[] = [];

  const haftaCache = new Map<string, GunlukPlan[]>();
  const rtKey =
    opts?.resmiTatilTarihleri && opts.resmiTatilTarihleri.size > 0
      ? [...opts.resmiTatilTarihleri].sort().join("|")
      : "";

  for (let gun = 1; gun <= n; gun++) {
    const d = new Date(yil, ay - 1, gun);
    const pzt = haftaBasiPazartesi(d);
    const pztKey = yyyymmdd(pzt);
    const cacheKey = rtKey ? `${pztKey}#${rtKey}` : pztKey;

    if (!haftaCache.has(cacheKey)) {
      haftaCache.set(
        cacheKey,
        haftaVardiyaOlustur(pzt, ekip, opts?.izinGunu, opts?.overrides, opts?.resmiTatilTarihleri),
      );
    }

    const hafta = haftaCache.get(cacheKey)!;
    const dayIdx = gunIndexPt0(d);
    cikti.push(hafta[dayIdx]);
  }
  return cikti;
}

export function arsivAylar(sayi: number = 6): { yil: number; ay: number; etiket: string }[] {
  const cikti: { yil: number; ay: number; etiket: string }[] = [];
  const simdi = new Date();
  for (let i = 0; i < sayi; i++) {
    const d = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1);
    cikti.push({
      yil: d.getFullYear(),
      ay: d.getMonth() + 1,
      etiket: d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
    });
  }
  return cikti;
}

export function ayOzetDemo(
  yil: number,
  ay: number,
  ekip: TeamMember[],
): {
  toplamVardiyaGunu: number;
  tamGunSayisi: number;
} {
  const gunler = ayGunlukPlanlari(yil, ay, ekip);
  let tamGun = 0;
  for (const g of gunler) {
    for (const uye of ekip) {
      if (g.atamalar[uye.id] === "tamgun") tamGun++;
    }
  }
  return {
    toplamVardiyaGunu: gunler.length * ekip.length,
    tamGunSayisi: tamGun,
  };
}
