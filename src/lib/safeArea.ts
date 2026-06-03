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
export function altSekmeEkranBoslugu(_insetsBottom: number): number {
  /** Alt sekme zaten güvenli alanı kaplar; composer altında ekstra boşluk ekleme */
  if (Platform.OS === "web") return 0;
  if (Platform.OS === "android") return 0;
  return 4;
}
