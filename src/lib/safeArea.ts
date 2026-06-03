import { Platform, StatusBar } from "react-native";

/**
 * Üst bar / geri tuşu için güvenli dikey boşluk.
 * Android'de SafeAreaProvider üst inset 0 döndüğünde içerik durum çubuğunun altında kalmalı.
 * Web PWA (standalone): viewport-fit=cover ile safe-area inset kullanılır; ekstra boşluk azaltılır.
 */
export function ustEkranBoslugu(safeAreaTop: number, ekstra: number = 12): number {
  const androidStatus = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
  const webEkstra = Platform.OS === "web" ? Math.min(ekstra, 8) : ekstra;
  return Math.max(safeAreaTop, androidStatus) + webEkstra;
}
