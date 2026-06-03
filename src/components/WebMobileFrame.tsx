import type { ReactNode } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";

/** iPhone 12/13/15 Pro Max mantıksal genişlik (pt) */
export const IPHONE_PRO_MAX_GENISLIK = 430;

type Props = { children: ReactNode };

/**
 * Vercel PWA: Pro Max sınıfı telefonlarda içeriği hafifçe daraltıp ortalar;
 * kenar boşlukları ve “dev ekran” hissi azalır.
 */
export function WebMobileFrame({ children }: Props) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  const { width, height } = useWindowDimensions();
  const proMaxSinifi = width >= 390 && width <= 440 && height >= 800;

  if (!proMaxSinifi) {
    return <View style={styles.tamGenislik}>{children}</View>;
  }

  const maxYukseklik = Math.round(height * 0.96);

  return (
    <View style={styles.dis}>
      <View style={[styles.ic, { maxWidth: IPHONE_PRO_MAX_GENISLIK, maxHeight: maxYukseklik }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tamGenislik: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },
  dis: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0e12",
  },
  ic: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    borderRadius: 0,
  },
});
