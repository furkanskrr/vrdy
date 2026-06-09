import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

export const ANDROID_APK_DOSYA_ADI = "Vardiyam.apk";

export const ANDROID_APK_VARSAYILAN_URL =
  process.env.EXPO_PUBLIC_ANDROID_APK_URL ?? "https://vrdy.vercel.app/Vardiyam.apk";

export type AppVersionConfig = {
  version: string;
  minVersion?: string;
  releaseNotes?: string;
  androidApkUrl?: string;
  easArtifactUrl?: string;
  webUrl?: string;
  zorunlu?: boolean;
};

export type GuncellemeDurumu =
  | { tur: "guncel" }
  | {
      tur: "guncelleme";
      mevcutSurum: string;
      hedefSurum: string;
      zorunlu: boolean;
      config: AppVersionConfig;
    };

const VARSAYILAN_CONFIG_URL =
  process.env.EXPO_PUBLIC_UPDATE_CONFIG_URL ?? "https://vrdy.vercel.app/app-version.json";

export function mevcutSurum(): string {
  const cfg = Constants.expoConfig?.version?.trim();
  if (cfg) return cfg;
  const manifest = (Constants as { manifest?: { version?: string } }).manifest?.version?.trim();
  if (manifest) return manifest;
  return "1.0.0";
}

/** "1.0.10" > "1.0.2" doğru karşılaştırma */
export function surumKarsilastir(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  const uzun = Math.max(pa.length, pb.length);
  for (let i = 0; i < uzun; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export async function uzakSurumYapilandirmasiGetir(): Promise<AppVersionConfig | null> {
  const url = `${VARSAYILAN_CONFIG_URL}${VARSAYILAN_CONFIG_URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as AppVersionConfig;
    if (!json?.version) return null;
    return json;
  } catch {
    return null;
  }
}

export function guncellemeDurumuHesapla(
  mevcut: string,
  config: AppVersionConfig,
): GuncellemeDurumu {
  const minV = config.minVersion ?? config.version;
  const zorunlu =
    surumKarsilastir(mevcut, minV) < 0 ||
    (config.zorunlu === true && surumKarsilastir(mevcut, config.version) < 0);

  if (surumKarsilastir(mevcut, config.version) >= 0) {
    return { tur: "guncel" };
  }

  return {
    tur: "guncelleme",
    mevcutSurum: mevcut,
    hedefSurum: config.version,
    zorunlu,
    config,
  };
}

export async function guncellemeKontrolEt(): Promise<GuncellemeDurumu> {
  const mevcut = mevcutSurum();
  const config = await uzakSurumYapilandirmasiGetir();
  if (!config) return { tur: "guncel" };
  return guncellemeDurumuHesapla(mevcut, config);
}

export async function webSayfasiniYenile(): Promise<void> {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  window.location.reload();
}

export function androidApkIndirUrl(
  config?: Pick<AppVersionConfig, "androidApkUrl" | "easArtifactUrl">,
): string {
  const eas = config?.easArtifactUrl?.trim();
  if (eas?.includes("expo.dev/artifacts")) return eas;
  const url = config?.androidApkUrl?.trim();
  if (url) return url;
  return ANDROID_APK_VARSAYILAN_URL;
}

export async function androidApkAc(url?: string): Promise<void> {
  const hedef = url?.trim()
    ? androidApkIndirUrl({ androidApkUrl: url })
    : ANDROID_APK_VARSAYILAN_URL;
  if (!hedef) return;
  await Linking.openURL(hedef);
}
