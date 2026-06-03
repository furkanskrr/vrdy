import type { ReactNode } from "react";
import { useMemo } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";

/** Tasarım referans genişliği (iPhone 14 / standart) */
const REF_GENISLIK = 390;

/**
 * Geniş iPhone (12/13/15 Pro Max) ve mobil web PWA’da içeriği orantılı küçültür;
 * taşma ve “her şey dev” hissi azalır.
 */
function hesaplaOlcek(genislik: number): number {
  if (genislik >= 414) return REF_GENISLIK / genislik;
  if (genislik < 360) return Math.max(0.9, genislik / REF_GENISLIK);
  return 1;
}

type Props = { children: ReactNode };

export function ResponsiveRoot({ children }: Props) {
  const { width, height } = useWindowDimensions();

  const olcek = useMemo(() => {
    if (Platform.OS === "web" || Platform.OS === "ios") {
      return hesaplaOlcek(width);
    }
    return 1;
  }, [width]);

  if (olcek >= 0.995) {
    return <View style={styles.doldur}>{children}</View>;
  }

  const icStil = {
    flex: 1 as const,
    width: width / olcek,
    transform: [{ scale: olcek }],
    ...(Platform.OS === "web"
      ? ({ transformOrigin: "top left" } as const)
      : null),
  };

  return (
    <View style={styles.doldur}>
      <View style={icStil}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  doldur: { flex: 1 },
});
