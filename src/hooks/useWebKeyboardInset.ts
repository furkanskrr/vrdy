import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Mobil web/PWA: sanal klavye açıkken composer’ı klavyenin üstüne taşımak için
 * visualViewport ile örtüşme yüksekliği (px).
 */
export function useWebKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const guncelle = () => {
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(Math.round(gap));
      if (vv.offsetTop > 0) {
        window.scrollTo(0, 0);
      }
    };

    guncelle();
    vv.addEventListener("resize", guncelle);
    vv.addEventListener("scroll", guncelle);
    window.addEventListener("resize", guncelle);
    return () => {
      vv.removeEventListener("resize", guncelle);
      vv.removeEventListener("scroll", guncelle);
      window.removeEventListener("resize", guncelle);
    };
  }, []);

  return inset;
}
