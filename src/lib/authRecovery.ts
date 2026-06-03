import * as Linking from "expo-linking";
import { isSupabaseConfigured, supabase } from "./supabase";

/** Supabase → Authentication → URL Configuration → Redirect URLs listesine ekleyin. */
export function sifirlamaYonlendirmeUri(): string {
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL?.trim().replace(/\/$/, "");
  if (webUrl) return `${webUrl}/reset-password`;
  return Linking.createURL("reset-password");
}

/**
 * Şifre sıfırlama (OTP veya link) kayıtlı e-postaya gönderilir.
 *
 * Dashboard:
 * - Redirect URLs: `sifirlamaYonlendirmeUri()` çıktısı (ör. vrdy://... veya exp://...).
 * - Email Templates → Reset password: metinde `{{ .Token }}` (6 haneli kod) olsun; yalnızca kod kullanacaksanız
 *   bağlantı satırını kaldırabilir veya ikisini birlikte bırakabilirsiniz.
 */
export async function sifreSifirlamaEpostaGonder(eposta: string): Promise<string | null> {
  if (!isSupabaseConfigured) return "Sunucu yapılandırması eksik.";
  const email = eposta.trim().toLowerCase();
  if (!email || !email.includes("@")) return "Geçerli bir e-posta adresi girin.";

  const redirectTo = sifirlamaYonlendirmeUri();
  if (__DEV__) {
    console.warn(
      "[auth] Şifre sıfırlama redirectTo (Supabase Redirect URLs’e ekleyin):",
      redirectTo,
    );
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return error?.message ?? null;
}

/** Boşluk/tire kaldırır; kullanıcı "123 456" yapıştırabilsin. */
function sifirlamaKoduNormalize(kod: string): string {
  return kod.trim().replace(/[\s-]+/g, "");
}

/**
 * E-postadaki OTP veya (bağlantıdan kopyalanmış) token hash ile doğrular.
 * Supabase varsayılanı genelde 6 haneli rakam; bazı şablonlar/ayarlar farklı uzunluk verebilir.
 */
export async function sifreSifirlamaKoduDogrula(eposta: string, kod: string): Promise<string | null> {
  if (!isSupabaseConfigured) return "Sunucu yapılandırması eksik.";
  const email = eposta.trim().toLowerCase();
  if (!email || !email.includes("@")) return "Geçerli bir e-posta adresi girin.";

  const compact = sifirlamaKoduNormalize(kod);
  if (!compact) return "E-postadaki kodu girin.";

  // Uzun hex: sıfırlama bağlantısındaki token (TokenHash) yapıştırıldıysa
  if (/^[a-f0-9]{16,}$/i.test(compact)) {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: compact,
    });
    return error?.message ?? null;
  }

  // Rakam kodu: 6–10 hane (8 hane vb. için tolerans)
  if (!/^\d+$/.test(compact)) {
    return "Kod yalnızca rakamlardan oluşmalı veya e-postadaki tam metni yapıştırın.";
  }
  if (compact.length < 6) return "Kod en az 6 rakam olmalıdır.";
  if (compact.length > 10) return "Kod çok uzun; e-postadaki OTP’yi kontrol edin.";

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: compact,
    type: "recovery",
  });
  return error?.message ?? null;
}
