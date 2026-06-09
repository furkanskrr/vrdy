import { Platform } from "react-native";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import { supabase } from "./supabase";

export const SOHBET_EK_BUCKET = "group-chat";
export const SOHBET_EK_MAX_BYTES = 10 * 1024 * 1024;

export type SohbetEkTuru = "image" | "file";

export type SohbetEkTaslak = {
  uri: string;
  tur: SohbetEkTuru;
  ad: string;
  mime: string;
  boyut?: number;
  /** Web: blob URL yerine doğrudan dosya (daha güvenilir yükleme) */
  webDosya?: Blob;
};

const IMZA_SURE_SN = 60 * 60 * 24 * 7;

function guvenliDosyaAdi(ad: string): string {
  const temiz = ad.replace(/[^\w.\-()+ ]/g, "_").trim() || "dosya";
  return temiz.slice(0, 120);
}

export function sohbetEkYolu(groupId: string, profileId: string, dosyaAdi: string): string {
  const ext = dosyaAdi.includes(".") ? dosyaAdi.split(".").pop() : "bin";
  const benzersiz = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${groupId}/${profileId}/${benzersiz}.${ext}`;
}

function bekle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function base64BlobYap(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function uriBlobAl(uri: string, mime: string, webDosya?: Blob): Promise<Blob> {
  if (webDosya && webDosya.size > 0) return webDosya;

  if (Platform.OS === "web") {
    for (let deneme = 0; deneme < 3; deneme++) {
      try {
        const res = await fetch(uri);
        if (res.ok) return res.blob();
      } catch {
        /* tekrar dene */
      }
      await bekle(120 * (deneme + 1));
    }
    throw new Error("Dosya okunamadı. Fotoğrafı tekrar seçin.");
  }

  try {
    const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
    if (base64) return base64BlobYap(base64, mime);
  } catch {
    /* fetch yedeği */
  }

  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      const res = await fetch(uri);
      if (res.ok) return res.blob();
    } catch {
      /* tekrar dene */
    }
    await bekle(150 * (deneme + 1));
  }
  throw new Error("Dosya okunamadı. Fotoğrafı tekrar seçin.");
}

export async function sohbetEkiYukle(
  groupId: string,
  profileId: string,
  taslak: SohbetEkTaslak
): Promise<{ path: string; tur: SohbetEkTuru; ad: string; mime: string }> {
  if (taslak.boyut && taslak.boyut > SOHBET_EK_MAX_BYTES) {
    throw new Error("Dosya en fazla 10 MB olabilir");
  }
  const ad = guvenliDosyaAdi(taslak.ad);
  const path = sohbetEkYolu(groupId, profileId, ad);
  const mime = taslak.mime || (taslak.tur === "image" ? "image/jpeg" : "application/octet-stream");
  const blob = await uriBlobAl(taslak.uri, mime, taslak.webDosya);
  if (blob.size > SOHBET_EK_MAX_BYTES) {
    throw new Error("Dosya en fazla 10 MB olabilir");
  }

  let sonHata = "Yükleme başarısız";
  for (let deneme = 0; deneme < 3; deneme++) {
    const { error } = await supabase.storage.from(SOHBET_EK_BUCKET).upload(path, blob, {
      contentType: mime,
      upsert: false,
    });
    if (!error) return { path, tur: taslak.tur, ad, mime: taslak.mime };
    sonHata = error.message;
    if (!/network|timeout|fetch|503|502/i.test(sonHata) || deneme >= 2) break;
    await bekle(250 * (deneme + 1));
  }
  throw new Error(sonHata);
}

export async function sohbetEkImzaliUrl(path: string): Promise<string | null> {
  if (!path?.trim()) return null;
  const { data, error } = await supabase.storage
    .from(SOHBET_EK_BUCKET)
    .createSignedUrl(path.trim(), IMZA_SURE_SN);
  if (error) {
    if (__DEV__) console.warn("[sohbet-ek] imza:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

function blobDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const sonuc = reader.result;
      if (typeof sonuc === "string") resolve(sonuc);
      else reject(new Error("Okuma başarısız"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Okuma başarısız"));
    reader.readAsDataURL(blob);
  });
}

/** Sohbet önizlemesi: imzalı URL, olmazsa oturumlu indirme (kısa gecikmede tekrar dener) */
export async function sohbetEkGoruntulemeUrl(path: string): Promise<string | null> {
  const temiz = path?.trim();
  if (!temiz) return null;

  for (let deneme = 0; deneme < 4; deneme++) {
    const imza = await sohbetEkImzaliUrl(temiz);
    if (imza) return imza;

    const { data, error } = await supabase.storage.from(SOHBET_EK_BUCKET).download(temiz);
    if (!error && data) {
      if (Platform.OS === "web") {
        return URL.createObjectURL(data);
      }
      try {
        return await blobDataUri(data);
      } catch (e) {
        if (__DEV__) console.warn("[sohbet-ek] data uri:", e);
      }
    } else if (__DEV__) {
      console.warn("[sohbet-ek] indirme:", error?.message);
    }

    if (deneme < 3) await bekle(200 * (deneme + 1));
  }

  return null;
}

/** Web’de dosya indirme / açma */
export function sohbetEkAc(url: string): void {
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  import("expo-linking").then((Linking) => {
    void Linking.openURL(url);
  });
}
