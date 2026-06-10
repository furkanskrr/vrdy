import { AppState, Platform } from "react-native";
import {
  cacheDirectory,
  copyAsync,
  readAsStringAsync,
  EncodingType,
} from "expo-file-system/legacy";
import { supabase } from "./supabase";

export const SOHBET_EK_BUCKET = "group-chat";
export const SOHBET_EK_MAX_BYTES = 10 * 1024 * 1024;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type SohbetEkTuru = "image" | "file";

export type SohbetEkTaslak = {
  uri: string;
  tur: SohbetEkTuru;
  ad: string;
  mime: string;
  boyut?: number;
  /** Web: seçilen dosyanın kendisi (blob URL yerine) */
  webDosya?: Blob;
};

const IMZA_SURE_SN = 60 * 60 * 24 * 7;

type RnFormDosya = { uri: string; name: string; type: string };

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

function uriNormalize(uri: string): string {
  const u = uri.trim();
  if (Platform.OS === "ios" && u.startsWith("/") && !u.startsWith("file://")) {
    return `file://${u}`;
  }
  if (
    Platform.OS === "android" &&
    u.startsWith("/") &&
    !u.startsWith("file://") &&
    !u.startsWith("content://")
  ) {
    return `file://${u}`;
  }
  return u;
}

function mimeNormalize(mime: string, tur: SohbetEkTuru, ad: string): string {
  const m = mime?.trim().toLowerCase();
  if (m && m !== "application/octet-stream") return m;
  const ext = (ad.split(".").pop() ?? "").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain";
  if (tur === "image" || ["jpg", "jpeg", "heic", "heif"].includes(ext)) return "image/jpeg";
  return "application/octet-stream";
}

function base64ArrayBufferYap(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

/** Seçilen dosyayı önbelleğe kopyala — picker dönüşünde kararlı file:// yolu */
export async function sohbetEkUriHazirla(uri: string, ad: string): Promise<string> {
  const kaynak = uriNormalize(uri);
  if (Platform.OS === "web" || !cacheDirectory) return kaynak;
  if (kaynak.startsWith("file://") && kaynak.includes("/Cache/")) return kaynak;

  const ext = (ad.split(".").pop() ?? "bin").slice(0, 8);
  const hedef = `${cacheDirectory}sohbet-ek-${Date.now()}.${ext}`;
  try {
    await copyAsync({ from: kaynak, to: hedef });
    return hedef;
  } catch {
    return kaynak;
  }
}

async function agAktifBekle(): Promise<void> {
  if (Platform.OS === "web") return;
  if (AppState.currentState !== "active") {
    await new Promise<void>((resolve) => {
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          sub.remove();
          resolve();
        }
      });
    });
  }
  await bekle(Platform.OS === "ios" ? 450 : 280);
}

async function oturumTazele(): Promise<string> {
  const { data: refresh, error: refreshErr } = await supabase.auth.refreshSession();
  if (!refreshErr && refresh.session?.access_token) return refresh.session.access_token;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Oturum bulunamadı. Çıkış yapıp tekrar giriş yapın.");
  }
  return data.session.access_token;
}

/** React Native: base64 → ArrayBuffer (Supabase önerisi; Blob kullanılmaz) */
async function nativeDosyaOku(uri: string, ad: string): Promise<ArrayBuffer> {
  const hazir = await sohbetEkUriHazirla(uri, ad);
  let sonHata = "Dosya okunamadı";

  for (let deneme = 0; deneme < 5; deneme++) {
    try {
      const base64 = await readAsStringAsync(hazir, { encoding: EncodingType.Base64 });
      if (base64?.length) {
        const buf = base64ArrayBufferYap(base64);
        if (buf.byteLength === 0) throw new Error("Dosya boş");
        return buf;
      }
    } catch (e) {
      sonHata = e instanceof Error ? e.message : sonHata;
    }
    await bekle(300 * (deneme + 1));
  }

  throw new Error(`${sonHata}. Tekrar seçin.`);
}

async function storageSdkYukle(
  path: string,
  govde: ArrayBuffer | Blob,
  mime: string
): Promise<string | null> {
  const { error } = await supabase.storage.from(SOHBET_EK_BUCKET).upload(path, govde, {
    contentType: mime,
    upsert: false,
    cacheControl: "3600",
  });
  return error?.message ?? null;
}

/** RN yedek: dosya URI ile multipart (Blob oluşturmadan) */
async function storageNativeUriYukle(
  path: string,
  fileUri: string,
  ad: string,
  mime: string,
  token: string
): Promise<string | null> {
  if (!SUPABASE_URL.startsWith("http") || !SUPABASE_ANON) {
    return "Sunucu yapılandırması eksik";
  }

  const encoded = path.split("/").map((p) => encodeURIComponent(p)).join("/");
  const url = `${SUPABASE_URL}/storage/v1/object/${SOHBET_EK_BUCKET}/${encoded}`;
  const parca: RnFormDosya = { uri: fileUri, name: ad, type: mime };

  try {
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", parca as unknown as Blob);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON,
        "x-upsert": "false",
      },
      body: form,
    });
    if (res.ok) return null;
    const metin = await res.text().catch(() => "");
    return metin || `HTTP ${res.status}`;
  } catch (e) {
    return e instanceof Error ? e.message : "Network request failed";
  }
}

async function webYuklemeGovdesi(taslak: SohbetEkTaslak): Promise<{ blob: Blob; buf: ArrayBuffer }> {
  if (!taslak.webDosya || taslak.webDosya.size === 0) {
    throw new Error("Dosya seçilemedi. Tekrar deneyin.");
  }
  const blob = taslak.webDosya;
  const buf = await blob.arrayBuffer();
  if (buf.byteLength === 0) throw new Error("Dosya boş veya okunamadı.");
  return { blob, buf };
}

async function storageWebRawYukle(
  path: string,
  buf: ArrayBuffer,
  mime: string,
  token: string
): Promise<string | null> {
  if (!SUPABASE_URL.startsWith("http") || !SUPABASE_ANON) {
    return "Sunucu yapılandırması eksik";
  }

  const encoded = path.split("/").map((p) => encodeURIComponent(p)).join("/");
  const url = `${SUPABASE_URL}/storage/v1/object/${SOHBET_EK_BUCKET}/${encoded}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON,
        "Content-Type": mime,
        "x-upsert": "false",
        "cache-control": "max-age=3600",
      },
      body: buf,
    });
    if (res.ok) return null;
    const metin = await res.text().catch(() => "");
    return metin || `HTTP ${res.status}`;
  } catch (e) {
    return e instanceof Error ? e.message : "Network request failed";
  }
}

async function nativeEkiYukle(
  path: string,
  taslak: SohbetEkTaslak,
  ad: string,
  mime: string
): Promise<void> {
  const hazirUri = await sohbetEkUriHazirla(taslak.uri, ad);
  let sonHata = "Yükleme başarısız";

  for (let deneme = 0; deneme < 5; deneme++) {
    if (deneme > 0) await bekle(500 * deneme);

    let token: string;
    try {
      token = await oturumTazele();
    } catch (e) {
      throw e instanceof Error ? e : new Error("Oturum hatası");
    }

    try {
      const buf = await nativeDosyaOku(hazirUri, ad);
      if (buf.byteLength > SOHBET_EK_MAX_BYTES) {
        throw new Error("Dosya en fazla 10 MB olabilir");
      }
      const sdkHata = await storageSdkYukle(path, buf, mime);
      if (!sdkHata) return;
      sonHata = sdkHata;
    } catch (e) {
      sonHata = e instanceof Error ? e.message : sonHata;
      if (sonHata.includes("10 MB")) throw e;
    }

    const uriHata = await storageNativeUriYukle(path, hazirUri, ad, mime, token);
    if (!uriHata) return;
    sonHata = uriHata;

    const ag = /network|failed|timeout|fetch|abort|503|502|504|econn/i.test(sonHata);
    if (!ag && deneme >= 2) break;
  }

  throw new Error(sonHata);
}

async function webEkiYukle(path: string, taslak: SohbetEkTaslak, ad: string, mime: string): Promise<void> {
  const { blob, buf } = await webYuklemeGovdesi(taslak);
  if (buf.byteLength > SOHBET_EK_MAX_BYTES) throw new Error("Dosya en fazla 10 MB olabilir");

  let sonHata = "Yükleme başarısız";
  for (let deneme = 0; deneme < 4; deneme++) {
    if (deneme > 0) await bekle(400 * deneme);

    let token: string;
    try {
      token = await oturumTazele();
    } catch (e) {
      throw e instanceof Error ? e : new Error("Oturum hatası");
    }

    const sdkBlobHata = await storageSdkYukle(path, blob, mime);
    if (!sdkBlobHata) return;

    const sdkBufHata = await storageSdkYukle(path, buf, mime);
    if (!sdkBufHata) return;

    const restHata = await storageWebRawYukle(path, buf, mime, token);
    if (!restHata) return;

    sonHata = restHata || sdkBufHata || sdkBlobHata;
    const ag = /network|failed|timeout|fetch|abort|503|502|504/i.test(sonHata);
    if (!ag && deneme >= 1) break;
  }

  throw new Error(sonHata);
}

export async function sohbetEkiYukle(
  groupId: string,
  profileId: string,
  taslak: SohbetEkTaslak
): Promise<{ path: string; tur: SohbetEkTuru; ad: string; mime: string }> {
  if (taslak.boyut && taslak.boyut > SOHBET_EK_MAX_BYTES) {
    throw new Error("Dosya en fazla 10 MB olabilir");
  }

  await agAktifBekle();

  const ad = guvenliDosyaAdi(taslak.ad);
  const path = sohbetEkYolu(groupId, profileId, ad);
  const mime = mimeNormalize(taslak.mime, taslak.tur, ad);

  if (Platform.OS === "web") {
    await webEkiYukle(path, taslak, ad, mime);
  } else {
    await nativeEkiYukle(path, taslak, ad, mime);
  }

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

export function sohbetEkAc(url: string): void {
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  import("expo-linking").then((Linking) => {
    void Linking.openURL(url);
  });
}

/** Web blob URL sızıntısını önle */
export function sohbetEkTaslakSerbestBirak(taslak: SohbetEkTaslak | null): void {
  if (Platform.OS !== "web" || !taslak?.uri.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(taslak.uri);
  } catch {
    /* yoksay */
  }
}
