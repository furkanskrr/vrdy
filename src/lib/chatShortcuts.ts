import { supabase } from "./supabase";
import { SOHBET_EK_BUCKET, type SohbetEkTuru } from "./groupChatMedia";

export type SohbetKisayolu = {
  id: string;
  group_id: string;
  trigger_key: string;
  response_body: string;
  response_attachment_type: SohbetEkTuru | null;
  response_attachment_path: string | null;
  response_attachment_name: string | null;
  response_attachment_mime: string | null;
  created_by: string;
  updated_at: string;
};

export function tetikleyiciNormalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\//, "");
}

/** `/ata furkan şifrem:12345` veya `/ata erik` */
export function ataKayitParse(metin: string): { tetikleyici: string; yanitMetin: string } | null {
  const t = metin.trim();
  if (!/^\/ata(\s|$)/i.test(t)) return null;
  const rest = t.replace(/^\/ata\s*/i, "").trim();
  if (!rest) return null;
  const bosluk = rest.search(/\s/);
  if (bosluk < 0) {
    const key = tetikleyiciNormalize(rest);
    return key ? { tetikleyici: key, yanitMetin: "" } : null;
  }
  const tetikleyici = tetikleyiciNormalize(rest.slice(0, bosluk));
  const yanitMetin = rest.slice(bosluk).trim();
  if (!tetikleyici) return null;
  return { tetikleyici, yanitMetin };
}

const ATAMA_KOMUTLARI = new Set(["/atama", "/atamalar", "/atasil"]);

/** `/atasil erik` — kayıtlı atamayı siler */
export function ataSilParse(metin: string): string | null {
  const t = metin.trim();
  if (!/^\/atasil(\s|$)/i.test(t)) return null;
  const rest = t.replace(/^\/atasil\s*/i, "").trim();
  if (!rest) return null;
  const ilk = rest.split(/\s+/)[0];
  const key = tetikleyiciNormalize(ilk);
  return key || null;
}

/** `/atama` veya `/atamalar` — sohbette liste gösterir */
export function atamaListeKomutuParse(metin: string): "atama" | "atamalar" | null {
  const t = metin.trim().toLowerCase();
  if (t === "/atamalar") return "atamalar";
  if (t === "/atama") return "atama";
  return null;
}

function kisayolDegerOzeti(k: SohbetKisayolu): string {
  const metin = k.response_body?.trim();
  if (metin) return metin;
  if (k.response_attachment_type === "image") return "📷 Fotoğraf";
  if (k.response_attachment_type === "audio") return "🎤 Ses mesajı";
  if (k.response_attachment_path) return "📎 Dosya";
  return "—";
}

/** Tetiklenince sohbette: erik → 4 */
export function kisayolTetikYanitMetni(k: SohbetKisayolu): string {
  return `${k.trigger_key} → ${kisayolDegerOzeti(k)}`;
}

/** /atama: yalnızca isimler; /atamalar: isim → değer listesi */
export function kisayolListeMetniOlustur(
  liste: SohbetKisayolu[],
  tip: "atama" | "atamalar"
): string {
  if (liste.length === 0) {
    return "📋 Henüz atama yok.\nEklemek için: /ata erik 4\nSilmek için: /atasil erik";
  }
  if (tip === "atama") {
    const isimler = liste.map((k) => k.trigger_key).join(", ");
    return `📋 Atanan isimler (${liste.length}): ${isimler}`;
  }
  const satirlar = liste.map((k) => `• ${k.trigger_key} → ${kisayolDegerOzeti(k)}`);
  return `📋 Atamalar (${liste.length})\n${satirlar.join("\n")}`;
}

/** Spam önleme: yalnızca tam eşleşme veya `/tetikleyici` */
export function mesajTetiklerMi(mesaj: string, tetikleyici: string): boolean {
  const m = mesaj.trim().toLowerCase();
  const key = tetikleyiciNormalize(tetikleyici);
  if (!key || m.startsWith("/ata") || ATAMA_KOMUTLARI.has(m) || /^\/atasil(\s|$)/i.test(m)) return false;
  return m === key || m === `/${key}`;
}

export async function kisayollariYukle(groupId: string): Promise<SohbetKisayolu[]> {
  const { data, error } = await supabase
    .from("group_chat_shortcuts")
    .select(
      "id, group_id, trigger_key, response_body, response_attachment_type, response_attachment_path, response_attachment_name, response_attachment_mime, created_by, updated_at"
    )
    .eq("group_id", groupId)
    .order("trigger_key", { ascending: true });
  if (error) {
    if (__DEV__) console.warn("[kisayol] yukle:", error.message);
    return [];
  }
  return (data ?? []) as SohbetKisayolu[];
}

export type KisayolKayitGirdi = {
  tetikleyici: string;
  yanitMetin: string;
  ek?: {
    tur: SohbetEkTuru;
    path: string;
    ad: string;
    mime: string;
  };
};

export async function kisayolKaydet(
  groupId: string,
  profileId: string,
  girdi: KisayolKayitGirdi
): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  const key = tetikleyiciNormalize(girdi.tetikleyici);
  if (!key || key.length > 40) {
    return { ok: false, mesaj: "Tetikleyici 1–40 karakter olmalı (ör. furkan)." };
  }
  const metin = girdi.yanitMetin.trim();
  if (!metin && !girdi.ek?.path) {
    return { ok: false, mesaj: "Yanıt metni veya ek (fotoğraf/dosya) gerekli." };
  }

  const satir = {
    group_id: groupId,
    trigger_key: key,
    response_body: metin,
    response_attachment_type: girdi.ek?.tur ?? null,
    response_attachment_path: girdi.ek?.path ?? null,
    response_attachment_name: girdi.ek?.ad ?? null,
    response_attachment_mime: girdi.ek?.mime ?? null,
    created_by: profileId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("group_chat_shortcuts").upsert(satir, {
    onConflict: "group_id,trigger_key",
  });
  if (error) return { ok: false, mesaj: error.message };
  return { ok: true };
}

export async function kisayolSil(shortcutId: string): Promise<boolean> {
  const { error } = await supabase.from("group_chat_shortcuts").delete().eq("id", shortcutId);
  return !error;
}

export async function kisayolSilTetikleyici(
  groupId: string,
  tetikleyici: string
): Promise<{ ok: true; silinen: string } | { ok: false; mesaj: string }> {
  const key = tetikleyiciNormalize(tetikleyici);
  if (!key) return { ok: false, mesaj: "Silinecek isim belirtin. Örnek: /atasil erik" };

  const { data: kayit, error: bulHata } = await supabase
    .from("group_chat_shortcuts")
    .select("id, response_attachment_path")
    .eq("group_id", groupId)
    .eq("trigger_key", key)
    .maybeSingle();

  if (bulHata) return { ok: false, mesaj: bulHata.message };
  if (!kayit) return { ok: false, mesaj: `«${key}» için kayıtlı atama bulunamadı.` };

  const ekYolu = (kayit as { response_attachment_path?: string | null }).response_attachment_path;
  if (ekYolu?.trim()) {
    await supabase.storage.from(SOHBET_EK_BUCKET).remove([ekYolu.trim()]);
  }

  const { error } = await supabase
    .from("group_chat_shortcuts")
    .delete()
    .eq("group_id", groupId)
    .eq("trigger_key", key);

  if (error) return { ok: false, mesaj: error.message };
  return { ok: true, silinen: key };
}

export function eslesenKisayolBul(mesaj: string, liste: SohbetKisayolu[]): SohbetKisayolu | null {
  for (const k of liste) {
    if (mesajTetiklerMi(mesaj, k.trigger_key)) return k;
  }
  return null;
}
