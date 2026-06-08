import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";
import { useWebKeyboardOverlap } from "./useWebKeyboardOverlap";

/** Sohbet composer'ını klavyenin üstünde tutmak için alt boşluk (px) */
export function useComposerKeyboardInset(): number {
  const webOverlap = useWebKeyboardOverlap();
  const [nativeInset, setNativeInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      setNativeInset(Math.max(0, Math.round(e.endCoordinates?.height ?? 0)));
    };
    const onHide = () => setNativeInset(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (Platform.OS === "web") return webOverlap;
  return nativeInset;
}
