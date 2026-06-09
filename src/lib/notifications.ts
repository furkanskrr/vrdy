import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { isSupabaseConfigured, supabase } from "./supabase";

/** Expo Go (storeClient): SDK 53+ uzaktan push yok; modülü yüklemeyelim — terminal ERROR/WARN olmasın */
const expoGo =
  Constants.executionEnvironment === "storeClient";

let Notifications: typeof import("expo-notifications") | null = null;
if (!expoGo) {
  try {
    const mod = require("expo-notifications") as typeof import("expo-notifications");
    Notifications = mod;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    Notifications = null;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function gecerliEasProjectId(id: string | undefined | null): id is string {
  return typeof id === "string" && UUID_RE.test(id.trim());
}

/** Kullanıcı özel ön-ekranı "atla" dediğinde; bir daha ön-ekran göstermemek için */
export const PUSH_PROMPT_SKIP_STORAGE_KEY = "vrdy_push_prompt_skip";

/** İlk çağrıda Android kanalını ayarlar (uygulama açılışında isteğe bağlı) */
export async function configureNotificationChannel(): Promise<void> {
  if (!Notifications || Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Vardiya",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#3B82F6",
  });
}

async function fetchExpoPushTokenOrNull(): Promise<string | null> {
  if (!Notifications) return null;

  const extraPid = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const easPid = Constants.easConfig?.projectId as string | undefined;
  const projectId = gecerliEasProjectId(extraPid)
    ? extraPid.trim()
    : gecerliEasProjectId(easPid)
      ? easPid.trim()
      : undefined;

  try {
    const { data } = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return data ?? null;
  } catch (e) {
    if (__DEV__) {
      console.warn("[push] token alinamadi:", e);
      if (!projectId) {
        console.warn(
          "[push] Gecerli EAS projectId yok. expo.dev → proje → Project ID'yi app.json extra.eas.projectId olarak ekleyin; Android push icin development build kullanin (Expo Go SDK 53+ ile uzaktan push yok)."
        );
      }
    }
    return null;
  }
}

export type PushSetupProbe =
  | { available: false }
  | { available: true; status: "granted"; token: string | null }
  | { available: true; status: "denied" }
  | { available: true; status: "undetermined" };

/**
 * Ayarlar’daki “push’u aç” satırı: uzak push mümkünken tam hazır değilse true.
 * İzin verilmiş ve Expo push token alınabiliyorsa false (bu ekranda gösterme).
 */
export function shouldOfferPushEnableInSettings(probe: PushSetupProbe): boolean {
  if (!probe.available) return false;
  if (probe.status === "granted" && probe.token) return false;
  return true;
}

/** Sistem izin penceresini açmadan mevcut durumu ve (izin varsa) token'ı okur */
export async function probePushSetup(): Promise<PushSetupProbe> {
  if (!Notifications || !Device.isDevice) return { available: false };
  await configureNotificationChannel();
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") {
    const token = await fetchExpoPushTokenOrNull();
    return { available: true, status: "granted", token };
  }
  if (status === "undetermined") return { available: true, status: "undetermined" };
  return { available: true, status: "denied" };
}

/** Sistem izin diyaloğunu gösterir; izin verilirse push token döner */
export async function requestPushPermissionAndFetchToken(): Promise<string | null> {
  if (!Notifications || !Device.isDevice) return null;
  await configureNotificationChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  return fetchExpoPushTokenOrNull();
}

/** Doğrudan sistem izni + token (ayarlar / programatik çağrılar için) */
export async function registerForPushNotifications(): Promise<string | null> {
  return requestPushPermissionAndFetchToken();
}

export async function savePushToken(token: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("profiles").update({ expo_push_token: token }).eq("id", user.id);
  if (error) {
    if (__DEV__) console.warn("[push] Token kaydedilemedi (RLS / ağ):", error.message);
    return false;
  }
  return true;
}

export type PushDurumOzeti = {
  destekleniyor: boolean;
  izin: "granted" | "denied" | "undetermined" | "yok";
  tokenAlindi: boolean;
  sunucudaKayitli: boolean;
  aciklama: string;
};

/** Ayarlar ekranında push durumu göstermek için */
export async function pushDurumOzetiOku(): Promise<PushDurumOzeti> {
  if (Platform.OS === "web") {
    return {
      destekleniyor: false,
      izin: "yok",
      tokenAlindi: false,
      sunucudaKayitli: false,
      aciklama: "Tarayıcı / PWA sürümünde telefon bildirimi (push) desteklenmiyor. Android APK veya App Store uygulaması gerekir.",
    };
  }
  const probe = await probePushSetup();
  if (!probe.available) {
    return {
      destekleniyor: false,
      izin: "yok",
      tokenAlindi: false,
      sunucudaKayitli: false,
      aciklama: "Bu kurulumda push kullanılamıyor (emülatör veya Expo Go olabilir).",
    };
  }
  if (probe.status === "denied") {
    return {
      destekleniyor: true,
      izin: "denied",
      tokenAlindi: false,
      sunucudaKayitli: false,
      aciklama: "Bildirim izni kapalı. Telefon ayarlarından Vardiyam için bildirimleri açın.",
    };
  }
  if (probe.status === "undetermined") {
    return {
      destekleniyor: true,
      izin: "undetermined",
      tokenAlindi: false,
      sunucudaKayitli: false,
      aciklama: "Henüz izin verilmedi. Aşağıdan «Bildirimleri aç» ile etkinleştirin.",
    };
  }
  const token = probe.token;
  if (!token) {
    return {
      destekleniyor: true,
      izin: "granted",
      tokenAlindi: false,
      sunucudaKayitli: false,
      aciklama:
        "İzin var ama push anahtarı alınamadı. Yeni bir APK kurun; Expo projesinde FCM/APNs ayarlarını kontrol edin.",
    };
  }
  let sunucudaKayitli = false;
  if (isSupabaseConfigured) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("expo_push_token")
        .eq("id", user.id)
        .maybeSingle();
      sunucudaKayitli = prof?.expo_push_token === token;
    }
  }
  return {
    destekleniyor: true,
    izin: "granted",
    tokenAlindi: true,
    sunucudaKayitli,
    aciklama: sunucudaKayitli
      ? "Push aktif. Vardiya ve izin değişikliklerinde ekip bildirimi gönderilir."
      : "Push anahtarı alındı; sunucuya kayıt bekleniyor. «Yenile» ile tekrar deneyin.",
  };
}

type ExpoPushTicket = { status: "ok"; id?: string } | { status: "error"; message?: string; details?: unknown };

type PushMesaj = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  /** Android alıcılar için zorunlu; gönderenin platformundan bağımsız her zaman verilmeli */
  channelId: "default";
};

/** Ayarlar / teşhis: son push gönderim hatası (varsa) */
let sonPushHata: string | null = null;

export function sonPushHataOku(): string | null {
  return sonPushHata;
}

async function expoPushGonder(messages: PushMesaj[]): Promise<boolean> {
  if (messages.length === 0) return true;
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    const json = (await res.json()) as { data?: ExpoPushTicket[]; errors?: unknown };
    if (!res.ok) {
      sonPushHata = `Expo API HTTP ${res.status}`;
      if (__DEV__) console.warn("[push] expo http:", res.status, json);
      return false;
    }
    const hatalar = (json?.data ?? []).filter(
      (t): t is Extract<ExpoPushTicket, { status: "error" }> => t.status === "error"
    );
    if (hatalar.length) {
      sonPushHata = hatalar.map((h) => h.message ?? "bilinmeyen").join("; ");
      if (__DEV__) console.warn("[push] expo yanit:", hatalar);
      return false;
    }
    sonPushHata = null;
    return true;
  } catch (e) {
    sonPushHata = e instanceof Error ? e.message : "Ağ hatası";
    if (__DEV__) console.warn("[push] expo fetch:", e);
    return false;
  }
}

/** RPC yoksa veya hata verirse aynı gruptaki profillerden token okur (RLS) */
async function grupPushTokenlariAl(
  groupId: string,
  profileIds?: string[]
): Promise<string[]> {
  let sorgu = supabase
    .from("profiles")
    .select("expo_push_token")
    .eq("group_id", groupId)
    .not("expo_push_token", "is", null);

  if (profileIds?.length) {
    sorgu = sorgu.in("id", profileIds);
  }

  const { data, error } = await sorgu;
  if (error) {
    if (__DEV__) console.warn("[push] profil token sorgusu:", error.message);
    return [];
  }
  return (data ?? [])
    .map((r) => (r.expo_push_token as string | null)?.trim())
    .filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));
}

async function pushTokenlariCoz(
  groupId: string,
  profileIds?: string[]
): Promise<string[]> {
  const rpcAdi = profileIds?.length ? "get_push_tokens_for_profiles" : "get_group_push_tokens";
  const rpcArgs = profileIds?.length
    ? { p_group_id: groupId, p_profile_ids: profileIds }
    : { p_group_id: groupId };

  const { data: tokens, error: rpcErr } = await supabase.rpc(rpcAdi, rpcArgs);

  if (!rpcErr && tokens && Array.isArray(tokens) && tokens.length > 0) {
    return (tokens as { token: string }[])
      .map((t) => t.token?.trim())
      .filter((t): t is string => !!t);
  }

  if (rpcErr && __DEV__) {
    console.warn(`[push] RPC ${rpcAdi} yedek sorguya geciliyor:`, rpcErr.message);
  }

  return grupPushTokenlariAl(groupId, profileIds);
}

function pushMesajlariHazirla(
  tokenlar: string[],
  kendiToken: string | null,
  title: string,
  body: string
): PushMesaj[] {
  return tokenlar
    .filter(Boolean)
    .filter((t) => t !== kendiToken)
    .map((to) => ({
      to,
      sound: "default" as const,
      title,
      body,
      channelId: "default" as const,
    }));
}

export async function sendPushToProfiles(
  groupId: string,
  profileIds: string[],
  title: string,
  body: string,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const ids = [...new Set(profileIds.filter(Boolean))];
    if (ids.length === 0) return false;

    const tokenlar = await pushTokenlariCoz(groupId, ids);
    if (tokenlar.length === 0) return false;

    const { data: { user } } = await supabase.auth.getUser();
    let kendiToken: string | null = null;
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("expo_push_token")
        .eq("id", user.id)
        .maybeSingle();
      kendiToken = prof?.expo_push_token ?? null;
    }

    const messages = pushMesajlariHazirla(tokenlar, kendiToken, title, body);
    return expoPushGonder(messages);
  } catch (e) {
    if (__DEV__) console.warn("[push] gonderim profiles:", e);
    return false;
  }
}

export async function sendPushToGroup(
  groupId: string,
  title: string,
  body: string,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const tokenlar = await pushTokenlariCoz(groupId);
    if (tokenlar.length === 0) return false;

    const { data: { user } } = await supabase.auth.getUser();
    let kendiToken: string | null = null;
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("expo_push_token")
        .eq("id", user.id)
        .maybeSingle();
      kendiToken = prof?.expo_push_token ?? null;
    }

    const messages = pushMesajlariHazirla(tokenlar, kendiToken, title, body);
    if (messages.length === 0) return false;

    return expoPushGonder(messages);
  } catch (e) {
    if (__DEV__) console.warn("[push] gonderim:", e);
    return false;
  }
}

/** Ayarlar: kendi cihazına test bildirimi */
export async function pushTestBildirimiGonder(): Promise<{ ok: boolean; mesaj: string }> {
  const probe = await probePushSetup();
  if (!probe.available) {
    return { ok: false, mesaj: "Bu kurulumda push desteklenmiyor (emülatör / Expo Go / tarayıcı)." };
  }
  if (probe.status !== "granted" || !probe.token) {
    return { ok: false, mesaj: "Önce bildirim iznini verin ve push anahtarının alındığından emin olun." };
  }
  const ok = await expoPushGonder([
    {
      to: probe.token,
      sound: "default",
      title: "Vardiyam?",
      body: "Test bildirimi başarılı — ekip bildirimleri bu kanaldan gelir.",
      channelId: "default",
    },
  ]);
  if (ok) return { ok: true, mesaj: "Test bildirimi gönderildi. Birkaç saniye içinde görünmeli." };
  return { ok: false, mesaj: sonPushHata ?? "Expo push servisi yanıt vermedi. FCM/APNs ayarlarını kontrol edin." };
}
