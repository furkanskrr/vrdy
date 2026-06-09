import { Platform } from "react-native";
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

async function uriBlobAl(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error("Dosya okunamadı");
  return res.blob();
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
  const blob = await uriBlobAl(taslak.uri);
  if (blob.size > SOHBET_EK_MAX_BYTES) {
    throw new Error("Dosya en fazla 10 MB olabilir");
  }
  const { error } = await supabase.storage.from(SOHBET_EK_BUCKET).upload(path, blob, {
    contentType: taslak.mime || (taslak.tur === "image" ? "image/jpeg" : "application/octet-stream"),
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path, tur: taslak.tur, ad, mime: taslak.mime };
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

/** Sohbet önizlemesi: imzalı URL, olmazsa oturumlu indirme */
export async function sohbetEkGoruntulemeUrl(path: string): Promise<string | null> {
  const temiz = path?.trim();
  if (!temiz) return null;

  const imza = await sohbetEkImzaliUrl(temiz);
  if (imza) return imza;

  const { data, error } = await supabase.storage.from(SOHBET_EK_BUCKET).download(temiz);
  if (error || !data) {
    if (__DEV__) console.warn("[sohbet-ek] indirme:", error?.message);
    return null;
  }

  if (Platform.OS === "web") {
    return URL.createObjectURL(data);
  }

  try {
    return await blobDataUri(data);
  } catch (e) {
    if (__DEV__) console.warn("[sohbet-ek] data uri:", e);
    return null;
  }
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
