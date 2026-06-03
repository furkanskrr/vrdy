import type { ReactNode } from "react";
import { Platform, PixelRatio, StyleSheet, useWindowDimensions, View } from "react-native";

type Props = { children: ReactNode };

/**
 * iOS Dynamic Type / büyük erişilebilirlik yazısı tüm UI’yi büyütür.
 * defaultProps tek başına yetmediği için görünümü 1/fontScale ile sıkıştırır.
 */
export function UiScaleRoot({ children }: Props) {
  const { width, height } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  if (Platform.OS !== "ios" || fontScale <= 1.02) {
    return <>{children}</>;
  }

  const scale = 1 / fontScale;

  return (
    <View style={styles.clip}>
      <View
        style={[
          styles.scaled,
          {
            width: width * fontScale,
            height: height * fontScale,
            transform: [{ scale }],
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    overflow: "hidden",
  },
  scaled: {
    flex: 1,
  },
});
