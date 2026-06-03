import { Platform, StatusBar } from "react-native";

/**
 * Üst bar / geri tuşu için güvenli dikey boşluk.
 * Android'de SafeAreaProvider üst inset 0 döndüğünde içerik durum çubuğunun altında kalmalı.
 * Web PWA (standalone): viewport-fit=cover ile safe-area inset kullanılır; ekstra boşluk azaltılır.
 */
export function ustEkranBoslugu(safeAreaTop: number, ekstra: number = 12): number {
  const androidStatus = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
  const webEkstra = Platform.OS === "web" ? Math.min(ekstra, 6) : ekstra;
  return Math.max(safeAreaTop, androidStatus) + webEkstra;
}

/**
 * Alt sekme çubuğu olan ekranlarda (Sohbet vb.) composer alt boşluğu.
 * Tab bar zaten home indicator alanını kaplar; insets.bottom eklenirse çift boşluk oluşur.
 */
export function altSekmeEkranBoslugu(insetsBottom: number): number {
  /** Tab bar zaten home indicator’ı kaplar; web PWA’da insets.bottom çift boşluk yapar */
  if (Platform.OS === "web") return 4;
  return 8;
}
