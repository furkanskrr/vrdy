/** Takvim günü (1–31) → 1–30 arası temizlik sırası; ay sonunda döngü mantığıyla tüm mağaza kapsanır. */
export function temizlikSlotuAyinGunu(gun: number): number {
  const g = Math.max(1, Math.min(31, Math.floor(gun)));
  return ((g - 1) % 30) + 1;
}

/** Yerel saat diliminde YYYY-MM-DD */
export function yerelTarihAnahtar(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Bu dosya `npm run sync-temizlik` ile kök `temizlik.txt` üzerinden üretilir.
 * Görevleri değiştirmek için önce `temizlik.txt` düzenleyin, sonra sync komutunu çalıştırın.
 */
export const TEMIZLIK_BOLGELERI: readonly string[] = [
  "ekmek dolapları ve sebze- meyve",
  "atıştırmalık kek -light ürünler",
  "atıştırmalık bisküvi - petibör ürünler",
  "çikolata ve su reyonları",
  "cips ve kuruyemiş reyonları",
  "gazlı içecek reyonları",
  "soda ve meyve suyu reyonları",
  "ekmek dolapları ve sebze- meyve",
  "şarkteri süt ürünleri reyonları",
  "şarküteri et ürünleri reyonları",
  "donuk ürün ve içecek dolabı",
  "kahvaltılık ve kahve reyonları",
  "süt ve cornflakes reyonları",
  "çay ve şeker reyonları",
  "ekmek dolapları ve sebze- meyve",
  "konserve çorba baharat reyonları",
  "bakliyat pirinç makarna reyonları",
  "un ve toz tatlı reyonları",
  "sıvı yağ reyonları",
  "kozmetik hijyen ve kadın reyonları",
  "kozmetik banyo ve saç reyonları",
  "kozmetik ağız ve erkek reyonları",
  "ekmek dolapları ve sebze- meyve",
  "kasa ön ve kasa arkası reyonları",
  "yumuşatıcı ve bulaşık deterjanı reyonları",
  "toz deterjan reyonu",
  "genel temizlik ürnleri reyonları",
  "knf, bebek bezi ve bebek mama reyonları",
  "kağıt reyonları",
  "tm reyonların genel kontrolü",
] as const;

export function temizlikBolgesiMetni(slot: number): string {
  const i = Math.max(1, Math.min(30, Math.floor(slot))) - 1;
  return TEMIZLIK_BOLGELERI[i] ?? `Bölge ${slot}`;
}
