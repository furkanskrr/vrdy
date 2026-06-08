import { Platform } from "react-native";
import { useWebKeyboardOverlap } from "./useWebKeyboardOverlap";

/** Yalnızca web/PWA: klavye açıkken composer alt boşluğu (px) */
export function useComposerKeyboardInset(): number {
  const webOverlap = useWebKeyboardOverlap();
  if (Platform.OS !== "web") return 0;
  return webOverlap;
}
