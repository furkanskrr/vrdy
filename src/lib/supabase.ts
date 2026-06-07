import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Eksik .env / EAS env: oturum istekleri takılabilir; AuthContext bunu kontrol eder. */
export const isSupabaseConfigured =
  supabaseUrl.startsWith("http") && supabaseAnonKey.length > 10;

/** AsyncStorage’da eski/bozuk refresh token varken getSession / yenileme bu hata verir; sessizce temizlenmeli */
export function authHatasiGecersizRefreshToken(hata: { message?: string } | null | undefined): boolean {
  if (!hata?.message) return false;
  const m = hata.message.toLowerCase();
  return (
    m.includes("refresh token") &&
    (m.includes("invalid") || m.includes("not found") || m.includes("already used"))
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://example.invalid",
  isSupabaseConfigured ? supabaseAnonKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
  }
);

function oturumYenilemeyiBaslat() {
  supabase.auth.startAutoRefresh();
}

function oturumYenilemeyiDurdur() {
  supabase.auth.stopAutoRefresh();
}

// Arka plandan dönünce oturumu taze tut
if (isSupabaseConfigured) {
  if (Platform.OS !== "web") {
    if (AppState.currentState === "active") oturumYenilemeyiBaslat();
    AppState.addEventListener("change", (state) => {
      if (state === "active") oturumYenilemeyiBaslat();
      else oturumYenilemeyiDurdur();
    });
  } else if (typeof document !== "undefined") {
    oturumYenilemeyiBaslat();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        oturumYenilemeyiBaslat();
        void supabase.auth.getSession();
      } else {
        oturumYenilemeyiDurdur();
      }
    });
  }
}
