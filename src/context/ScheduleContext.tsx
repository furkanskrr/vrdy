import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { sendPushToGroup, sendPushToProfiles } from "../lib/notifications";
import { vardiyaEtiket, vardiyaTakasaUygun } from "../lib/vardiya";
import {
  haftaAraligiISO,
  isoTarihGunluk,
  isoTarihHaftaGunuIndex,
  overrideAnahtarParcala,
  simdikiHaftaPazartesiStr,
  uyeVardiyasiAl,
} from "../data/mockSchedule";
import { AppEntrySplash } from "../components/AppEntrySplash";
import type { ShiftKind, TakasKaydi, TeamMember } from "../types";

export type HaftaGunuIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type IzinGunuMap = Record<string, HaftaGunuIndex>;
export type OverrideKey = `${string}__${string}`;
export type ManualOverrides = Record<OverrideKey, ShiftKind>;

export type TakasIslemSonuc = { ok: true } | { ok: false; mesaj: string };

export type ClearOverrideSonuc = { ok: true; silindi: boolean } | { ok: false };

type ScheduleContextValue = {
  ekip: TeamMember[];
  ekipHazir: boolean;
  uyeEkle: (ad: string, rol: string, partnerId?: string) => Promise<void>;
  /** Silinen üye kendi hesabıysa 'self' — Ayarlar ekranı kuruluma yönlendirir */
  uyeSil: (memberId: string) => Promise<"self" | "other" | null>;
  uyeGuncelle: (memberId: string, updates: { ad?: string; rol?: string; partner_id?: string | null }) => Promise<void>;

  izinGunu: IzinGunuMap;
  setIzinGunu: (memberId: string, gun: HaftaGunuIndex) => Promise<void>;
  /** Haftalık izin şablonunu kaldırır; ilgili izin/tamgün override satırlarını temizler */
  clearIzinGunu: (memberId: string) => Promise<boolean>;

  overrides: ManualOverrides;
  setOverride: (tarih: string, memberId: string, shift: ShiftKind, opts?: { bildirim?: boolean }) => Promise<boolean>;
  clearOverride: (tarih: string, memberId: string) => Promise<ClearOverrideSonuc>;

  takaslar: TakasKaydi[];
  /** Aynı takvim günü; partnerler o günkü farklı vardiyalarını takas eder */
  takasTalepGonder: (tarih: string) => Promise<TakasIslemSonuc>;
  takasPartnerYanit: (takasId: string, kabul: boolean) => Promise<TakasIslemSonuc>;
  takasMudurYanit: (takasId: string, onay: boolean) => Promise<TakasIslemSonuc>;
  takasTalepIptal: (takasId: string) => Promise<TakasIslemSonuc>;

  /** YYYY-MM-DD → kısa açıklama (sütun başlığında gösterilir) */
  resmiTatiller: Record<string, string>;
  resmiTatilTarihleri: Set<string>;
  resmiTatilEkle: (tarih: string, aciklama?: string) => Promise<boolean>;
  resmiTatilSil: (tarih: string) => Promise<boolean>;
};

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

/** Context’teki session bazen gecikmeli null kalır; yazma öncesi storage’daki oturumu oku */
async function authKullaniciIdAl(stateSession: Session | null): Promise<string | null> {
  const id = stateSession?.user?.id;
  if (id) return id;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function memberToTeam(row: any): TeamMember {
  return {
    id: row.id,
    ad: row.ad ?? "",
    rol: row.rol ?? "personel",
    partnerId: row.partner_id ?? "",
    profileId: row.profile_id ?? undefined,
  };
}

function rowToTakas(row: {
  id: string;
  group_id: string;
  from_member_id: string;
  to_member_id: string;
  date_from: string;
  date_to: string;
  shift_kind_from: string;
  shift_kind_to: string;
  status: string;
  created_at: string;
}): TakasKaydi {
  return {
    id: row.id,
    groupId: row.group_id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    shiftKindFrom: row.shift_kind_from as ShiftKind,
    shiftKindTo: row.shift_kind_to as ShiftKind,
    status: row.status as TakasKaydi["status"],
    createdAt: row.created_at,
  };
}

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const { user, session, sifreKurtarmaBekliyor } = useAuth();
  const groupId = user?.groupId ?? null;

  const [ekip, setEkip] = useState<TeamMember[]>([]);
  const [izinGunu, setIzinState] = useState<IzinGunuMap>({});
  const [overrides, setOverridesState] = useState<ManualOverrides>({});
  const [resmiTatiller, setResmiTatiller] = useState<Record<string, string>>({});
  const [takaslar, setTakaslar] = useState<TakasKaydi[]>([]);
  const [hazir, setHazir] = useState(false);
  /** Kurtarma akışından çıkınca fetchAll bitene kadar tam ekran splash göstermeyi engelle */
  const kurtarmaSonrasiPlanYuklemesi = useRef(false);

  useEffect(() => {
    if (sifreKurtarmaBekliyor) kurtarmaSonrasiPlanYuklemesi.current = true;
  }, [sifreKurtarmaBekliyor]);

  useEffect(() => {
    if (hazir && kurtarmaSonrasiPlanYuklemesi.current) {
      kurtarmaSonrasiPlanYuklemesi.current = false;
    }
  }, [hazir]);

   const fetchAll = useCallback(async () => {
    if (!groupId) {
      setEkip([]);
      setIzinState({});
      setOverridesState({});
      setResmiTatiller({});
      setTakaslar([]);
      setHazir(true);
      return;
    }

    try {
      const [membersRes, dayOffsRes, overridesRes, holidaysRes] = await Promise.all([
        supabase.from("group_members").select("*").eq("group_id", groupId).order("created_at"),
        supabase.from("day_offs").select("*").eq("group_id", groupId),
        supabase.from("shift_overrides").select("*").eq("group_id", groupId),
        supabase.from("group_holidays").select("*").eq("group_id", groupId),
      ]);

      const takasRes = await supabase
        .from("shift_swap_requests")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (membersRes.data) {
        setEkip(membersRes.data.map(memberToTeam));
      }

      if (dayOffsRes.data) {
        const map: IzinGunuMap = {};
        for (const d of dayOffsRes.data) {
          map[d.member_id] = d.gun_index as HaftaGunuIndex;
        }
        setIzinState(map);
      }

      if (overridesRes.data) {
        const map: ManualOverrides = {};
        for (const o of overridesRes.data) {
          const key: OverrideKey = `${isoTarihGunluk(String(o.tarih))}__${o.member_id}`;
          map[key] = o.shift_kind as ShiftKind;
        }
        setOverridesState(map);
      }

      if (holidaysRes.error) {
        if (__DEV__) console.warn("[schedule] group_holidays:", holidaysRes.error.message);
        setResmiTatiller({});
      } else if (holidaysRes.data) {
        const hm: Record<string, string> = {};
        for (const h of holidaysRes.data) {
          hm[isoTarihGunluk(String(h.tarih))] = String(h.aciklama ?? "").trim() || "Resmi tatil";
        }
        setResmiTatiller(hm);
      } else {
        setResmiTatiller({});
      }

      if (!takasRes.error && takasRes.data) {
        setTakaslar(takasRes.data.map(rowToTakas));
      } else {
        setTakaslar([]);
        if (__DEV__ && takasRes.error) {
          console.warn("[schedule] shift_swap_requests:", takasRes.error.message);
        }
      }
    } catch (e) {
      if (__DEV__) console.warn("[schedule] fetchAll:", e);
    } finally {
      setHazir(true);
    }
  }, [groupId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscriptions
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` },
        () => { fetchAll(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "day_offs", filter: `group_id=eq.${groupId}` },
        () => { fetchAll(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_overrides", filter: `group_id=eq.${groupId}` },
        () => { fetchAll(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_holidays", filter: `group_id=eq.${groupId}` },
        () => { fetchAll(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_swap_requests", filter: `group_id=eq.${groupId}` },
        () => { fetchAll(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchAll]);

  const uyeEkle = useCallback(async (ad: string, rol: string, partnerId?: string) => {
    if (!groupId || !session?.user) return;
    await supabase.from("group_members").insert({
      group_id: groupId,
      profile_id: session.user.id,
      ad,
      rol,
      partner_id: partnerId || null,
    });
  }, [groupId, session]);

  const uyeSil = useCallback(
    async (memberId: string): Promise<"self" | "other" | null> => {
      if (!groupId) return null;
      const uid = await authKullaniciIdAl(session);
      if (!uid) return null;

      const hedef = ekip.find((m) => m.id === memberId);
      const kendiKayit = hedef?.profileId === uid;

      const { error: rpcErr } = await supabase.rpc("remove_group_member", { p_member_id: memberId });
      if (!rpcErr) {
        await fetchAll();
        return kendiKayit ? "self" : "other";
      }

      if (__DEV__) console.warn("[schedule] remove_group_member RPC:", rpcErr.message);

      const { error: delErr } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId)
        .eq("group_id", groupId);

      if (delErr) {
        if (__DEV__) console.warn("[schedule] uyeSil delete:", delErr.message);
        return null;
      }

      if (kendiKayit) {
        const { error: pErr } = await supabase
          .from("profiles")
          .update({ group_id: null, onboarding_complete: false })
          .eq("id", uid);
        if (pErr && __DEV__) console.warn("[schedule] uyeSil profile detach:", pErr.message);
      }

      await fetchAll();
      return kendiKayit ? "self" : "other";
    },
    [groupId, session, ekip, fetchAll]
  );

  const uyeGuncelle = useCallback(async (memberId: string, updates: { ad?: string; rol?: string; partner_id?: string | null }) => {
    if (!groupId) return;
    await supabase.from("group_members").update(updates).eq("id", memberId).eq("group_id", groupId);
  }, [groupId]);

  const resmiTatilTarihleri = useMemo(() => new Set(Object.keys(resmiTatiller)), [resmiTatiller]);

  const resmiTatilEkle = useCallback(
    async (tarih: string, aciklama?: string) => {
      if (!groupId) return false;
      const uid = await authKullaniciIdAl(session);
      if (!uid) return false;
      const gun = isoTarihGunluk(tarih);
      const acik = (aciklama ?? "").trim() || "Resmi tatil";
      const { error } = await supabase.from("group_holidays").upsert(
        { group_id: groupId, tarih: gun, aciklama: acik },
        { onConflict: "group_id,tarih" }
      );
      if (error) {
        if (__DEV__) console.warn("[schedule] resmiTatilEkle", error.message);
        return false;
      }
      await fetchAll();
      return true;
    },
    [groupId, session, fetchAll]
  );

  const resmiTatilSil = useCallback(
    async (tarih: string) => {
      if (!groupId) return false;
      const uid = await authKullaniciIdAl(session);
      if (!uid) return false;
      const gun = isoTarihGunluk(tarih);
      const { error } = await supabase.from("group_holidays").delete().eq("group_id", groupId).eq("tarih", gun);
      if (error) {
        if (__DEV__) console.warn("[schedule] resmiTatilSil", error.message);
        return false;
      }
      await fetchAll();
      return true;
    },
    [groupId, session, fetchAll]
  );

  const setIzinGunu = useCallback(async (memberId: string, gun: HaftaGunuIndex) => {
    if (!groupId) return;

    const eskiGun = izinGunu[memberId];
    const partnerId = ekip.find((u) => u.id === memberId)?.partnerId;
    const partnerGecerli = Boolean(partnerId);

    await supabase
      .from("day_offs")
      .upsert(
        { group_id: groupId, member_id: memberId, gun_index: gun, updated_at: new Date().toISOString() },
        { onConflict: "group_id,member_id" }
      );

    /** Haftayı kaydedince izin/tamgün hücreleri shift_overrides’a yazılıyor; izin günü değişince bu satırlar eski sütunu kilitliyor. */
    if (eskiGun !== gun) {
      const uyeIds = partnerGecerli ? [memberId, partnerId!] : [memberId];
      const { data: ovRows } = await supabase
        .from("shift_overrides")
        .select("tarih, member_id")
        .eq("group_id", groupId)
        .in("member_id", uyeIds);

      const silinecek = new Map<string, Set<string>>();
      const silmek = (mid: string, tarih: string) => {
        if (!silinecek.has(mid)) silinecek.set(mid, new Set());
        silinecek.get(mid)!.add(tarih);
      };

      for (const row of ovRows ?? []) {
        const rowTarih = isoTarihGunluk(String(row.tarih));
        const idx = isoTarihHaftaGunuIndex(rowTarih);
        if (row.member_id === memberId) {
          if (idx === gun || (eskiGun !== undefined && idx === eskiGun)) silmek(memberId, rowTarih);
        } else if (partnerGecerli && partnerId && row.member_id === partnerId) {
          if (idx === gun || (eskiGun !== undefined && idx === eskiGun)) silmek(partnerId, rowTarih);
        }
      }

      for (const [mid, tarihler] of silinecek) {
        const liste = [...tarihler];
        const parca = 80;
        for (let i = 0; i < liste.length; i += parca) {
          const dilim = liste.slice(i, i + parca);
          await supabase.from("shift_overrides").delete().eq("group_id", groupId).eq("member_id", mid).in("tarih", dilim);
        }
      }
    }

    const member = ekip.find((u) => u.id === memberId);
    if (member && groupId) {
      const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
      sendPushToGroup(groupId, "İzin günü değişti", `${member.ad}: ${gunler[gun]}`).catch(() => {});
    }
  }, [groupId, ekip, izinGunu]);

  const clearIzinGunu = useCallback(
    async (memberId: string): Promise<boolean> => {
      if (!groupId) return false;

      const eskiGun = izinGunu[memberId];
      if (eskiGun === undefined) return true;

      const partnerId = ekip.find((u) => u.id === memberId)?.partnerId;
      const partnerGecerli = Boolean(partnerId);

      const { error } = await supabase.from("day_offs").delete().eq("group_id", groupId).eq("member_id", memberId);
      if (error) {
        if (__DEV__) console.warn("[schedule] clearIzinGunu", error.message);
        return false;
      }

      const uyeIds = partnerGecerli ? [memberId, partnerId!] : [memberId];
      const { data: ovRows } = await supabase
        .from("shift_overrides")
        .select("tarih, member_id")
        .eq("group_id", groupId)
        .in("member_id", uyeIds);

      const silinecek = new Map<string, Set<string>>();
      const silmek = (mid: string, tarih: string) => {
        if (!silinecek.has(mid)) silinecek.set(mid, new Set());
        silinecek.get(mid)!.add(tarih);
      };

      for (const row of ovRows ?? []) {
        const rowTarih = isoTarihGunluk(String(row.tarih));
        const idx = isoTarihHaftaGunuIndex(rowTarih);
        if (row.member_id === memberId && idx === eskiGun) silmek(memberId, rowTarih);
        else if (partnerGecerli && partnerId && row.member_id === partnerId && idx === eskiGun)
          silmek(partnerId, rowTarih);
      }

      for (const [mid, tarihler] of silinecek) {
        const liste = [...tarihler];
        const parca = 80;
        for (let i = 0; i < liste.length; i += parca) {
          const dilim = liste.slice(i, i + parca);
          await supabase.from("shift_overrides").delete().eq("group_id", groupId).eq("member_id", mid).in("tarih", dilim);
        }
      }

      const member = ekip.find((u) => u.id === memberId);
      if (member) {
        sendPushToGroup(groupId, "İzin günü kaldırıldı", `${member.ad} için haftalık izin şablonu silindi.`).catch(
          () => {}
        );
      }

      await fetchAll();
      return true;
    },
    [groupId, ekip, izinGunu, fetchAll]
  );

  const setOverride = useCallback(async (tarih: string, memberId: string, shift: ShiftKind, opts?: { bildirim?: boolean }) => {
    if (!groupId) return false;
    const uid = await authKullaniciIdAl(session);
    if (!uid) return false;

    const gun = isoTarihGunluk(tarih);
    const bildirim = opts?.bildirim !== false;

    const { bas: haftaPzt, bit: haftaPaz } = haftaAraligiISO(gun);
    const buHaftaPzt = simdikiHaftaPazartesiStr();
    const gelecekHaftaMi = haftaPzt > buHaftaPzt;

    let yeniHaftaIlkKayit = false;
    const vardiyaYoneticisi = user?.rol === "mudur" || user?.rol === "yardimci";
    if (bildirim && vardiyaYoneticisi && gelecekHaftaMi) {
      const { count, error: cntErr } = await supabase
        .from("shift_overrides")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId)
        .gte("tarih", haftaPzt)
        .lte("tarih", haftaPaz);
      if (!cntErr && (count ?? 0) === 0) {
        yeniHaftaIlkKayit = true;
      }
    }

    const { error: upsertErr } = await supabase
      .from("shift_overrides")
      .upsert(
        {
          group_id: groupId,
          member_id: memberId,
          tarih: gun,
          shift_kind: shift,
          created_by: uid,
        },
        { onConflict: "group_id,member_id,tarih" }
      );

    if (upsertErr) {
      if (__DEV__) console.warn("[schedule] setOverride", upsertErr.message);
      return false;
    }

    const member = ekip.find((u) => u.id === memberId);
    if (!groupId || !member || !bildirim) return true;

    if (gelecekHaftaMi) {
      if (yeniHaftaIlkKayit) {
        sendPushToGroup(groupId, "Vardiyam?", "Yeni haftanın vardiyası hazır.").catch(() => {});
      }
      // Aynı gelecek haftaya sonraki hücreler: tek tek push yok (spam olmasın)
    } else {
      sendPushToGroup(
        groupId,
        "Vardiya değişikliği",
        `${member.ad}: ${vardiyaEtiket(shift)} (${gun})`
      ).catch(() => {});
    }
    return true;
  }, [groupId, session, ekip, user?.rol]);

  const clearOverride = useCallback(
    async (tarih: string, memberId: string): Promise<ClearOverrideSonuc> => {
      if (!groupId) return { ok: false };
      const uid = await authKullaniciIdAl(session);
      if (!uid) return { ok: false };
      const gun = isoTarihGunluk(tarih);
      const member = ekip.find((u) => u.id === memberId);
      const { bas: haftaPzt } = haftaAraligiISO(gun);
      const gelecekHaftaMi = haftaPzt > simdikiHaftaPazartesiStr();

      /** `.eq(tarih)` bazen 0 satır siliyor (tip/serileştirme); önce id ile eşleştir */
      const { data: adaylar, error: selErr } = await supabase
        .from("shift_overrides")
        .select("id, tarih")
        .eq("group_id", groupId)
        .eq("member_id", memberId);

      if (selErr) {
        if (__DEV__) console.warn("[schedule] clearOverride select", selErr.message);
        return { ok: false };
      }

      const silinecekIdler = (adaylar ?? [])
        .filter((r) => isoTarihGunluk(String(r.tarih)) === gun)
        .map((r) => r.id);

      if (silinecekIdler.length > 0) {
        const { error: delErr } = await supabase.from("shift_overrides").delete().in("id", silinecekIdler);
        if (delErr) {
          if (__DEV__) console.warn("[schedule] clearOverride delete", delErr.message);
          return { ok: false };
        }
      }

      setOverridesState((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          const p = overrideAnahtarParcala(k);
          if (p && p.uyeId === memberId && isoTarihGunluk(p.tarih) === gun) {
            delete next[k as OverrideKey];
          }
        }
        return next;
      });

      await fetchAll();

      if (member && !gelecekHaftaMi && silinecekIdler.length > 0) {
        sendPushToGroup(
          groupId,
          "Vardiya güncellendi",
          `${member.ad}: atama kaldırıldı (${gun})`
        ).catch(() => {});
      }
      return { ok: true, silindi: silinecekIdler.length > 0 };
    },
    [groupId, ekip, session, fetchAll]
  );

  const takasTalepGonder = useCallback(async (tarih: string): Promise<TakasIslemSonuc> => {
    if (!groupId || !session?.user) return { ok: false, mesaj: "Oturum yok" };
    const benim = ekip.find((m) => m.profileId === session.user.id);
    if (!benim?.partnerId) return { ok: false, mesaj: "Partner atanmamış; müdürden partner bağlamasını isteyin." };
    const partner = ekip.find((m) => m.id === benim.partnerId);
    if (!partner) return { ok: false, mesaj: "Partner bulunamadı." };

    const vf = uyeVardiyasiAl(tarih, benim.id, ekip, izinGunu, overrides, resmiTatilTarihleri);
    const vt = uyeVardiyasiAl(tarih, partner.id, ekip, izinGunu, overrides, resmiTatilTarihleri);
    if (!vardiyaTakasaUygun(vf) || !vardiyaTakasaUygun(vt)) {
      return {
        ok: false,
        mesaj:
          "Bu günde sizin ve partnerinizin her ikisinde de çalışma vardiyası olmalı. İzin, resmi tatil veya envanter izninde takas yapılamaz; müdürden atama isteyin.",
      };
    }

    if (vf === vt) {
      return {
        ok: false,
        mesaj: "Takas için farklı vardiyalar gerekir (ör. siz sabah, partner akşam — aynı gün).",
      };
    }

    const { error } = await supabase.from("shift_swap_requests").insert({
      group_id: groupId,
      from_member_id: benim.id,
      to_member_id: partner.id,
      date_from: tarih,
      date_to: tarih,
      shift_kind_from: vf,
      shift_kind_to: vt,
      status: "awaiting_partner",
    });

    if (error) return { ok: false, mesaj: error.message };

    if (partner.profileId) {
      sendPushToProfiles(
        groupId,
        [partner.profileId],
        "Vardiya takası",
        `${benim.ad} sizinle vardiya takası talep ediyor.`
      ).catch(() => {});
    }

    await fetchAll();
    return { ok: true };
  }, [groupId, session, ekip, izinGunu, overrides, resmiTatilTarihleri, fetchAll]);

  const takasPartnerYanit = useCallback(async (takasId: string, kabul: boolean): Promise<TakasIslemSonuc> => {
    if (!groupId) return { ok: false, mesaj: "Grup yok" };

    const yeniDurum = kabul ? "awaiting_manager" : "rejected_partner";
    const { error } = await supabase
      .from("shift_swap_requests")
      .update({ status: yeniDurum, updated_at: new Date().toISOString() })
      .eq("id", takasId)
      .eq("status", "awaiting_partner");

    if (error) return { ok: false, mesaj: error.message };

    if (kabul) {
      const { data: row } = await supabase.from("shift_swap_requests").select("*").eq("id", takasId).maybeSingle();
      if (row) {
        const t = rowToTakas(row as never);
        const fromAd = ekip.find((m) => m.id === t.fromMemberId)?.ad ?? "Personel";
        const toAd = ekip.find((m) => m.id === t.toMemberId)?.ad ?? "Partner";
        const mudurProfiller = ekip
          .filter((m) => m.rol === "mudur" && m.profileId)
          .map((m) => m.profileId as string);
        if (mudurProfiller.length) {
          sendPushToProfiles(
            groupId,
            mudurProfiller,
            "Takas onayı bekleniyor",
            `${fromAd} ↔ ${toAd}: vardiya takası için onayınız gerekiyor.`
          ).catch(() => {});
        }
      }
    } else {
      const { data: row } = await supabase.from("shift_swap_requests").select("*").eq("id", takasId).maybeSingle();
      if (row) {
        const t = rowToTakas(row as never);
        const talepEden = ekip.find((m) => m.id === t.fromMemberId);
        if (talepEden?.profileId) {
          sendPushToProfiles(
            groupId,
            [talepEden.profileId],
            "Takas reddedildi",
            `${ekip.find((m) => m.profileId === session?.user?.id)?.ad ?? "Partner"} takas talebini reddetti.`
          ).catch(() => {});
        }
      }
    }

    await fetchAll();
    return { ok: true };
  }, [groupId, ekip, session?.user?.id, fetchAll]);

  const takasMudurYanit = useCallback(async (takasId: string, onay: boolean): Promise<TakasIslemSonuc> => {
    if (!groupId || !session?.user || (user?.rol !== "mudur" && user?.rol !== "yardimci")) {
      return { ok: false, mesaj: "Bu işlem için müdür veya müdür yardımcısı yetkisi gerekir." };
    }

    const { data: row, error: selErr } = await supabase
      .from("shift_swap_requests")
      .select("*")
      .eq("id", takasId)
      .eq("status", "awaiting_manager")
      .maybeSingle();

    if (selErr || !row) return { ok: false, mesaj: selErr?.message ?? "Talep bulunamadı veya zaten işlendi." };

    const req = rowToTakas(row as never);

    if (!onay) {
      const { error } = await supabase
        .from("shift_swap_requests")
        .update({ status: "rejected_manager", updated_at: new Date().toISOString() })
        .eq("id", takasId)
        .eq("status", "awaiting_manager");
      if (error) return { ok: false, mesaj: error.message };

      const hedefler = [req.fromMemberId, req.toMemberId]
        .map((id) => ekip.find((m) => m.id === id)?.profileId)
        .filter(Boolean) as string[];
      if (hedefler.length) {
        sendPushToProfiles(groupId, hedefler, "Takas reddedildi", "Müdür takas talebini reddetti.").catch(() => {});
      }
      await fetchAll();
      return { ok: true };
    }

    const okFrom = await setOverride(req.dateFrom, req.fromMemberId, req.shiftKindTo, { bildirim: false });
    const okTo = await setOverride(req.dateTo, req.toMemberId, req.shiftKindFrom, { bildirim: false });
    if (!okFrom || !okTo) {
      return { ok: false, mesaj: "Vardiya satırları güncellenemedi." };
    }

    const kA: OverrideKey = `${isoTarihGunluk(req.dateFrom)}__${req.fromMemberId}`;
    const kB: OverrideKey = `${isoTarihGunluk(req.dateTo)}__${req.toMemberId}`;
    setOverridesState((prev) => ({
      ...prev,
      [kA]: req.shiftKindTo,
      [kB]: req.shiftKindFrom,
    }));

    const { error: updErr } = await supabase
      .from("shift_swap_requests")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", takasId)
      .eq("status", "awaiting_manager");

    if (updErr) return { ok: false, mesaj: updErr.message };

    const fromAd = ekip.find((m) => m.id === req.fromMemberId)?.ad ?? "";
    const toAd = ekip.find((m) => m.id === req.toMemberId)?.ad ?? "";
    sendPushToGroup(groupId, "Takas onaylandı", `${fromAd} ve ${toAd} vardiyalarını değiştirdi.`).catch(() => {});

    await fetchAll();
    return { ok: true };
  }, [groupId, session, user?.rol, ekip, fetchAll, setOverride]);

  const takasTalepIptal = useCallback(async (takasId: string): Promise<TakasIslemSonuc> => {
    if (!groupId || !session?.user) return { ok: false, mesaj: "Oturum yok" };

    const { error } = await supabase
      .from("shift_swap_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", takasId)
      .eq("status", "awaiting_partner");

    if (error) return { ok: false, mesaj: error.message };

    await fetchAll();
    return { ok: true };
  }, [groupId, session, fetchAll]);

  /** Profil adı (profiles.ad) güncellenince ekip satırı (group_members) gecikmeli güncellenebilir; kendi adımızı Auth ile hizala. */
  const ekipGorunur = useMemo(() => {
    const uid = session?.user?.id;
    const ad = user?.ad?.trim();
    if (!uid || !ad) return ekip;
    return ekip.map((m) => (m.profileId === uid ? { ...m, ad } : m));
  }, [ekip, session?.user?.id, user?.ad]);

  const value = useMemo<ScheduleContextValue>(() => ({
    ekip: ekipGorunur,
    ekipHazir: hazir,
    uyeEkle,
    uyeSil,
    uyeGuncelle,
    izinGunu,
    setIzinGunu,
    clearIzinGunu,
    overrides,
    setOverride,
    clearOverride,
    takaslar,
    takasTalepGonder,
    takasPartnerYanit,
    takasMudurYanit,
    takasTalepIptal,
    resmiTatiller,
    resmiTatilTarihleri,
    resmiTatilEkle,
    resmiTatilSil,
  }), [
    ekipGorunur,
    hazir,
    uyeEkle,
    uyeSil,
    uyeGuncelle,
    izinGunu,
    setIzinGunu,
    clearIzinGunu,
    overrides,
    setOverride,
    clearOverride,
    takaslar,
    takasTalepGonder,
    takasPartnerYanit,
    takasMudurYanit,
    takasTalepIptal,
    resmiTatiller,
    resmiTatilTarihleri,
    resmiTatilEkle,
    resmiTatilSil,
  ]);

  // Şifre sıfırlama sırasında ve yeni şifre kaydından hemen sonra plan yüklenirken tam ekran splash gösterme
  const tamEkranSplash =
    !hazir &&
    groupId &&
    !sifreKurtarmaBekliyor &&
    !kurtarmaSonrasiPlanYuklemesi.current;
  if (tamEkranSplash) {
    return <AppEntrySplash />;
  }

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule(): ScheduleContextValue {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error("useSchedule ScheduleProvider içinde olmalı");
  return ctx;
}
