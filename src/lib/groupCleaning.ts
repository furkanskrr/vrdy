import { isSupabaseConfigured, supabase } from "./supabase";
import { temizlikBolgesiMetni, temizlikSlotuAyinGunu, yerelTarihAnahtar } from "../constants/cleaningSchedule";

export type TemizlikTamamlama = {
  id: string;
  group_id: string;
  gun_tarihi: string;
  slot_index: number;
  completed_by: string;
  completed_at: string;
  supervisor_profile_id: string | null;
  supervisor_approved_at: string | null;
};

export async function temizlikTamamlamalariYukle(
  groupId: string,
  baslangicIso: string,
  bitisIso: string
): Promise<TemizlikTamamlama[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("group_cleaning_completions")
    .select(
      "id, group_id, gun_tarihi, slot_index, completed_by, completed_at, supervisor_profile_id, supervisor_approved_at"
    )
    .eq("group_id", groupId)
    .gte("gun_tarihi", baslangicIso)
    .lte("gun_tarihi", bitisIso)
    .order("gun_tarihi", { ascending: true });
  if (error) {
    if (__DEV__) console.warn("[temizlik] yukle:", error.message);
    return [];
  }
  return (data ?? []) as TemizlikTamamlama[];
}

export async function temizlikTamamla(params: {
  groupId: string;
  tarih: Date;
  profileId: string;
}): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, mesaj: "Sunucu yapılandırılmadı." };
  }
  const gun_tarihi = yerelTarihAnahtar(params.tarih);
  const slot_index = temizlikSlotuAyinGunu(params.tarih.getDate());
  const { error } = await supabase.from("group_cleaning_completions").insert({
    group_id: params.groupId,
    gun_tarihi,
    slot_index,
    completed_by: params.profileId,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, mesaj: "Bu gün için zaten personel onayı var." };
    }
    if (__DEV__) console.warn("[temizlik] ekle:", error.message);
    return { ok: false, mesaj: error.message || "Kaydedilemedi." };
  }
  return { ok: true };
}

export async function temizlikDenetimeOnayla(
  completionId: string
): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, mesaj: "Sunucu yapılandırılmadı." };
  }
  const { error } = await supabase.rpc("temizlik_denetime_onayla", {
    p_completion_id: completionId,
  });
  if (error) {
    if (__DEV__) console.warn("[temizlik] denetim:", error.message);
    return { ok: false, mesaj: error.message || "Denetim onayı verilemedi." };
  }
  return { ok: true };
}

export async function temizlikTamamlamaSil(id: string): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, mesaj: "Sunucu yapılandırılmadı." };
  }
  const { error } = await supabase.from("group_cleaning_completions").delete().eq("id", id);
  if (error) {
    if (__DEV__) console.warn("[temizlik] sil:", error.message);
    return { ok: false, mesaj: error.message || "Silinemedi." };
  }
  return { ok: true };
}

export function temizlikPersonelOzet(kayit: TemizlikTamamlama, yapanAd?: string | null): string {
  const bolge = temizlikBolgesiMetni(kayit.slot_index);
  const ad = yapanAd?.trim() || "Personel";
  const t = new Date(kayit.completed_at);
  const saat = t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${ad} · ${saat} · ${bolge}`;
}

export function temizlikDenetimOzet(kayit: TemizlikTamamlama, denetmenAd?: string | null): string | null {
  if (!kayit.supervisor_approved_at || !kayit.supervisor_profile_id) return null;
  const ad = denetmenAd?.trim() || "Yönetici";
  const t = new Date(kayit.supervisor_approved_at);
  const saat = t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `Denetim: ${ad} · ${saat}`;
}

/** @deprecated tek satır için personel özeti kullanın */
export function tamamlamaOzetiMetni(kayit: TemizlikTamamlama, yapanAd?: string | null): string {
  return temizlikPersonelOzet(kayit, yapanAd);
}
