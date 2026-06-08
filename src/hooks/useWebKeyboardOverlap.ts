import { useEffect, useState } from "react";
import { Platform } from "react-native";

/** Klavye açıkken ekranın altına eklenecek padding (px); kapalıyken 0 */
export function useWebKeyboardOverlap(): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const guncelle = () => {
      const gap = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
      const overlap = Math.round(gap);
      setOverlap(overlap > 20 ? overlap : 0);
      if (vv.offsetTop > 0) window.scrollTo(0, 0);
    };

    guncelle();
    vv.addEventListener("resize", guncelle);
    vv.addEventListener("scroll", guncelle);
    return () => {
      vv.removeEventListener("resize", guncelle);
      vv.removeEventListener("scroll", guncelle);
    };
  }, []);

  return overlap;
}
