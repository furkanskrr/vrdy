import { Text, TextInput } from "react-native";

/**
 * iOS Erişilebilirlik / büyük yazı tipi tüm arayüzü ölçeklemesin;
 * sohbet ve sekmelerde tutarlı, kompakt görünüm.
 */
export function sabitleMetinOlceklendirme(): void {
  const opts = { allowFontScaling: false, maxFontSizeMultiplier: 1 as const };
  try {
    const textRef = Text as typeof Text & { defaultProps?: Record<string, unknown> };
    const inputRef = TextInput as typeof TextInput & { defaultProps?: Record<string, unknown> };
    textRef.defaultProps = { ...(textRef.defaultProps ?? {}), ...opts };
    inputRef.defaultProps = { ...(inputRef.defaultProps ?? {}), ...opts };
  } catch {
    /* React 19+ defaultProps desteklenmeyebilir */
  }
}
