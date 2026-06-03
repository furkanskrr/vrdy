import { Text, TextInput } from "react-native";

/**
 * iOS Erişilebilirlik / büyük yazı tipi tüm arayüzü ölçeklemesin;
 * sohbet ve sekmelerde tutarlı, kompakt görünüm.
 */
export function sabitleMetinOlceklendirme(): void {
  const opts = { allowFontScaling: false, maxFontSizeMultiplier: 1 as const };
  Text.defaultProps = { ...Text.defaultProps, ...opts };
  TextInput.defaultProps = { ...TextInput.defaultProps, ...opts };
}
