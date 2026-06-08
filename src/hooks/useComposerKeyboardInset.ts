import { Platform } from "react-native";
import { useWebKeyboardOverlap } from "./useWebKeyboardOverlap";

/** Web/PWA: klavye açıkken composer alt offset (px). Native APK'da KeyboardAvoidingView kullanılır. */
export function useComposerKeyboardInset(): number {
  const webOverlap = useWebKeyboardOverlap();
  if (Platform.OS !== "web") return 0;
  return webOverlap;
}
