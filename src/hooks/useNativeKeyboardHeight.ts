import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Native Android: resize/KAV yetmezse composer için klavye yüksekliği */
export function useNativeKeyboardHeight(): number {
  const [yukseklik, setYukseklik] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const ac = Keyboard.addListener("keyboardDidShow", (e) => {
      setYukseklik(Math.round(e.endCoordinates.height));
    });
    const kapa = Keyboard.addListener("keyboardDidHide", () => setYukseklik(0));
    return () => {
      ac.remove();
      kapa.remove();
    };
  }, []);

  return yukseklik;
}
